'use strict';

const { sendError } = require('../utils/response.util');
const logger = require('../utils/logger.util');

/**
 * Centralized error handler.
 * Must be registered LAST in app.js (after all routes).
 */
function errorHandler(err, req, res, _next) {
    // Log the original error internally
    logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, {
        stack: err.stack,
        body: req.body,
    });

    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        const messages = err.errors.map((e) => e.message);
        return sendError(res, {
            statusCode: 422,
            message: 'Validation error.',
            errors: messages,
        });
    }

    // Sequelize FK errors
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return sendError(res, {
            statusCode: 400,
            message: 'Invalid reference — related record does not exist.',
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return sendError(res, { statusCode: 401, message: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
        return sendError(res, { statusCode: 401, message: 'Token expired.' });
    }

    // Application-defined HTTP errors (throw with err.statusCode)
    if (err.statusCode) {
        return sendError(res, { statusCode: err.statusCode, message: err.message });
    }

    // Hide internal details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return sendError(res, {
        statusCode: 500,
        message: isProduction ? 'An unexpected error occurred.' : err.message,
        ...(isProduction ? {} : { errors: err.stack }),
    });
}

/**
 * 404 handler — must be placed after all routes, before errorHandler.
 */
function notFound(req, res) {
    return sendError(res, {
        statusCode: 404,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
}

/**
 * Create an HTTP error with a custom status code.
 * @param {number} statusCode
 * @param {string} message
 */
function createHttpError(statusCode, message) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}

module.exports = { errorHandler, notFound, createHttpError };
