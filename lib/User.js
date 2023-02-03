import { PermissionsBitField } from 'discord.js';

class User {
  constructor({ member, user, guild }) {
    /**
     * @param member {import('discord.js').GuildMember | undefined} the guild member
     * @param user {import('discord.js').User | undefined} the user
     * @param guild {import('discord.js').Guild | undefined} the guild
     */
    this.initialized = false;

    if (user && guild) {
      this.member = guild.members.cache.get(user.id);
    } else if (member) {
      this.member = member;
    }

    if (!this.member) {
      this.member = null;
      this.user = user;
      this.userId = user.id;
      this.originalNickname = '';
      this.currentNickname = '';
      this.initialized = true;
    }

    if (this.member) {
      this.user = this.member.user;
      this.userId = this.member.user.id;
      this.originalNickname = this.member.nickname;
      this.currentNickname = this.member.nickname;
      this.initialized = true;
    }

    this.isBot = this.user.bot || false;

    if (!this.initialized) {
      throw new Error('[Discord Bot] User class must be initialized with a member only or both a user and a guild');
    }
  }

  get guild() {
    /**
     * @returns {import('discord.js').Guild}
     */
    return this.member.guild;
  }

  get voice() {
    /**
     * @returns {import('@discordjs/voice').VoiceState}
     */
    return this.member.voice;
  }

  get roles() {
    /**
     * @returns {import('discord.js').Role[]}
     */
    if (!this.member) {
      return [];
    }

    return this.member.roles.cache;
  }

  get isAdminOfGuild() {
    /**
     * @returns {boolean}
     */
    return this.guild.ownerId === this.userId || this.member.permissions.has(PermissionsBitField.Flags.Administrator);
  }

  hasRole(roleNameOrId) {
    /**
     * @param roleNameOrId {string} the role name or id to check
     * @returns {boolean}
     */
    return this.roles.some(r => r.name === roleNameOrId || r.id === roleNameOrId);
  }

  hasOneOfRoles(roleNamesOrIds) {
    /**
     * @param roleNamesOrIds {string[]} the role names or ids to check
     * @returns {boolean}
     */
    return roleNamesOrIds.some(r => this.hasRole(r));
  }

  async addRole(roleNameOrId) {
    /**
     * @param roleNameOrId {string} the role name or id to add
     * @returns {Promise<void>}
     */
    const role = this.guild.roles.cache.find(r => r.name === roleNameOrId || r.id === roleNameOrId);
    await this.member.roles.add(role);
  }

  async removeRole(roleNameOrId) {
    /**
     * @param roleNameOrId {string} the role name or id to remove
     * @returns {Promise<void>}
     */
    const role = this.guild.roles.cache.find(r => r.name === roleNameOrId || r.id === roleNameOrId);
    await this.member.roles.remove(role.id);
  }

  async setNickname(nickname, reason = '') {
    /**
     * @param nickname {string} the nickname to set
     * @param reason {string} the reason for the nickname change
     * @returns {Promise<void>}
     */
    this.currentNickname = nickname;
    await this.member.setNickname(nickname, reason);
  }

  async resetNickname(originalNickname = this.originalNickname) {
    /**
     * @param originalNickname {string} the original nickname to reset to
     * @returns {Promise<void>}
     */
    console.log('resetNickname', originalNickname);
    await this.setNickname(originalNickname, 'Nickname reset');
  }

  async send(message) {
    /**
     * @param message {string} the message to send
     * @returns {Promise<Message>}
     */
    await this.user.send(message);
  }

  toString() {
    /**
     * @returns {string}
     */
    return JSON.stringify(this);
  }

  fromObject(obj, bot) {
    /**
     * @param obj {object} the object to parse
     * @param bot {DiscordBot} the bot instance
     * @type {Guild}
     */
    const guild = bot.guilds.cache.get(obj.guild.id);
    return new User({ ...obj, guild });
  }

  parse(string, bot) {
    /**
     * @param string {string} the string to parse
     * @param bot {DiscordBot} the bot instance
     * @returns {User}
     */
    const obj = JSON.parse(string);
    return this.fromObject(obj, bot);
  }
}

export default User;
