'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES  = process.env.JWT_EXPIRES_IN  || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Admin-specific TTLs (shorter — web session, not persistent mobile token)
const ADMIN_ACCESS_EXPIRES  = process.env.JWT_ADMIN_EXPIRES_IN  || '1h';
const ADMIN_REFRESH_EXPIRES = process.env.JWT_ADMIN_REFRESH_EXPIRES_IN || '8h';

/**
 * Generate a short-lived access token (mobile users).
 * @param {object} payload - { id, role, status }
 */
function generateAccessToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

/**
 * Generate a long-lived refresh token (mobile users).
 * @param {object} payload - { id }
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

/**
 * Generate a short-lived admin access token (1h default).
 * @param {object} payload - { id, role, status }
 */
function generateAdminAccessToken(payload) {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ADMIN_ACCESS_EXPIRES });
}

/**
 * Generate an admin refresh token (8h default — web session).
 * @param {object} payload - { id }
 */
function generateAdminRefreshToken(payload) {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: ADMIN_REFRESH_EXPIRES });
}

/**
 * Verify and decode an access token (shared by admin + mobile).
 * Throws JsonWebTokenError / TokenExpiredError on failure.
 */
function verifyAccessToken(token) {
    return jwt.verify(token, ACCESS_SECRET);
}

/**
 * Verify and decode a refresh token (shared by admin + mobile).
 */
function verifyRefreshToken(token) {
    return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateAdminAccessToken,
    generateAdminRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
