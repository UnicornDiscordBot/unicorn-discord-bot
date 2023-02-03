import { joinVoiceChannel } from '@discordjs/voice';
import User from './User.js';

class UnifiedInteraction {
  constructor(originalObject, bot) {
    /**
     * @param originalObject {any} the original object
     * @param bot {DiscordBot} the bot
     */
    const { content, locale, guildLocale, member, user, guild, author } = originalObject;

    this.bot = bot;
    this.content = content || '';
    this.locale = locale || guildLocale || 'default';
    this.author = new User({ member, user: user || author, guild });
    this.guild = guild;
    this.isDM = guild === null;
    this.channel = originalObject.channel;
    this.commandName = originalObject.commandName || undefined;
    this.isSlashCommand = Boolean(originalObject.commandName) || false;
    this.replied = false;
    this.originalObject = originalObject;
    this.commandOptions = {};
  }

  get isButton() {
    /**
     * @return {boolean}
     */
    return !!(this.originalObject.customId
      && typeof this.originalObject.isButton === 'function'
      && this.originalObject.isButton());
  }

  get buttonId() {
    /**
     * @return {string | null}
     */
    return this.isButton ? this.originalObject.customId : null;
  }

  get isSelectMenu() {
    /**
     * @return {boolean}
     */
    return !!(this.originalObject.customId
      && typeof this.originalObject.isSelectMenu === 'function'
      && this.originalObject.isSelectMenu());
  }

  get selectMenuId() {
    /**
     * @return {string | null}
     */
    return this.isSelectMenu ? this.originalObject.customId : null;
  }

  get selectMenuValues() {
    /**
     * @return {string[]}
     */
    return this.isSelectMenu ? this.originalObject.values : [];
  }

  get selectMenuValue() {
    /**
     * @return {string | null}
     */
    if (this.isSelectMenu && this.selectMenuValues.length > 0) {
      this.bot.warn('using selectMenuValue on a select menu with multiple values for select menu'
      + `"${this.selectMenuId}"`);
    }
    return this.isSelectMenu ? this.originalObject.values[0] : null;
  }

  get isMessageCommand() {
    /**
     * @return {string | undefined}
     */
    if (!this.isSlashCommand && !this.isButton && this.content.startsWith(this.bot.prefix)) {
      const possibleCommand = this.content.slice(this.bot.prefix.length).split(' ')[0];
      if (this.bot.messageCommands.has(possibleCommand)) {
        this.commandName = possibleCommand;
        return true;
      }
    }
    return false;
  }

  get eventName() {
    switch (true) {
      case this.isButton:
        return `button:${this.buttonId}`;
      case this.isSelectMenu:
        return `selectMenu:${this.selectMenuId}`;
      case this.isSlashCommand:
        return `slashCommand:${this.commandName}`;
      case this.isMessageCommand:
        return `messageCommand:${this.commandName}`;
      case this.isToMe || this.isMentioningMe:
        return 'mention';
      case this.isDM:
        return 'directMessage';
      case !this.isToMe && !this.isMentioningMe:
        return 'message';
      default:
        return undefined;
    }
  }

  get isFromBot() {
    /**
     * @return {boolean}
     */
    return Boolean(this.author.isBot) || false;
  }

  get isFromMe() {
    /**
     * @return {boolean}
     */
    return this.author.userId === this.bot.client.user.id;
  }

  get isToMe() {
    /**
     * @return {boolean}
     */
    if (!this.originalObject.mentions) return false;
    return this.originalObject.mentions.users.has(this.bot.client.user.id);
  }

  get isMentioningMe() {
    /**
     * @return {boolean}
     */
    return this.content.toLowerCase().includes(this.bot.client.user.username.toLowerCase());
  }

  injectOptions(options) {
    /**
     * @param options {any}
     * @return {void}
     */
    this.commandOptions = options;
  }

  async defer() {
    /**
     * @return {Promise<void>}
     */
    if (this.originalObject.deferReply) {
      await this.originalObject.deferReply();
    }
    return Promise.resolve();
  }

