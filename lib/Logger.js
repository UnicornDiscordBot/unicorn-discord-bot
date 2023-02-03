import { default as pino } from 'pino';
import { default as pinoPretty } from 'pino-pretty';

const refReplacer = () => {
  let m = new Map(), v = new Map(), init = null;

  return (field, value) => {
    // eslint-disable-next-line no-invalid-this
    let p = m.get(this) + (Array.isArray(this) ? `[${field}]` : `.${field}`);
    let isComplex = value === Object(value);

    if (isComplex) m.set(value, p);

    let pp = v.get(value) || '';
    let path = p.replace(/undefined\.\.?/, '');
    let val = pp ? `#REF:${pp[0] === '[' ? '$' : '$.'}${pp}` : value;

    init = !init ? (init = value) : (val === init ? val = '#REF:$' : 0);
    if (!pp && isComplex) v.set(value, path);

    return val;
  };
};

class Logger {
  constructor(bot) {
    const stream = pinoPretty({
      colorize: true,
      singleLine: true,
    });
    this.logger = pino(stream);

    bot.on('log', this.listener);
  }

  listener({ level, message }) {
    const accumulator = [];
    let accStringPosition = -1;
    Object.keys(message).forEach(k => {
      const m = message[k];
      if (typeof m === 'object') {
        if (Array.isArray(m)) {
          accumulator.push(JSON.stringify(m, refReplacer, 2));
        } else if (m instanceof Error) {
          accumulator.push(m);
        } else {
          accumulator.push(JSON.stringify(m, refReplacer, 2));
        }
      } else if (accStringPosition > -1) {
        accumulator[accStringPosition] += ` ${m}`;
      } else {
        accumulator.push(m);
        accStringPosition = accumulator.length - 1;
      }
    });
    accumulator.forEach(m => {
      this.logger[level](m);
    });
  }

  info(...args) {
    this.listener({
      level: 'info',
      message: args,
    });
  }

  error(...args) {
    this.listener({
      level: 'error',
      message: args,
    });
  }

  debug(...args) {
    this.listener({
      level: 'debug',
      message: args,
    });
  }

  fatal(...args) {
    this.listener({
      level: 'fatal',
      message: args,
    });
  }

  warn(...args) {
    this.listener({
      level: 'warn',
      message: args,
    });
  }

  trace(...args) {
    this.listener({
      level: 'trace',
      message: args,
    });
  }

  silent(...args) {
    this.listener({
      level: 'silent',
      message: args,
    });
  }
}

export default Logger;
