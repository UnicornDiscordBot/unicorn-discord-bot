# unicorn-discord-bot

> A simple but robust and highly customizable Discord bot.

This module aims to drastically simplify the creation of Discord bots compared to using a library like [discord.js](https://discord.js.org/). 

This module is basically a no brain bot using [discord.js](https://discord.js.org/) as a backbone. 

You just have to provide the brain.

You can do (almost) everything you can do with [discord.js](https://discord.js.org/) with this module, but with no headache.

## Installation

```shell
npm install unicorn-discord-bot

yarn add unicorn-discord-bot

pnpm install unicorn-discord-bot
```

## Usage overview

You can easily create a bot with the following code:

With [ESM](https://nodejs.org/api/esm.html):

```javascript
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DiscordBot } from 'unicorn-discord-bot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  commandsDirPath: join(__dirname, 'commands'),
  prefix: '+!',
};

const bot = new DiscordBot(options);

bot.start();
```

With [CommonJS](https://nodejs.org/api/modules.html):

```javascript
const { DiscordBot } = require('unicorn-discord-bot');

const options = {
  commandsDirPath: join(__dirname, 'commands'),
  prefix: '+!',
};

const bot = new DiscordBot(options);

bot.start();
```

All you have to do now is to create a `commands` folder in the same directory as the file above and create a command 
file in it.

By default, the bot will look for all .js|.ts|.cjs|.mjs files in the path specified by `commandsDirPath` in the bot options
and use them as commands.

Even if those objects are called "commands", you can use them to handle any kind of interaction, message, buttons...

### Enviorment Variables

The bot will look for the following environment variables:

```shell
BOT_TOKEN=""
DEV_MODE=on
````

See [Discord Developer Portal](https://discord.com/developers/applications) for more details.

You can put them directly into a `.env` file in the root of your project as this bot uses the [dotenv](https://www.npmjs.com/package/dotenv) package.

**Note:** The `DEV_MODE` on is useful to test the bot, since when it is not in dev mode, Discord performs a command cache which can be very long.
As long as you use your bot in a dev environment / onto only one Discord server (aka guild), it is pretty useful to keep the `DEV_MODE` on.

### Commands

[Go deeper into commands](docs/Commands.md).

You can add commands to the bot by adding them to the `commandsDirPath` option. Or add them before it starts with the `addCommand` or `addCommands` methods of the DiscordBot class.

Commands can be triggered via:
- slash commands like `/ping`
- prefixed commands like `+!ping` (you can set the bot prefix with the `prefix` option of the DiscordBot class)
- mentions like `@bot ping` (the command name can be everywhere in the message ; supports multiple commands)
- DMs messages
- DMs prefixed commands
- DMs slash commands
- any DMs or channel message
- buttons...

By default, all commands are treated as both slash and prefixed commands.
You can change this behavior into the command definition.

Here is a simple example of a ping command:

```javascript
export default {
  name: 'ping',
  description: 'Replies with pong!',
  commandHandler: interaction => {
    interaction.reply({ content: 'pong!', ephemeral: true });
  },
};
```

### Buttons handling

Each command can declare a buttons handler. This handler will be called when the user clicks on a button in the command's message.
To do so, you need to add the `buttonsHandler` option to the command.

### SoundManager

This bot is able to join a vocal channel and play sounds into it. To do so, you can import the `SoundManager` class and use it to create a sound manager.
This implementation can natively play webm formatted files.

### Logger

This bot uses the [pino](https://www.npmjs.com/package/pino) logger by default but you can mute it and directly listen to the bot "log" event as the bot is nothing more than an event emitter.
See how it is done in the [./lib/Logger.js](./lib/Logger.js) file.


### Handle events externally

As the DiscordBot is an event emitter, you can also listen and respond to the same events as the bot uses internally like:

- button:{buttonId}
- slashCommand:{commandName}
- messageCommand:{commandName}
- message
- mention
- directMessage

In addition, you can listen to the following, less specific events (prefixed with 'external' and no buttonId or commandName):

- external:button
- external:slashCommand
- external:messageCommand
- external:message
- external:mention
- external:directMessage

All of these events are emitted with the same arguments as the ones used internally by the bot : a [UnifiedInteraction object](./docs/UnifiedInteraction.md).

### Example

You can get inspired or see what can be done within the [example](example) folder.
To use the example bot, you need to create a `.env` file in the root of the example folder with the information you get when registering your bot on the [Discord Developer Portal](https://discord.com/developers/applications).
