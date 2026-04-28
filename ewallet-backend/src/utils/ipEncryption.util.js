'use strict';

/**
 * AES-256-GCM IP encryption utility.
 *
 * Why GCM?
 *  - Authenticated encryption: detects any tampering of the ciphertext.
 *  - Each encryption produces a unique IV, so two identical IPs produce
 *    different ciphertexts (prevents frequency analysis / de-anonymisation).
 *
 * Storage format (colon-delimited, base64 parts):
 *   <iv_base64>:<authTag_base64>:<ciphertext_base64>
 *
 * Environment variable required:
 *   IP_ENCRYPTION_KEY — 64 hex characters (= 32 bytes, for AES-256).
 *
 * Generate a key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;   // 96-bit IV recommended for GCM
const TAG_BYTES = 16;   // GCM auth tag length

function getKey() {
    const hex = process.env.IP_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error(
            'IP_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }
    return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext IP address into a storable string.
 * @param {string} ip - raw IPv4 or IPv6 address
 * @returns {string} encrypted token: "<iv>:<tag>:<ciphertext>" (all base64)
 */
function encryptIp(ip) {
    if (!ip) return null;
    const key = getKey();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });

    const encrypted = Buffer.concat([cipher.update(ip, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
        iv.toString('base64'),
        tag.toString('base64'),
        encrypted.toString('base64'),
    ].join(':');
}

/**
 * Decrypt a stored IP token back to the plaintext IP address.
 * Returns null if the input is null/undefined or decryption fails (tampered data).
 * @param {string} token - "<iv>:<tag>:<ciphertext>" (base64)
 * @returns {string|null}
 */
function decryptIp(token) {
    if (!token) return null;
    try {
        const [ivB64, tagB64, cipherB64] = token.split(':');
        const key = getKey();
        const iv = Buffer.from(ivB64, 'base64');
        const tag = Buffer.from(tagB64, 'base64');
        const encrypted = Buffer.from(cipherB64, 'base64');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
        decipher.setAuthTag(tag);

        return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
    } catch {
        // Tampered ciphertext or wrong key — return null rather than crashing
        return null;
    }
}

module.exports = { encryptIp, decryptIp };
