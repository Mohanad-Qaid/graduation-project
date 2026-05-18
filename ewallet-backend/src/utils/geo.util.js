'use strict';

const logger = require('./logger.util');

/**
 * Substitutes loopback and private LAN IPs with a real public IP in development
 * so the API can resolve a location. Has no effect in production.
 *
 * @param {string} ip
 * @returns {string}
 */
function resolveIp(ip) {
    if (process.env.NODE_ENV !== 'development') return ip;
    
    // Strip the IPv6-mapped prefix if Node.js added it (e.g., ::ffff:192.168.1.5)
    const cleanIp = ip.replace(/^::ffff:/, '');
    
    // Check if the IP belongs to localhost or any private network block
    const isLocalOrPrivate = 
        cleanIp === '127.0.0.1' || 
        cleanIp === '::1' ||
        cleanIp.startsWith('10.') || 
        cleanIp.startsWith('192.168.') || 
        cleanIp.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
        
    // Return mock public IP if local, otherwise return the actual IP
    return isLocalOrPrivate ? (process.env.MOCK_GEO_IP || '8.8.8.8') : ip;
}

/**
 * Fetches the geolocation (country code and city) for a given IP using ip-api.com.
 * Uses native Node.js fetch (available in v18+).
 * 
 * @param {string} ip - The raw IP from req.ip
 * @returns {Promise<{country: string, city: string} | null>}
 */
async function getGeoLocation(ip) {
    if (!ip) return null;

    const targetIp = resolveIp(ip);

    try {
        const response = await fetch(`http://ip-api.com/json/${targetIp}?fields=status,message,countryCode,city`);
        if (!response.ok) {
            logger.warn(`[geo] API responded with status ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            return {
                country: data.countryCode || null,
                city: data.city || null,
            };
        } else {
            logger.warn(`[geo] API lookup failed for ${targetIp}: ${data.message}`);
            return null;
        }
    } catch (error) {
        logger.error(`[geo] Failed to fetch geolocation for ${targetIp}: ${error.message}`);
        return null;
    }
}

module.exports = { getGeoLocation };
