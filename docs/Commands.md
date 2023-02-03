# Commands

For this lib, everything which can interact with Discord, is called a command for simplicity purposes.

## The command definition object

```javascript
export default {
  name: 'the command name (mandatory)',
  description: 'the command description (mandatory)',
  isSlashCommand: true, // whether the command is a slash command (default: true)
  isMessageCommand: true, // whether the command is a message command (default: true)
  acceptDM: false, // whether the command can be used in DMs (default: false)
  requiredRoles: ['role1', 'role2'], // the roles required to use the command (default: [])
  requireAllRoles: false, // whether all the roles are required to use the command (default: false)
  requireRolesErrorMessage: 'You do not have the required roles to use this command', // the error message to send when the user does not have the required roles (default: 'You do not have the required roles to use this command')
  buttonsHandheld: ['button1', 'button2'], // the buttons that can be handheld by this command (default: [])
  reuiredPermissions: [], // the permissions required to use the command (default: [])
  commandHandler: (interaction) => {
    // the command handler if the command is a slash command or a message command
    // note that this handler must reply to the interaction using:
    interaction.reply({ content: 'the response' });
    // if you dont reply, Discord will wait for a reply and will timeout, displaying an error.
  },
  buttonsHandler: (interaction) => {
    // the handler for the buttons declared in the buttonsHandheld option
    // note that this handler must reply to the interaction using:
    interaction.reply({ content: 'the response' });
    // if you dont reply, Discord will wait for a reply and will timeout, displaying an error.
  },
  messageHandler: (interaction) => {
    // this one handles when a message is received
    // you dont have to reply to the interaction, but you can if you want to
  },
  mentionHandler: (interaction) => {
    // this one handles when the bot is mentioned, directly via @ or by using its nickname
    // you dont have to reply to the interaction, but you can if you want to
  },
  options: [], // the options of the command (default: [])
  apiRoutes: [], // the api routes of the command (default: [])
};
```

## API routes

You can create some API routes for your commands, using the `apiRoutes` option of the command definition object.

As this bot uses [Fastify](https://www.fastify.io/), those routes are created using the [Fastify API](https://www.fastify.io/docs/latest/Routes/).

> **Note:** all the defined routes will be prefixed with `/<command name>/<api route path>` to avoid collisions.
