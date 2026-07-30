const winston = require('winston');
// winston->  universal logging library for Node.js

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, service }) => {
            return `[${timestamp}] [${service || 'app'}] ${level}: ${message}`;
        })
    ),
    transports: [new winston.transports.Console()],
});

// each service can create a child logger tagged with its own name
const createLogger = (serviceName) => logger.child({ service: serviceName });

module.exports = { logger, createLogger };