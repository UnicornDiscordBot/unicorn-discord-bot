# Unified Interactions

Unless [Discord.js](https://discord.js.org/), this bot uses a unified interaction system for slash commands, message commands, messages, buttons...

The goal of this system is to make it easier to handle interactions, and to make it easier to add new interactions.

With this, most of the things you usually have to worry about are already computed and ready to use or check.

## The interaction object

You can access the following parameters and methods within the interaction object:

- **options**: [], // the interaction options 
- **content**: '', // the interaction content if any 
- **locale**: 'default', // the guessed interaction locale or default if unguessable 
- **author**: [User](./User.md), // the interaction author as a User object 
- **guild**: Guild | undefined, // the interaction guild if suitable 
- **channel**: TextChannel, // the interaction channel 
- **commandName**: '' | undefined, // the interaction command name if it is a command 
- **buttonId**: '' | undefined, // the interaction button id if it is a button (customId in discord.js)
- **replied**: false, // whether the interaction has been replied to 
- **originalObject**: Interaction|Message, // the original interaction object
- **isDM**: false, // whether the interaction is a DM
- **isButton**: false, // whether the interaction is a button
- **isSlashCommand**: false, // whether the interaction is a slash command 
- **isMessageCommand**: false, // whether the interaction is a message command
- **isFromBot**: false, // whether the interaction is from a bot (another one or this one)
- **isFromMe**: false, // whether the interaction is from this bot
- **isToMe**: false, // whether this bot is mentioned explicitly
- **isMentioningMe**: false, // whether this bot is mentioned implicitly (someone wrote its nickname on a channel)
- **defer()**: Promise<void>, // defers the interaction, the same as deferReply() from discord.js
- **reply()**: Promise<void>, // replies to the interaction, the same as reply() from discord.js but performs an editReply() if the message have already been replied.
- **followUp()**: Promise<void>, // sends a follow up message, the same as followUp() from discord.js

