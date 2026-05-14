'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');
const { sendError } = require('../utils/response.util');

/**
 * Build a reusable rate limiter backed by Redis.
 * @param {object} options
 * @param {number} options.windowMs   - Window in milliseconds
 * @param {number} options.max        - Max requests per window
 * @param {string} options.prefix     - Redis key prefix for isolation
 * @param {string} [options.message]  - Error message
 */
function createRateLimiter({ windowMs, max, prefix, message }) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => `${prefix}:${req.ip}`,
        store: new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix,
        }),
        handler: (_req, res) => {
            return sendError(res, {
                statusCode: 429,
                message: message || 'Too many requests. Please try again later.',
            });
        },
    });
}

// ─── Preset Limiters ──────────────────────────────────────────────────────────

/** Global limiter applied to all routes */
const globalRateLimiter = createRateLimiter({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    prefix: 'rl:global',
    message: 'Too many requests from this IP. Try again later.',
});

/** Stricter limiter for auth endpoints.
 *  Max is set to 20 to accommodate soft-lock PIN re-verification calls
 *  (POST /auth/login is now also called on every app foreground event).
 */
const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    prefix: 'rl:auth',
    message: 'Too many auth attempts. Please wait 15 minutes.',
});

/** Payment endpoint limiter */
const paymentRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    prefix: 'rl:payment',
    message: 'Too many payment requests. Slow down.',
});

/** OTP send/resend limiter — stricter than auth to prevent email spam */
const otpRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    prefix: 'rl:otp',
    message: 'Too many OTP requests. Please wait 15 minutes.',
});

module.exports = { globalRateLimiter, authRateLimiter, paymentRateLimiter, otpRateLimiter, createRateLimiter };