  async reply({ content, components = [], ephemeral = false }) {
    /**
     * @param content {string} the message content
     * @param components {any[]} an array of embeds
     * @param ephemeral {boolean} if the message should be ephemeral
     * @param edit {boolean} should we edit the message or create a "follow up"
     * @return {Promise<void>}
     * @throws {Error}
     */

    let repliedWith = 'none';

    try {
      await this.originalObject.reply({ content, components, ephemeral });
      repliedWith = 'reply';
    } catch (e) {
      this.bot.warn(`Failed to reply to an interaction because "${e.message}"`);
      this.bot.warn(e);
    }
    if (repliedWith === 'none') {
      try {
        await this.originalObject.editReply({ content, components, ephemeral });
      } catch (e) {
        this.bot.warn(`Failed to editReply to an interaction because "${e.message}"`);
        this.bot.warn(e);
      }
    }
    if (repliedWith === 'none') {
      try {
        await this.originalObject.followUp({ content, components, ephemeral });
      } catch (e) {
        this.bot.warn(`Failed to followUp to an interaction because "${e.message}"`);
        this.bot.warn(e);
      }
    }

    if (repliedWith === 'none') {
      throw new Error('failed to reply to interaction');
    }

    return Promise.resolve();
  }

  async followUp({ content, embeds, ephemeral }) {
    /**
     * @param content {string} the message content
     * @param embeds {any[]}
     * @param ephemeral {boolean}
     * @return {Promise<void>}
     * @throws {Error}
     */
    if (!this.replied) {
      await this.reply({ content, embeds, ephemeral });
    } else {
      try {
        await this.originalObject.followUp({ content, embeds, ephemeral });
      } catch (e) {
        this.bot.debug('🤖 an error occurred while trying to followup:', e.message);
        return Promise.reject(e);
      }
    }
    return Promise.resolve();
  }

  async joinVocalChannel(channelNameOrId) {
    /**
     * @typedef VocChanDef
     * @property {import('discord.js').ChannelManager} chan
     * @property {import('@discordjs/voice').VoiceConnection} vocChan
     */
    /**
     * @param name {string} the name of the channel to join
     * @return {Promise<VocChanDef>}
     */
    if (!this.guild || typeof channelNameOrId !== 'string') {
      return Promise.reject(
        new Error('You must be in a guild and provide a channel name to join a vocal channel'),
      );
    }

    const channels = await this.guild.channels.fetch();
    const chan = channels.find(c => c.name === channelNameOrId || c.id === channelNameOrId);
    if (!chan) {
      return Promise.reject(new Error(`Channel "${channelNameOrId}" not found in guild "${this.guild.name}"`));
    }

    const vocChan = await joinVoiceChannel({
      channelId: chan.id,
      guildId: chan.guild.id,
      adapterCreator: chan.guild.voiceAdapterCreator,
    });

    return { chan, vocChan };
  }

  getRole(roleNameOrId, guild = this.guild) {
    return this.bot.getRole(roleNameOrId, guild);
  }

  getMembersByRole(roleNameOrId, guild = this.guild, asUserObjects = true) {
    /**
     * @param roleNameOrId {string} the role name or id
     * @param asUserObjects {boolean} if we should return user objects or member objects
     * @param guild {import('discord.js').Guild} the guild to search in
     * @return {Promise<import('discord.js').Collection<string, import('discord.js').GuildMember>|import('discord.js').Collection<string, User>>}
     */

    return this.bot.getMembersByRole(roleNameOrId, asUserObjects, guild);
  }

  getChannel(channelNameOrId, guild = this.guild) {
    /**
     * @param channelNameOrId {string} the channel name or id
     * @param guild {import('discord.js').Guild} the guild to search in
     * @returns {Promise<import('discord.js').Channel>}
     */

    return this.bot.getChannel(channelNameOrId, guild);
  }
}

export default UnifiedInteraction;
