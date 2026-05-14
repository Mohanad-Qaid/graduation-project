'use strict';

const bcrypt = require('bcrypt');
const { User } = require('../models');
const { saveOTP, verifyOTP, canResend, incrementResend } = require('../utils/otp.util');
const { sendOTPEmail } = require('../utils/mailer.util');
const { createHttpError } = require('../middlewares/errorHandler.middleware');
const logger = require('../utils/logger.util');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

// ── Request / Resend OTP ──────────────────────────────────────────────────────

/**
 * Generate and send an OTP to the given email.
 *
 * @param {string}  email       - Normalised lowercase email
 * @param {'verify'|'reset'} purpose
 * @param {boolean} mustExist   - true = email must belong to an existing user (reset flow)
 *                                false = no user check (registration flow)
 */
async function requestOTP(email, purpose, mustExist) {
    const normalised = email.trim().toLowerCase();

    if (mustExist) {
        const user = await User.findOne({ where: { email: normalised } });
        if (!user) {
            // Generic message — don't reveal whether the email is registered
            throw createHttpError(404, 'If that email is registered, a code has been sent.');
        }
        // Require email_verified for password reset so the user already owns it
        if (!user.email_verified) {
            throw createHttpError(403, 'Email is not yet verified. Please verify your email first.');
        }
    }

    // Resend rate limit
    const allowed = await canResend(normalised);
    if (!allowed) {
        throw createHttpError(429, 'Too many resend requests. Please wait an hour before trying again.');
    }

    const code = await saveOTP(normalised);
    await incrementResend(normalised);
    await sendOTPEmail(normalised, code, purpose);

    logger.info(`OTP sent [purpose=${purpose}] to ${normalised}`);
}

// ── Confirm OTP (email verification after registration) ───────────────────────

/**
 * Verify an OTP and mark the user's email as verified.
 * Used after registration.
 */
async function confirmEmailOTP(email, code) {
    const normalised = email.trim().toLowerCase();
    const result = await verifyOTP(normalised, code);

    if (!result.valid) {
        const msgs = {
            expired:      'Code has expired. Please request a new one.',
            max_attempts: 'Too many wrong attempts. Please request a new code.',
            invalid:      `Incorrect code. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} remaining.`,
        };
        throw createHttpError(400, msgs[result.reason] || 'Invalid code.');
    }

    // Mark email as verified
    const user = await User.findOne({ where: { email: normalised } });
    if (user && !user.email_verified) {
        await user.update({ email_verified: true });
    }
}

// ── Reset Password ────────────────────────────────────────────────────────────

/**
 * Verify OTP then update the user's PIN (password_hash).
 * Both the OTP check and the password update happen in the same call
 * so there is no "verified" window that can be exploited.
 */
async function resetPassword(email, code, newPin) {
    const normalised = email.trim().toLowerCase();

    // Validate PIN format before touching Redis
    if (!/^\d{6}$/.test(newPin)) {
        throw createHttpError(400, 'PIN must be exactly 6 digits.');
    }

    const result = await verifyOTP(normalised, code);

    if (!result.valid) {
        const msgs = {
            expired:      'Code has expired. Please request a new one.',
            max_attempts: 'Too many wrong attempts. Please request a new code.',
            invalid:      `Incorrect code. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} remaining.`,
        };
        throw createHttpError(400, msgs[result.reason] || 'Invalid code.');
    }

    const user = await User.findOne({ where: { email: normalised } });
    if (!user) throw createHttpError(404, 'User not found.');

    const password_hash = await bcrypt.hash(newPin, SALT_ROUNDS);
    await user.update({ password_hash });

    logger.info(`Password reset for user ${user.id}`);
}

module.exports = { requestOTP, confirmEmailOTP, resetPassword };
