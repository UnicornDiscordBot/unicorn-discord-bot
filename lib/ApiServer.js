import { createHmac } from 'node:crypto';
import Fastify from 'fastify';
import { default as pinoPretty } from 'pino-pretty';

class ApiServer {
  constructor({ bot, routes }) {
    /**
     * @param {DiscordBot} bot
     * @param {Fastify.RouteOptions[]} routes
     */
    this.bot = bot;

    // Generate the API key from the bot tokens
    const hmac = createHmac('sha256', process.env.CLIENT_SECRET);
    hmac.update(process.env.CLIENT_ID);
    const APIKey = hmac.digest('hex');

    this.bot.info(`API Key: ${APIKey}`);

    const loggerStream = pinoPretty({
      colorize: true,
      singleLine: true,
    });

    // Create the server
    this.server = Fastify({
      logger: {
        stream: loggerStream,
      },
    });

    // Add the bot instance to the request object
    this.server.decorateRequest('bot', undefined);
    this.server.decorateRequest('userId', '');

    // Secure the routes access with the API key
    this.server.addHook('preHandler', (request, reply, done) => {
      if (request.headers.authorization !== APIKey) {
        reply.code(401).send({ error: 'Unauthorized' });
        done(new Error('Unauthorized'));
      } else {
        request.userId = request.headers['x-user-id'];
        if (!request.userId) {
          reply.code(401).send({ error: 'Unauthorized' });
          done(new Error('Unauthorized'));
        } else {
          done();
        }
      }
    });

    this.server.addHook('onRequest', (request, reply, done) => {
      request.bot = this.bot;
      done();
    });

    // Add the routes
    this._addRoutes(routes);

    // eslint-disable-next-line no-warning-comments
    // TODO: Add websocket support
  }

  _addRoutes(routes) {
    /**
     * @private
     * @param {Fastify.RouteOptions[]}
     */
    routes.forEach(route => this.server.route(route));
    routes.forEach(route => this.bot.info(`API Route: ${route.method} ${route.path}`));
  }

  async start() {
    /**
     * Start the server
     * @public
     * @returns {Promise<void>}
     */
    try {
      const address = await this.server.listen({ port: process.env.API_PORT || 4242 });
      this.bot.info(`API Server listening on port ${address}`);
    } catch (err) {
      this.bot.log.error(err);
      process.exit(1);
    }
  }
}

export default ApiServer;
