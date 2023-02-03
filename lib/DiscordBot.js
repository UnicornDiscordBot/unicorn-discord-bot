import { captureRejectionSymbol, EventEmitter } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ActivityType, Client, GatewayIntentBits, Partials, PermissionsBitField, REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import Keyv from 'keyv';

import ApiServer from './ApiServer.js';
import Command from './Command.js';
import Logger from './Logger.js';
import UnifiedInteraction from './UnifiedInteraction.js';
import User from './User.js';
import importGlob from './utils/importGlob.js';

dotenv.config();
const intents = [];
for (const key in GatewayIntentBits) {
  intents.push(GatewayIntentBits[key]);
}

const persistenStorageTypes = new Set(['memory', 'sqlite', 'redis', 'mongo', 'mysql', 'postgres']);

class DiscordBot extends EventEmitter {
  constructor({
    discordClientOptions = { intents, partials: [Partials.Channel] },
    commandsDirPath = process.env.COMMANDS_DIR_PATH,
    autoDiscoverCommands = String(process.env.AUTO_DISCOVER_COMMANDS) === 'true'
      || String(process.env.AUTO_DISCOVER_COMMANDS) === 'on',
    env = process.env,
    isDevMode = String(process.env.DEV_MODE).toLowerCase() === 'true'
      || String(process.env.DEV_MODE).toLowerCase() === 'on',
    prefix = process.env.PREFIX,
    useInternalLogger = process.env.USE_INTERNAL_LOGGER || true,
    noPersistentStorage = process.env.NO_PERSISTENT_STORAGE || false,
    persistentStorageType = process.env.PERSISTENT_STORAGE_TYPE,
    persistentStorageConnectionString = process.env.PERSISTENT_STORAGE_CONNECTION_STRING,
    errorContent = process.env.ERROR_CONTENT,
    helloMessage = process.env.HELLO_MESSAGE,
    serviceMessagesChannelId = process.env.SERVICE_MESSAGES_CHANNEL_ID,
    presenceInfos = null,
  }) {
    /**
     * @type DiscordBot
     * @param discordClientOptions {Object} Options to pass to the Discord.js client
     * @param commandsDirPath {String} Path to the directory containing the commands
     * @param env {Object} Environment variables
     * @param isDevMode {Boolean} If true, the bot is in dev mode (attached to only one guild)
     * @param prefix {String} Prefix to use for the commands
     * @param useInternalLogger {Boolean} If true, the bot will use its own logger
     * @param noPersistentStorage {Boolean} If true, the bot will not use persistent storage
     * @param persistentStorageType {String} Type of persistent storage to use
     * @param persistentStorageConnectionString {String} Connection string to use for the persistent storage
     * @param errorContent {String} Content to send when an error occurs
     * @param helloMessage {String} Message to send when the bot is ready
     * @param serviceMessagesChannelId {String} ID of the channel to send the service messages to
     * @param presenceInfos {Object} Presence infos to set when the bot is ready
     * @returns {DiscordBot}
     */
    super({ captureRejections: true });

    this.discordClientOptions = discordClientOptions;
    this.commandsDirPath = commandsDirPath;
    this.autoDiscoverCommands = autoDiscoverCommands || true;
    this.env = env;
    this.isDevMode = isDevMode || true;
    this.prefix = prefix || '!';

    this.commands = [];
    this.slashCommands = new Set([]);
    this.messageCommands = new Set([]);
    this.buttonsHandheld = new Set([]);
    this.selectMenusHandheld = new Set([]);
    this.mentionHandlers = new Set([]);
    this.messageHandlers = new Set([]);
    this.dmHandlers = new Set([]);
    this.apiRoutes = new Set([]);

    this.errorContent = errorContent || 'Oh no...';

    this.helloMessage = helloMessage || 'I\'m back!';

    this.serviceMessagesChannelId = serviceMessagesChannelId || null;

    this.presenceInfos = presenceInfos;

    this.useInternalLogger = useInternalLogger;
    this.persistentStorageType = persistentStorageType;
    this.persistentStorageConnectionString = persistentStorageConnectionString;

    this.noPersistentStorage = noPersistentStorage;

    this.client = new Client(discordClientOptions);
    this.apiServer = null;

    if (this.useInternalLogger) {
      this.logger = new Logger(this);
    }
  }

  get guilds() {
    return this.client.guilds.cache;
  }

