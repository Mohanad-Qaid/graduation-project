'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger.util');

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        dialect: 'postgres',

        // Connection pool — tune per your server capacity
        pool: {
            max: 20,
            min: 2,
            acquire: 30000,
            idle: 10000,
        },

        // SSL in production
        dialectOptions: {
            ssl:
                process.env.DB_SSL === 'true'
                    ? { require: true, rejectUnauthorized: false }
                    : false,
        },

        // Suppress Sequelize query logs in production
        logging: isProduction ? false : (msg) => logger.debug(msg),

        define: {
            underscored: false,
            freezeTableName: false,
            timestamps: true,
        },
    }
);

module.exports = sequelize;
