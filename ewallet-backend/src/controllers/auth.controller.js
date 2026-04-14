'use strict';

const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response.util');

/**
 * POST /api/v1/auth/register
 */
async function register(req, res, next) {
    try {
        const user = await authService.register(req.body);
        return sendSuccess(res, {
            statusCode: 201,
            message: 'Registration successful. Awaiting admin approval.',
            data: user,
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
    try {
        const result = await authService.login(req.body);
        return sendSuccess(res, { message: 'Login successful.', data: result });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/auth/me
 * Requires authentication.
 */
async function getMe(req, res, next) {
    try {
        const user = await authService.getMe(req.user.id);
        return sendSuccess(res, { message: 'User retrieved.', data: user });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/v1/auth/logout
 * Requires authentication.
 */
async function logout(req, res, next) {
    try {
        await authService.logout(req.user.id, req.token);
        return sendSuccess(res, { message: 'Logged out successfully.' });
    } catch (err) {
        next(err);
    }
}

module.exports = { register, login, getMe, logout };