  async _setupPersistentStorage() {
    /**
     * @private
     * @returns {void}
     */
    if (!this.noPersistentStorage) {
      const storageDir = '/var/tmp/DiscordBot';
      await mkdir(storageDir, { recursive: true });
      const defaultSqlitePath = join(storageDir, 'persistentStorage.sqlite');
      this.persistentStorageType = this.persistentStorageType || 'sqlite';
      if (!persistenStorageTypes.has(this.persistentStorageType)) {
        throw new Error(`Unknown persistent storage type: ${this.persistentStorageType}.`
          + `Should be one of ${Array.from(persistenStorageTypes)
            .join(', ')}`);
      }
      this.persistentStorageConnectionString = this.persistentStorageConnectionString || null;
      if (this.persistentStorageConnectionString === null && this.persistentStorageType === 'sqlite') {
        this.persistentStorageConnectionString = `sqlite://${defaultSqlitePath}`;
        this.warn(`No persistent storage connection string provided. Using default: ${defaultSqlitePath}`);
      }

      this.persistentStorage = new Keyv(this.persistentStorageConnectionString);
      this.info('Persistent storage enabled');
      this.info(`Persistent storage type: ${this.persistentStorageType}`);
      this.info(`Persistent storage data connection string: ${this.persistentStorageConnectionString}`);
    } else {
      this.persistentStorage = null;
      this.info('Persistent storage disabled');
    }
  }

  log(level, ...args) {
    /**
     * @param level {String} Type of log
     * @param args {Array}
     * @returns {void}
     * @emits log
     */
    this.emit('log', { level, message: args.flat() });
  }

  info(...args) {
    this.log('info', args);
  }

  warn(...args) {
    this.log('warn', args);
  }

  error(...args) {
    this.log('error', args);
  }

  debug(...args) {
    this.log('debug', args);
  }

  [captureRejectionSymbol](err, event, ...args) {
    /**
     * Capture rejections from async listeners
     * @private
     * @param err {Error}
     * @param event {String}
     * @param args {Array}
     */
    this.error('rejection happened for', event, 'with', err, args);
  }

  async start() {
    /**
     * @returns {Promise<void>}
     */
    this.info('Bot is starting...');
    this.info('Prefix is', this.prefix);
    this.info('Dev mode is', this.isDevMode ? 'on' : 'off');

    await this._setupPersistentStorage();

    await this._discoverCommands();
    this._listCommands();
    await this._registerCommands();
    this._registerListeners();
    await this.login();
    if (this.apiRoutes.size > 0) {
      this.apiServer = new ApiServer({ bot: this, routes: this.apiRoutes });
      await this.apiServer.start();
    }
  }

  async login() {
    /**
     * @returns {Promise<string>}
     */
    try {
      await this.client.login(this.env.BOT_TOKEN);
      if (this.presenceInfos) {
        await this.client.user.setPresence({
          activities: [{
            name: 'Pong!',
            type: ActivityType.Playing,
            ...this.presenceInfos,
          }],
          status: 'online',
          afk: false,
        });
      }
    } catch (e) {
      this.error(e);
    }
  }

  addCommand(commandDefinition) {
    /**
     * @param commandDefinition {Command} Command to add
     * @returns {void}
     */
    this.commands.push(new Command({ ...commandDefinition, bot: this }));
  }

  addCommands(commandsDefinitions) {
    /**
     * @param commandsDefinitions {Array<Command>} Commands to add
     * @returns {void}
     */
    commandsDefinitions.forEach(commandDefinition => {
      this.addCommand(commandDefinition);
    });
  }

  async _discoverCommands() {
    /**
     * @private
     * @returns {Promise<void>}
     */
    if (!this.autoDiscoverCommands) {
      this.info('Auto-discover commands is disabled');
      return;
    }

    try {
      this.info('Auto-discovering commands from', this.commandsDirPath, '...');
      const found = await importGlob(this.commandsDirPath, this);
      this.info('Discovered', Object.keys(found).length, 'commands');
      this.addCommands(found);
    } catch (e) {
      this.error(`Error while discovering commands: ${e.message}`);
      throw e;
    }
  }

