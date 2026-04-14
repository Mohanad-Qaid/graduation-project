'use strict';

require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const redisClient = require('./config/redis');
const logger = require('./utils/logger.util');

const PORT = process.env.PORT || 5000;

async function bootstrap() {
    try {
        // ─── Test PostgreSQL Connection ─────────────────────────────────────
        await sequelize.authenticate();
        logger.info('PostgreSQL connection established successfully.');

        // ─── Sync Models (use migrations in production instead) ────────────
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            logger.info('Database models synchronized.');
        }

        // ─── Test Redis Connection ──────────────────────────────────────────
        await redisClient.ping();
        logger.info('Redis connection established successfully.');

        // ─── Start HTTP Server ──────────────────────────────────────────────
        const server = app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
        });

        // ─── Graceful Shutdown ──────────────────────────────────────────────
        const gracefulShutdown = async (signal) => {
            logger.info(`Received ${signal}. Shutting down gracefully...`);
            server.close(async () => {
                try {
                    await sequelize.close();
                    await redisClient.quit();
                    logger.info('Connections closed. Process exiting.');
                    process.exit(0);
                } catch (err) {
                    logger.error('Error during shutdown:', err);
                    process.exit(1);
                }
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // ─── Unhandled Rejections ───────────────────────────────────────────
        process.on('unhandledRejection', (reason) => {
            logger.error('Unhandled Rejection:', reason);
        });

        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception:', err);
            process.exit(1);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();
