import { createReadStream } from 'node:fs';
import { basename, join } from 'node:path';
import {
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  createAudioResource,
} from '@discordjs/voice';
import { ButtonStyle } from 'discord.js';
import { globby } from 'globby';
import { buildButtonsMenu, buildSelectMenu } from './utils/menusBuilders.js';

class SoundManager {
  constructor({
    channelName,
    interaction,
    soundFilesDir,
    defaultVolume = 0.15,
    defaultVolumes = {},
    buttonPrefix = 'playsound',
    selectMenuName = 'playsound',
  }) {
    /**
     * Sounds Manager allowing to play sounds in a voice channel.
     * @param channelName {string} - The name of the voice channel to manage
     * @param buttonPrefix {string} - The prefix of the buttons to use
     * @param selectMenuName {string} - The name of the select menu to use
     * @param defaultVolumes {Array<number>} - The default volume for each sound. (default: 0.15 for 15%)
     * @param interaction {UnifiedInteraction} - The interaction object to use for replies.
     * @param soundFilesDir {string} The path to the directory containing the sounds.
     * @param defaultVolume {number} The default sound volume. (default: 0.15 for 15%)
     */
    this.channelName = channelName;
    this.interaction = interaction;
    this.soundFilesDir = soundFilesDir;
    this.defaultVolume = defaultVolume;
    this.defaultVolumes = defaultVolumes;
    this.buttonPrefix = buttonPrefix;
    this.selectMenuName = selectMenuName;
    this.bot = interaction.bot;

    this.volume = defaultVolume;
    this.soundName = undefined;
    this.soundNames = [];

    this.isInitiated = false;
  }

  async init() {
    /**
     * Initialize the SoundManager.
     * @returns {Promise<void>}
     */
    const { vocChan } = await this.interaction.joinVocalChannel(this.channelName);
    this.connection = vocChan;

    this.player = createAudioPlayer();
    this.player.on(AudioPlayerStatus.Playing, async () => {
      const content = `Playing "${this.soundName}" (volume: ${this.volume}) on chan "${this.channelName}"`;
      const components = await this.menu();

      await this.interaction.reply({ content, components });
    });

    this.player.on('error', error => {
      throw error;
    });

    this.connection.on(VoiceConnectionStatus.Ready, async () => {
      this.subscribtion = this.subscribtion || this.connection.subscribe(this.player);
    });

    this.isInitiated = true;
  }

  async play(interaction, soundName, volume = undefined) {
    if (this.soundNames.length === 0) {
      this.soundNames = await this.getSoundsNames();
    }
    if (!this.soundNames.includes(soundName)) {
      this.bot.warn(`soundName "${soundName}" not found`);
      return false;
    }

    this.interaction = interaction;
    this.soundName = soundName;
    this.volume = volume || this.getVolume(soundName);

    const filePath = join(this.soundFilesDir, `${soundName}.webm`);

    const resource = createAudioResource(createReadStream(filePath), {
      inputType: StreamType.WebmOpus,
      inlineVolume: true,
    });

    resource.volume.setVolume(this.volume);

    const content = `Playing "${this.soundName}" in "${this.channelName} (volume: ${this.volume})"`;
    const components = await this.menu();

    this.player.play(resource);

    await this.interaction.reply({ content, components });

    return true;
  }

  async stop() {
    this.player.stop(true);
    const content = 'Stop.';
    const components = await this.menu();

    // @TODO: investigate why this is working but discord display "interaction failed"
    await this.interaction.reply({ content, components });
  }

  async playOrStop(interaction, soundName, volume = undefined) {
    if (soundName === 'stop') {
      await this.stop();
      return;
    }

    const response = await this.play(interaction, soundName, volume);
    if (!response) {
      const content = `Sound "${soundName}" not found`;
      const components = await this.menu();
      await this.interaction.reply({ content, components });
    }
  }

  async getSoundsNames() {
    const globPath = join(this.soundFilesDir, '**/*.webm');
    const files = await globby(globPath);
    this.soundNames = files.map(f => basename(f).replace(/(\.webm)$/, ''));
    return this.soundNames;
  }

  async menu() {
    await this.getSoundsNames();

    const items = this.soundNames.map(soundName => ({
      id: soundName,
      label: soundName,
      style: ButtonStyle.Primary,
    }));

    const selectMenu = buildSelectMenu(items, this.selectMenuName, 'Choisissez un son à jouer');

    const buttons = buildButtonsMenu([{
      id: 'stop',
      label: 'Stop',
      style: ButtonStyle.Danger,
    }], this.buttonPrefix);

    return selectMenu.concat(buttons);
  }

  getVolume(soundName = '') {
    return this.defaultVolumes[soundName] || this.defaultVolume;
  }
}

export default SoundManager;