  async _registerCommands() {
    /**
     * @private
     * @throws
     * @returns {Promise<void>}
     */
    const rest = new REST().setToken(this.env.BOT_TOKEN);
    const route = this.isDevMode ?
      Routes.applicationGuildCommands(this.env.CLIENT_ID, this.env.GUILD_ID)
      : Routes.applicationCommands(this.env.CLIENT_ID);
    const body = this.commands.filter(c => c.isSlashCommand).map(c => c.def);
    if (body.length === 0) {
      this.info('No slash commands to register');
      return;
    }
    try {
      await rest.put(
        route,
        { body },
      );
      this.info('Slash Commands registered to Discord!');
      if (!this.isDevMode) {
        this.warn('!!! You may have to wait about 20 to 30 minutes for those commands to be available to everyone');
      }
    } catch (e) {
      throw new Error(`Error during commands registration: ${e.message}`);
    }
  }

  _listCommands() {
    /**
     * @private
     * @returns {void}
     */
    if (this.commands.length === 0) {
      this.info('This bot has no commands');
      return;
    }

    this.commands.forEach(command => {
      if (command.isSlashCommand) {
        this.slashCommands.add(command.name);
      }
      if (command.isMessageCommand) {
        this.messageCommands.add(command.name);
      }
      if (command.mentionHandler) {
        this.mentionHandlers.add(command.name);
      }
      if (command.messageHandler) {
        this.messageHandlers.add(command.name);
      }
      if (command.dmHandler) {
        this.dmHandlers.add(command.name);
      }
      if (command.buttonsHandheld.length > 0) {
        this.buttonsHandheld = new Set([...this.buttonsHandheld, ...command.buttonsHandheld]);
      }
      if (command.selectMenusHandheld.length > 0) {
        this.selectMenusHandheld = new Set([...this.selectMenusHandheld, ...command.selectMenusHandheld]);
      }
      if (command.apiRoutes.length > 0) {
        this.apiRoutes = new Set([...this.apiRoutes, ...command.apiRoutes]);
      }
    });

    this.info('Slash Commands:',
      this.slashCommands.size > 0 ? Array.from(this.slashCommands).join(', ') : 'none');
    this.info('Message Commands:',
      this.messageCommands.size > 0 ? Array.from(this.messageCommands).join(', ') : 'none');
    this.info('Handheld Buttons:',
      this.buttonsHandheld.size > 0 ? Array.from(this.buttonsHandheld).join(', ') : 'none');
    this.info('Handheld Select Menus:',
      this.selectMenusHandheld.size > 0 ? Array.from(this.selectMenusHandheld).join(', ') : 'none');
    this.info('Mentions Handlers:',
      this.mentionHandlers.size > 0 ? Array.from(this.mentionHandlers).join(', ') : 'none');
    this.info('Message Handlers:',
      this.messageHandlers.size > 0 ? Array.from(this.messageHandlers).join(', ') : 'none');
    this.info('DM Handlers:',
      this.dmHandlers.size > 0 ? Array.from(this.dmHandlers).join(', ') : 'none');
  }

  _registerListeners() {
    /**
     * @private
     * @returns {void}
     */
    this.client.once('ready', async () => {
      this.info(`Logged in as ${this.client.user.tag}! with id: ${this.client.user.id}`);

      const guilds = await this.client.guilds.fetch();
      let readyGuilds = 0;
      guilds.each(async _guild => {
        const guild = await _guild.fetch();
        this.info(`Attached on Guild: "${guild.name}" (id: ${guild.id})`);
        const channels = await guild.channels.fetch();
        if (this.serviceMessagesChannelId) {
          const serviceChan = channels.find(c => c.id === this.serviceMessagesChannelId);
          if (serviceChan) {
            await serviceChan.send(this.helloMessage);
          } else {
            this.warn(`Service messages channel id "${this.serviceMessagesChannelId} `
            + `not found in guild "${guild.name}" (id: ${guild.id})`);
          }
        }
        readyGuilds++;
        if (readyGuilds === guilds.size) {
          this.info('Bot is ready');
        }
      });
    });

    const interactionEvents = ['interactionCreate', 'messageCreate'];
    interactionEvents.forEach(event => {
      this.client.on(event, this._mainListener.bind(this));
    });

    this.client.on('error', error => {
      this.error('A client error occurred:', error.message);
      console.error(error);
    });

    this.client.on('warn', warn => {
      this.warn('Client warning:', warn);
    });

    this.client.on('invalidated', () => {
      this.warn('Client invalidated');
      this.warn('Info reconnecting in a few seconds...');
      this.client.destroy();
      setTimeout(async () => {
        this.client = new Client(this.discordClientOptions);
        await this.start();
      }, 5000);
    });

    this.client.on('guildCreate', async guild => {
      this.info(`Attached on Guild: "${guild.name}" (id: ${guild.id})`);
      await this.guilds.fetch();
    });
  }

