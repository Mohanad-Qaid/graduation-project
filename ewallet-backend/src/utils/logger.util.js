'use strict';

/**
 * Minimal structured logger.
 * In production, replace with winston/pino for log aggregation.
 */
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? 1 : 3);

function formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const logger = {
    error: (message, meta) => {
        if (CURRENT_LEVEL >= LOG_LEVELS.error) {
            console.error(formatMessage('error', message, meta));
        }
    },
    warn: (message, meta) => {
        if (CURRENT_LEVEL >= LOG_LEVELS.warn) {
            console.warn(formatMessage('warn', message, meta));
        }
    },
    info: (message, meta) => {
        if (CURRENT_LEVEL >= LOG_LEVELS.info) {
            console.info(formatMessage('info', message, meta));
        }
    },
    debug: (message, meta) => {
        if (CURRENT_LEVEL >= LOG_LEVELS.debug) {
            console.debug(formatMessage('debug', message, meta));
        }
    },
};

module.exports = logger;
