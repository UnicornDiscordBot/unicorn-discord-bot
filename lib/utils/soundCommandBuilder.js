import SoundManager from '../SoundManager.js';

/**
 * @typedef SoundCommandDefinition
 * @property {string} channelName
 * @property {string} soundFilesDir
 * @property {string} commandName
 * @property {string} commandDescription
 * @property {string} playSoundText
 * @property {string} buttonPrefix
 * @property {string} selectMenuName
 * @property {{number}} defaultVolumes
 * @property {Array<string>} requiredRoles
 * @property {string} requiredRolesErrorMessage
 */

const soundCommandBuilder = ({
    channelName,
    soundFilesDir,
    commandName = 'playsound',
    commandDescription = 'Play some sounds in Vocal Channel',
    playSoundText = 'Which sound to play?',
    buttonPrefix = 'playsound',
    selectMenuName = 'playsound',
    defaultVolumes = {},
    requiredRoles = [],
    requiredRolesErrorMessage = 'You do not have the required roles to use this command.',
  }) => {
  /**
   * @param {SoundCommandDefinition}
   * @return {CommandDefinition}
   */
  let soundManager;

  const soundManagerOptions = {
    channelName,
    buttonPrefix,
    selectMenuName,
    defaultVolumes,
    soundFilesDir,
  };

  const getSoundManager = async interaction => {
    if (!soundManager) {
      soundManager = new SoundManager({ ...soundManagerOptions, interaction });
      await soundManager.init();
    }
  };

  const commandHandler = async interaction => {
    await getSoundManager(interaction);
    await interaction.reply({ content: playSoundText, components: await soundManager.menu() });
  };

  const buttonsHandler = async interaction => {
    await getSoundManager(interaction);

    try {
      await soundManager.stop(interaction);
    } catch (error) {
      interaction.bot.error(error);
    }
  };

  const selectMenusHandler = async interaction => {
    await getSoundManager(interaction);

    try {
      await soundManager.play(interaction, interaction.selectMenuValue);
    } catch (error) {
      interaction.bot.error(error);
    }
  };

  return {
    name: commandName,
    description: commandDescription,
    isSlashCommand: true,
    requiredRoles,
    requiredRolesErrorMessage,
    commandHandler,
    buttonsHandler,
    selectMenusHandler,
    buttonsHandheld: [`${buttonPrefix}-stop`],
    selectMenusHandheld: [selectMenuName],
  };
};

export default soundCommandBuilder;
