import pino from 'pino';

const isDebug = process.argv.includes('--debug');

export const logger = pino({
  level: isDebug ? 'debug' : 'silent',
  transport: isDebug ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'HH:MM:ss',
    },
  } : undefined,
});

export default logger;