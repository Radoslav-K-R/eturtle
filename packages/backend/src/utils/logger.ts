import winston from 'winston';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const metaString = Object.keys(metadata).length
      ? ` ${JSON.stringify(metadata)}`
      : '';
    return `${String(timestamp)} [${level}]: ${String(message)}${metaString}`;
  }),
);

export const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: process.env['NODE_ENV'] === 'production' ? 'http' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: process.env['NODE_ENV'] === 'production'
        ? logFormat
        : developmentFormat,
    }),
  ],
  exitOnError: false,
});
