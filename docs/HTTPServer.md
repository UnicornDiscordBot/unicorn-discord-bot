# The HTTP Server

In order to access, configure or control your bot, you can add some API routes to each command.

> If no API routes are defined, the HTTP server will not be started.

The default port is `4242` but you can change it using the `API_PORT` option in the environment (`.env` file).

This bot use [Fastify](https://www.fastify.io/) to serve the API routes so you can use the [Fastify API](https://www.fastify.io/docs/latest/Routes/) to define your routes.

> **Note:** all the defined routes will be prefixed with `/<command name>/<api route path>` to avoid collisions.

## Securing the API

To secure the API, a token is required to access the API. This token is automatically created from your bot credentials.
`CLIENT_ID` and `CLIENT_SECRET` are used to generate the token :

```javascript
const hmac = createHmac('sha256', process.env.CLIENT_SECRET);
hmac.update(process.env.CLIENT_ID);

const APIKey = hmac.digest('hex');
```

This API key is visible from the logs when the bot starts, so you can copy/paste it to use it in your API client, but you can also generate it the same way in your code.

You then just have to put this token in the `Authorization` header of your requests.

## Identifying yourself to the bot

The best way to identify yourself to the bot is to use the `X-User-ID` header. This header is used to identify the user who made the request.
