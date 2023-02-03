import { SlashCommandBuilder } from 'discord.js';
import User from './User.js';

/**
 * @typedef Choice
 * @property {string} name
 * @property {string | number} value
 */

/**
 * @typedef {Object.<string,string>[]} Localization
 */

/**
 * @typedef Option
 * @property {string} name
 * @property {Localization} nameLocalized
 * @property {string} description
 * @property {Localization} descriptionLocalized
 * @property {string} type
 * @property {boolean} required
 * @property {choices[]} options
 * @property {any} value
 */

/**
 * @typedef {Object} ApiHandler
 * @property {string} method
 * @property {string} slug
 * @property {function} handler
 */

/**
 * @typedef CommandDefinition
 * @property {string} name
 * @property {string} description
 * @property {function | undefined} commandHandler
 * @property {function | undefined} buttonsHandler
 * @property {function | undefined} selectMenusHandler
 * @property {string[] | undefined} mentionsHandheld
 * @property {string[] | undefined} messagesHandheld
 * @property {string[] | undefined} dmHandheld
 * @property {boolean | undefined} isSlashCommand
 * @property {boolean | undefined} isMessageCommand
 * @property {boolean | undefined} acceptDM
 * @property {string[] | undefined} requiredRoles
 * @property {boolean | undefined} requireAllRoles
 * @property {string | undefined} requiredRolesErrorMessage
 * @property {any[] | undefined} options
 * @property {string[] | undefined} buttonsHandheld
 * @property {string[] | undefined} selectMenusHandheld
 * @property {number[] | undefined} requiredPermissions
 * @property {import(Fastify).RouteOptions[] | undefined} apiHandlers
 * @property {DiscordBot} bot
 */

class Command {
  constructor({
    name,
    description,
    commandHandler,
    buttonsHandler,
    selectMenusHandler,
    mentionHandler,
    messageHandler,
    dmHandler,
    isSlashCommand = true,
    isMessageCommand = true,
    acceptDM = false,
    requiredRoles = [],
    requireAllRoles = false,
    requiredRolesErrorMessage = 'You do not have the required roles to use this command.',
    options = [],
    buttonsHandheld = [],
    selectMenusHandheld = [],
    requiredPermissions = [],
    apiRoutes = [],
    bot,
  }) {
    /**
     * @type {Command}
     * @param {CommandDefinition}
     */
    this.bot = bot;
    this.name = name.toLowerCase();
    this.description = description;
    this.commandHandler = commandHandler;
    this.buttonsHandler = buttonsHandler;
    this.selectMenusHandler = selectMenusHandler;
    this.mentionHandler = mentionHandler;
    this.messageHandler = messageHandler;
    this.dmHandler = dmHandler;
    this.isSlashCommand = isSlashCommand;
    this.isMessageCommand = isMessageCommand;
    this.acceptDM = acceptDM;
    this.requiredRoles = requiredRoles;
    this.requireAllRoles = requireAllRoles;
    this.requiredRolesErrorMessage = requiredRolesErrorMessage;
    this.options = options;
    this.buttonsHandheld = buttonsHandheld;
    this.selectMenusHandheld = selectMenusHandheld;
    this.requiredPermissions = requiredPermissions.reduce((acc, permission) => acc | permission, 0);
    this.apiRoutes = apiRoutes;

    this._check();

    this._def = new SlashCommandBuilder();
    this._def.setName(this.name)
      .setDescription(this.description)
      .setDMPermission(this.acceptDM)
      .setDefaultMemberPermissions(this.requiredPermissions);

    this._addOptions();

    this._setApiRoot();

    this._listen();
  }

  get def() {
    /**
     * @type {SlashCommandBuilder}
     */
    return this._def.toJSON();
  }

  _setApiRoot() {
    /**
     * Inject this command's name as a root for all the api routes defined in the command definition
     * @private
     */

    if (this.apiRoutes.length > 0) {
      this.apiRoutes = this.apiRoutes.map(route => {
        route.path = `/${this.name}${route.path}`;
        return route;
      });
    }
  }

