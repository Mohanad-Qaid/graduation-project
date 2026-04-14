'use strict';

require('dotenv').config();
const Redis = require('ioredis');

const logger = require('../utils/logger.util');

const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    // Only include password if defined
    ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
    retryStrategy(times) {
        // Exponential back-off capped at 10 seconds
        const delay = Math.min(times * 200, 10000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
};

const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
    logger.info('Redis client connecting...');
});

redisClient.on('ready', () => {
    logger.info('Redis client ready.');
});

redisClient.on('error', (err) => {
    logger.error('Redis client error:', err.message);
});

redisClient.on('close', () => {
    logger.warn('Redis connection closed.');
});

redisClient.on('reconnecting', (delay) => {
    logger.warn(`Redis reconnecting in ${delay}ms...`);
});

module.exports = redisClient;
