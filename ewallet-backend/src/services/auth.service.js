'use strict';

const bcrypt = require('bcrypt');
const { User, Wallet, sequelize } = require('../models');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt.util');
const { createHttpError } = require('../middlewares/errorHandler.middleware');
const redisClient = require('../config/redis');
const logger = require('../utils/logger.util');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Register a new user (CUSTOMER or MERCHANT).
 * Creates the user and provisions a wallet inside a DB transaction.
 * @param {object} dto - { first_name, last_name, email, phone, password, role, business_name? }
 */
async function register(dto) {
    const { first_name, last_name, email, phone, password, role, business_name } = dto;

    if (role === 'ADMIN') {
        throw createHttpError(403, 'Cannot self-register as ADMIN.');
    }

    const dbTxn = await sequelize.transaction();
    try {
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await User.create(
            { first_name, last_name, business_name: business_name || null, email, phone, password_hash, role },
            { transaction: dbTxn }
        );

        await Wallet.create(
            { user_id: user.id, balance: 0.0, currency: 'TRY' },
            { transaction: dbTxn }
        );

        await dbTxn.commit();
        logger.info(`New ${role} registered: ${email}`);

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            status: user.status,
        };
    } catch (err) {
        await dbTxn.rollback();
        if (err.name === 'SequelizeUniqueConstraintError') {
            throw createHttpError(409, 'Email or phone already in use.');
        }
        throw err;
    }
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user with email/6-digit PIN.
 * Returns access + refresh tokens.
 * @param {object} dto - { email, password }
 */
async function login(dto) {
    const { email, password } = dto;

    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw createHttpError(401, 'Invalid credentials.');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
        throw createHttpError(401, 'Invalid credentials.');
    }

    if (user.status === 'PENDING') {
        throw createHttpError(403, 'Your account is under review. Please wait for admin approval.');
    }
    if (user.status === 'REJECTED') {
        throw createHttpError(403, 'Your registration has been rejected.');
    }
    if (user.status === 'SUSPENDED') {
        throw createHttpError(403, 'Account is suspended. Contact support.');
    }

    // Only APPROVED users reach this point — generate tokens
    const payload = { id: user.id, role: user.role, status: user.status };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: user.id });

    const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
    await redisClient.setex(`refresh:${user.id}`, REFRESH_TTL_SECONDS, refreshToken);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            business_name: user.business_name,
            email: user.email,
            role: user.role,
            status: user.status,
        },
    };
}

// ─── Get Me ───────────────────────────────────────────────────────────────────

/**
 * Fetch current user data + wallet for session restoration.
 * @param {string} userId
 */
async function getMe(userId) {
    const user = await User.findByPk(userId, {
        attributes: ['id', 'first_name', 'last_name', 'business_name', 'email', 'phone', 'role', 'status'],
        include: [{ association: 'wallet', attributes: ['id', 'balance', 'currency'] }],
    });
    if (!user) throw createHttpError(404, 'User not found.');
    return user;
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Invalidate tokens on logout.
 * @param {string} userId
 * @param {string} accessToken
 */
async function logout(userId, accessToken) {
    await redisClient.del(`refresh:${userId}`);
    const BLOCKLIST_TTL = 60 * 20;
    await redisClient.setex(`blocklist:${accessToken}`, BLOCKLIST_TTL, '1');
}

module.exports = { register, login, getMe, logout };