  _check() {
    /**
     * @private
     * @throws
     */
    if (!this.name) {
      throw new Error(`A command must have a name...`);
    }
    if (!this.description) {
      throw new Error(`Command ${this.name} must have a description`);
    }

    if (this.buttonsHandheld
      && (
        !Array.isArray(this.buttonsHandheld)
        || this.buttonsHandheld.filter(button => typeof button !== 'string').length > 0
      )
    ) {
      this.bot.warn('You must provide an array of buttons names to handle '
        + `(got ${typeof this.buttonsHandheld} instead) in ${this.name}`);
      this.buttonsHandheld = [];
    }

    if (this.buttonsHandheld.length > 0 && typeof this.buttonsHandler !== 'function') {
      this.bot.warn('You must provide a buttonsHandler '
        + `function if you want to handle buttons in command ${this.name}`);
      this.buttonsHandheld = [];
    }

    if (this.buttonsHandheld.length === 0 && typeof this.buttonsHandler === 'function') {
      this.bot.warn(`You have to declare which buttons the command "${this.name}" handles`);
    }

    if (this.selectMenusHandheld.length > 0 && typeof this.selectMenusHandler !== 'function') {
      this.bot.warn('You must provide a selectMenusHandler '
        + `function if you want to handle select menus in command ${this.name}`);
      this.selectMenusHandheld = [];
    }

    if (this.buttonsHandheld.length === 0 && typeof this.buttonsHandler === 'function') {
      this.bot.warn(`You have to declare which buttons the command "${this.name}" handles`);
    }

    if ((this.isSlashCommand || this.isMessageCommand) && typeof this.commandHandler !== 'function') {
      this.bot.warn(`The "${this.name}" command must have a commandHandler function`);
    }

    if (this.mentionHandler && typeof this.mentionHandler !== 'function') {
      this.bot.warn(`In "${this.name}" mentionHandler must be a function`);
      this.mentionHandler = undefined;
    }

    if (this.messageHandler && typeof this.messageHandler !== 'function') {
      this.bot.warn(`In "${this.name}" messageHandler must be a function`);
      this.messageHandler = undefined;
    }

    if (this.dmHandler && typeof this.dmHandler !== 'function') {
      this.bot.warn(`In "${this.name}" dmHandler must be a function`);
      this.dmHandler = undefined;
    }
  }

  _addOptions() {
    /**
     * @private
     * @throws
     */
    this.options.forEach(opt => {
      if (!this.isSlashCommand) {
        return;
      }

      if (!opt.name) {
        throw new Error(`Option ${opt} must have a name in command ${this.name}`);
      }
      if (!opt.description) {
        throw new Error(`Option ${opt} must have a description in command ${this.name}`);
      }

      const builder = option => option
        .setName(opt.name)
        .setDescription(opt.description)
        .setRequired(opt.required || false);

      if (opt.nameLocalized) {
        builder.setNameLocalizations(opt.nameLocalized);
      }

      if (opt.descriptionLocalized) {
        builder.setDescriptionLocalizations(opt.descriptionLocalized);
      }

      if (opt.choices) {
        builder.addChoices(opt.choices);
      }

      switch (String(opt.type).toLowerCase()) {
        case 'attachment':
          this._def.addAttachmentOption(builder);
          break;
        case 'boolean':
          this._def.addBooleanOption(builder);
          break;
        case 'channel':
          this._def.addChannelOption(builder);
          break;
        case 'integer':
          this._def.addIntegerOption(builder);
          break;
        case 'number':
        case 'decimal':
          this._def.addNumberOption(builder);
          break;
        case 'mentionable':
          this._def.addMentionableOption(builder);
          break;
        case 'string':
          this._def.addStringOption(builder);
          break;
        case 'member':
        case 'user':
          this._def.addUserOption(builder);
          break;
        case 'role':
          this._def.addRoleOption(builder);
          break;
        default:
          throw new Error(`Unknown option type while declaring command ${this.name}`);
      }
    });
  }

  _injectOptions(interaction) {
    /**
     * @private
     * @param {UnifiedInteraction} interaction
     * @returns {Object.<string,Option>}
     */

     const values = {};

     this.options.forEach(opt => {
       switch (String(opt.type).toLowerCase()) {
         case 'attachment':
           values[opt.name] = interaction.originalObject.options.getAttachment(opt.name);
           break;
         case 'boolean':
           values[opt.name] = Boolean(interaction.originalObject.options.getBoolean(opt.name));
           break;
         case 'channel':
           values[opt.name] = interaction.originalObject.options.getChannel(opt.name);
           break;
         case 'integer':
           values[opt.name] = parseInt(interaction.originalObject.options.getInteger(opt.name));
           break;
         case 'number':
         case 'decimal':
           values[opt.name] = parseFloat(interaction.originalObject.options.getNumber(opt.name));
           break;
         case 'mentionable':
           values[opt.name] = interaction.originalObject.options.getMentionable(opt.name);
           break;
         case 'string':
           values[opt.name] = String(interaction.originalObject.options.getString(opt.name));
           break;
         case 'member':
           values[opt.name] = new User({
               member: interaction.originalObject.options.getMember(opt.name),
               guild: interaction.originalObject.guild },
             );
             break;
         case 'user':
           values[opt.name] = new User({
               user: interaction.originalObject.options.getUser(opt.name),
               guild: interaction.originalObject.guild },
             );
             break;
         case 'role':
           values[opt.name] = interaction.originalObject.options.getRole(opt.name);
           break;
         default:
           // Do nothing
       }
     });

     interaction.injectOptions(values);
  }

