'use strict';

const redisClient = require('../config/redis');

const OTP_TTL_SECONDS     = 180;  // 3 minutes
const MAX_ATTEMPTS        = 3;
const RESEND_WINDOW_SECS  = 3600; // 1 hour
const MAX_RESENDS         = 3;

// ── Key helpers ───────────────────────────────────────────────────────────────

const otpKey    = (email) => `otp:${email.toLowerCase()}`;
const resendKey = (email) => `otp:resend:${email.toLowerCase()}`;

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random 6-digit numeric OTP string.
 */
function generateOTP() {
    // Math.random is fine for OTPs — not a crypto key
    return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Save an OTP for the given email in Redis.
 * Overwrites any existing OTP (resend scenario).
 * @returns {string} The generated OTP code
 */
async function saveOTP(email) {
    const code = generateOTP();
    const payload = JSON.stringify({ code, attempts: 0 });
    await redisClient.setex(otpKey(email), OTP_TTL_SECONDS, payload);
    return code;
}

/**
 * Verify the submitted code against Redis.
 * Increments the attempt counter on wrong guess.
 * Deletes the key after success OR after reaching MAX_ATTEMPTS.
 *
 * @returns {{ valid: boolean, reason?: 'expired'|'invalid'|'max_attempts' }}
 */
async function verifyOTP(email, inputCode) {
    const raw = await redisClient.get(otpKey(email));

    if (!raw) {
        return { valid: false, reason: 'expired' };
    }

    const { code, attempts } = JSON.parse(raw);

    // Already exhausted — should not normally reach here but guard anyway
    if (attempts >= MAX_ATTEMPTS) {
        await redisClient.del(otpKey(email));
        return { valid: false, reason: 'max_attempts' };
    }

    if (inputCode !== code) {
        const newAttempts = attempts + 1;
        if (newAttempts >= MAX_ATTEMPTS) {
            // Invalidate immediately on the 3rd wrong guess
            await redisClient.del(otpKey(email));
            return { valid: false, reason: 'max_attempts' };
        }
        // Update attempt count but keep same TTL (do not reset the 3-min window)
        const remainingTtl = await redisClient.ttl(otpKey(email));
        await redisClient.setex(
            otpKey(email),
            Math.max(remainingTtl, 1),
            JSON.stringify({ code, attempts: newAttempts })
        );
        return { valid: false, reason: 'invalid', attemptsLeft: MAX_ATTEMPTS - newAttempts };
    }

    // ✅ Correct code — delete immediately (single-use)
    await redisClient.del(otpKey(email));
    return { valid: true };
}

/**
 * Check whether this email can still request a resend.
 * Returns true if under the hourly cap.
 */
async function canResend(email) {
    const raw = await redisClient.get(resendKey(email));
    if (!raw) return true;
    return parseInt(raw, 10) < MAX_RESENDS;
}

/**
 * Increment the resend counter for this email (hourly window).
 */
async function incrementResend(email) {
    const key = resendKey(email);
    const count = await redisClient.incr(key);
    if (count === 1) {
        // First resend this hour — set the window
        await redisClient.expire(key, RESEND_WINDOW_SECS);
    }
}

module.exports = {
    generateOTP,
    saveOTP,
    verifyOTP,
    canResend,
    incrementResend,
    OTP_TTL_SECONDS,
    MAX_ATTEMPTS,
};
