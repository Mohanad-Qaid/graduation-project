'use strict';

const crypto = require('crypto');

/**
 * Generate a unique, URL-safe transaction reference code.
 * Format: TXN-<timestamp_base36>-<random_hex>
 * @returns {string}  e.g. TXN-LK3F2A-4E9B3C
 */
function generateReferenceCode() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TXN-${ts}-${rand}`;
}

/**
 * Generate a cryptographically secure OTP of given digits.
 * @param {number} [digits=6]
 * @returns {string}
 */
function generateOTP(digits = 6) {
    const max = Math.pow(10, digits);
    const otp = crypto.randomInt(0, max);
    return String(otp).padStart(digits, '0');
}

module.exports = { generateReferenceCode, generateOTP };
