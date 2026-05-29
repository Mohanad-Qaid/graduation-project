'use strict';

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }; // 0 higher priority , 3 lowest priority
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? 1 : 3);

function formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();

    let metaStr = '';
    if (meta) {
        // If meta is an Error object, extract its message and stack
        if (meta instanceof Error) {
            metaStr = `\n${meta.stack || meta.message}`;
        } else {
            // Otherwise, stringify it normally
            metaStr = ` ${JSON.stringify(meta)}`;
        }
    }

    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`;
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
