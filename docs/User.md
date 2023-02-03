# The User object

This object is used to represent a Discord user / member

Thanks to this object, you don't have to worry about the user being a member or not, you can access the (quite) same 
properties and methods. Everything is always at the same place

## The user object

### Member

- user: the user object from discord.js
- userId: the user.id
- isBot: boolean indicating if the user is a bot
- member: the member object from discord.js
- guild: the guild object from discord.js
- roles: the roles of the member into the guild
- originalNickname: the original nickname of the member
- currentNickname: the current nickname of the member

### Not a member (DM author or other...)

- user: the user object from discord.js
- userId: the user.id
- isBot: boolean indicating if the user is a bot

All other properties are set to `null` , `''` or `[]`.

### Methods

- hasRole(roleNameOrId: string): boolean indicating if the user has the given role
- hasOneOfRoles(roleNamesOrIds: string[]): boolean indicating if the user has at least one of the given roles
- setNickname(nickname: string): Promise<void> setting the nickname of the member (saving the original one in `originalNickname`)
- resetNickname(): Promise<void> resetting the nickname of the member to its original one