  _listen() {
    /**
     * @private
     */

    let listening = false;

    if (this.buttonsHandheld.length > 0) {
      this.buttonsHandheld.forEach(buttonId => {
        this.bot.on(`button:${buttonId}`,
          interaction => this._listenerWrapper(
            'Button handler', interaction, this.buttonsHandler, `via button: "${buttonId}"`,
          ));
      });
    }

    if (this.selectMenusHandheld.length > 0) {
      this.selectMenusHandheld.forEach(selectMenuId => {
        this.bot.on(`selectMenu:${selectMenuId}`,
          interaction => this._listenerWrapper(
            'Select menu handler', interaction, this.selectMenusHandler, `via menu: "${selectMenuId}"`,
          ));
      });
    }

    if (this.isSlashCommand) {
      listening = true;
      this.bot.on(`slashCommand:${this.name}`,
        interaction => {
          const comment = `${interaction.isDM ?
            'in DM' : `in channel ${interaction.guild.name}/${interaction.channel.name}`}`;
          this._injectOptions(interaction);
          return this._listenerWrapper('Slash Command', interaction, this.commandHandler, comment);
        });
    }

    if (this.isMessageCommand) {
      listening = true;
      this.bot.on(`messageCommand:${this.name}`,
        interaction => {
          const comment = `${interaction.isDM ?
            'in DM' : `in channel ${interaction.guild.name}/${interaction.channel.name}`}`;
          return this._listenerWrapper(
            'Message Command', interaction, this.commandHandler, comment,
          );
        });
    }

    if (typeof this.messageHandler === 'function') {
      listening = true;
      this.bot.on('message', interaction => this._listenerWrapper(
        'Message Handler', interaction, this.messageHandler, 'via message',
      ));
    }

    if (typeof this.mentionHandler === 'function') {
      listening = true;
      this.bot.on('mention', interaction => this._listenerWrapper(
        'Mention Handler', interaction, this.mentionHandler, 'via message',
      ));
    }

    if (typeof this.dmHandler === 'function') {
      listening = true;
      this.bot.on('directMessage', interaction => this._listenerWrapper(
        'DM Handler', interaction, this.dmHandler, '',
      ));
    }

    if (this.apiRoutes.length > 0 && !listening) {
      this.bot.info(`Command "${this.name}" has API routes.`);
      return;
    }

    if (!listening) {
      this.bot.warn(`Command ${this.name} is not handling anything!`);
    }
  }

  _listenerWrapper(eventType, interaction, handler, comment) {
  /**
   * @private
   * @param eventType {string} Event name
   * @param interaction {UnifiedInteraction} the interaction
   * @param handler {Function} the command handler
   * @param comment {String} comment to add to the log
   * @returns {Promise<void>}
   */
    this.bot.info(`${eventType} "${this.name}" triggered by <@${interaction.author.userId}> `
      + `${comment} (id: ${interaction.originalObject.id})`);
    if (!this._checkRequiredRoles(interaction)) {
      return interaction.reply({
        content: this.requiredRolesErrorMessage,
        ephemeral: true,
      });
    }
    try {
      return handler(interaction);
    } catch (e) {
      this.bot.error('Error while executing command', this.name, e.message);
      this.bot.error('Interaction Object:', interaction);
      this.bot.error(e);
      return interaction.reply({
        content: 'An error occurred while executing the command',
        ephemeral: true,
      });
    }
  }

  _checkRequiredRoles(interaction) {
    /**
     * @private
     * @param interaction {UnifiedInteraction} the interaction
     * @returns {Boolean} true if the user has the required roles, false otherwise
     */
    if (this.requiredRoles.length > 0) {
      const rolesFound = [];
      this.requiredRoles.forEach(role => {
        if (interaction.author.hasRole(role)) {
          rolesFound.push(role);
        }
      });
      if (this.requireAllRoles) {
        return rolesFound.length === this.requiredRoles.length;
      }
      return rolesFound.length > 0;
    }
    return true;
  }
}

export default Command;
