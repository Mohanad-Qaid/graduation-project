'use strict';

const { verifyAccessToken } = require('../utils/jwt.util');
const { sendError } = require('../utils/response.util');
const { User } = require('../models');
const redisClient = require('../config/redis');

/**
 * Middleware: validate JWT access token.
 * Attaches decoded user payload to req.user.
 * Also checks a Redis blocklist for logged-out tokens.
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendError(res, { statusCode: 401, message: 'Authorization token missing or malformed.' });
        }

        const token = authHeader.split(' ')[1];

        // Check if token is blocklisted (user logged out)
        const isBlocklisted = await redisClient.get(`blocklist:${token}`);
        if (isBlocklisted) {
            return sendError(res, { statusCode: 401, message: 'Token has been invalidated. Please log in again.' });
        }

        const decoded = verifyAccessToken(token);

        // Re-fetch user from DB to catch status changes (e.g., suspended after token issued)
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'email', 'role', 'status', 'first_name', 'last_name', 'business_name'],
        });

        if (!user) {
            return sendError(res, { statusCode: 401, message: 'User not found.' });
        }

        if (user.status === 'SUSPENDED') {
            return sendError(res, { statusCode: 403, message: 'Account is suspended.' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return sendError(res, { statusCode: 401, message: 'Access token expired.' });
        }
        if (err.name === 'JsonWebTokenError') {
            return sendError(res, { statusCode: 401, message: 'Invalid access token.' });
        }
        next(err);
    }
}

module.exports = { authenticate };
