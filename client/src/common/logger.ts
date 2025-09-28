import pino from 'pino';

const isDebug = process.argv.includes('--debug');

export const logger = pino({
  level: isDebug ? 'debug' : 'info',
  transport: {
    target: 'pino/file',
    options: {
      destination: '/tmp/codemate/client/client.log',
      mkdir: true,
    },
  },
});

export default logger;