  async _mainListener(interaction) {
    /**
     * The listener that handles all interactions or messages events
     * @private
     * @param {any} interaction
     */
    try {
      await this._handleInteraction(interaction);
    } catch (e) {
      this.error(e);
      await interaction.reply({ content: this.errorContent });
    }
  }

  async _handleInteraction(interaction) {
    /**
     * @private
     * @param interaction {any} Interaction to handle
     * @returns {Promise<void>}
     */

    let interactionObject;
    if (interaction.partial) {
      const fullInteraction = await interaction.fetch();
      interactionObject = new UnifiedInteraction(fullInteraction, this);
    } else {
      interactionObject = new UnifiedInteraction(interaction, this);
    }

    if (interactionObject.isFromBot) {
      if (interactionObject.isFromMe) return;
      this.info('Ignoring interaction from a bot', interactionObject.author.userId);
      return;
    }

    const { eventName } = interactionObject;

    if (eventName) {
      this.info('Interaction received:', eventName);
      this.emit(`external:${eventName.split(':')[0]}`, interactionObject);
      this.emit(eventName, interactionObject);
      return;
    }

    this.info('Ignoring interaction');
  }

  async getRole(roleNameOrId, guild) {
    /**
     * @param roleNameOrId {string} the role name or id
     * @param guild {import('discord.js').Guild} the guild to search in
     * @return {Promise<import('discord.js').Role>}
     */
    const roles = await guild.roles.fetch();
    const map = roles.filter(r => r.name === roleNameOrId || r.id === roleNameOrId);
    const [role] = map.values();
    return role;
  }

  async getUser(userId, guild) {
    /**
     * @param userId {string} the user id
     * @param guild {import('discord.js').Guild} the guild to search in
     */
    const _members = await guild.members.fetch();
    const members = _members.filter(m => m.id === userId);
    const [member] = members.values();
    return new User({ member, guild });
  }

  async getMembersByRole(roleNameOrId, guild, asUserObjects = true) {
    /**
     * @param roleNameOrId {string} the role name or id
     * @param asUserObjects {boolean} if we should return user objects or member objects
     * @param guild {import('discord.js').Guild} the guild to search in
     * @return {Promise<import('discord.js').Collection<string, import('discord.js').GuildMember>|import('discord.js').Collection<string, User>>}
     */
    const role = await this.getRole(roleNameOrId, guild);
    const _members = await guild.members.fetch();
    const members = _members.filter(m => m.roles.cache.has(role.id));
    if (asUserObjects) {
      return members.map(member => new User({ member, guild }));
    }
    return members;
  }

  async getChannel(channelNameOrId, guild) {
    /**
     * @param channelNameOrId {string} the channel name or id
     * @param guild {import('discord.js').Guild} the guild to search in
     * @returns {Promise<import('discord.js').Channel>}
     */
    const channels = await guild.channels.fetch();
    return channels.find(c => c.name === channelNameOrId || c.id === channelNameOrId);
  }

  getGuild(guildId) {
    return this.guilds.get(guildId);
  }

  getGMFlags() {
    /**
     * @returns {string[]} GM flags
     */
    return [
      PermissionsBitField.Flags.CreateInstantInvite,
      PermissionsBitField.Flags.KickMembers,
      PermissionsBitField.Flags.BanMembers,
      PermissionsBitField.Flags.ManageChannels,
      PermissionsBitField.Flags.AddReactions,
      PermissionsBitField.Flags.PrioritySpeaker,
      PermissionsBitField.Flags.Stream,
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.SendTTSMessages,
      PermissionsBitField.Flags.ManageMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.MentionEveryone,
      PermissionsBitField.Flags.UseExternalEmojis,
      PermissionsBitField.Flags.MuteMembers,
      PermissionsBitField.Flags.DeafenMembers,
      PermissionsBitField.Flags.MoveMembers,
      PermissionsBitField.Flags.UseVAD,
      PermissionsBitField.Flags.ChangeNickname,
      PermissionsBitField.Flags.ManageNicknames,
    ];
  }

  async getGuildAdmins(guild) {
    /**
     * @param guild {import('discord.js').Guild}
     * @returns {Promise<import('discord.js').Collection<string, import('discord.js').GuildMember>>}
     */
    const _members = await guild.members.fetch();
    return _members.filter(member => {
      const user = new User({ member });
      return user.isAdminOfGuild && !user.isBot;
    });
  }
}

export default DiscordBot;
