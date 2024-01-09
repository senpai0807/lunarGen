const { createLogger, format, transports } = require('winston');
const ansiColors = require('ansi-colors');

function createColorizedLogger() {
  const logger = createLogger({
    level: 'silly',
    format: format.combine(
      format.timestamp(),
      format.printf(({ timestamp, level, message }) => {
        if (typeof message !== 'string') {
          message = String(message);
        }

        const colorizedTimestamp = ansiColors.cyan(timestamp);
        let colorizedMessage = message;
        if (level === 'warn') {
          colorizedMessage = ansiColors.bold.yellow(message.replace(level, ''));
        } else if (level === 'info') {
          colorizedMessage = ansiColors.blue(message.replace(level, ''));
        } else if (level === 'error') {
          colorizedMessage = ansiColors.bold.red(message.replace(level, ''));
        } else if (level === 'verbose') {
          colorizedMessage = ansiColors.bold.green(message.replace(level, ''));
        } else if (level === 'http') {
          colorizedMessage = ansiColors.bold.magenta(message.replace(level, ''));
        } else if (level === 'debug') {
          colorizedMessage = ansiColors.bold.white(message.replace(level, ''));
        }
        return `[${colorizedTimestamp}] ${colorizedMessage}`;
      }),
    ),
    transports: [new transports.Console()],
  });

  return logger;
}

module.exports = createColorizedLogger;