'use strict';

const { QRCode, Wallet, User } = require('../models');
const { createHttpError } = require('../middlewares/errorHandler.middleware');
const logger = require('../utils/logger.util');

/**
 * Generate (or retrieve existing) static QR code for a merchant.
 * Payload is a plain JSON string: { merchantId, businessName }.
 * Idempotent: calling again returns the same QR code.
 *
 * @param {string} merchantId
 * @returns {object} { qrId, payload, is_active }
 */
async function generateQRCode(merchantId) {
    const wallet = await Wallet.findOne({ where: { user_id: merchantId } });
    if (!wallet) throw createHttpError(404, 'Merchant wallet not found.');

    // Idempotency: return existing QR if one already exists
    const existing = await QRCode.findOne({ where: { merchant_id: merchantId } });
    if (existing) {
        logger.info(`QR already exists for merchant: ${merchantId}`);
        return {
            qrId: existing.id,
            payload: existing.payload,
            is_active: existing.is_active,
        };
    }

    // Fetch merchant business name (or fall back to first_name)
    const merchant = await User.findByPk(merchantId, {
        attributes: ['first_name', 'last_name', 'business_name'],
    });
    const businessName = merchant?.business_name
        || (merchant ? `${merchant.first_name} ${merchant.last_name}` : 'Merchant');

    // Create the DB record first to get the UUID
    const qrRecord = await QRCode.create({
        merchant_id: merchantId,
        wallet_id: wallet.id,
        payload: 'pending',
        is_active: true,
    });

    // Static, never-expiring plain JSON payload
    const payload = JSON.stringify({
        merchantId,
        businessName,
    });

    qrRecord.payload = payload;
    await qrRecord.save();

    logger.info(`Static QR generated — merchant: ${merchantId}, qrId: ${qrRecord.id}`);

    return {
        qrId: qrRecord.id,
        payload,
        is_active: qrRecord.is_active,
        businessName,
    };
}

/**
 * Get the single static QR code for a merchant.
 * @param {string} merchantId
 */
async function getMerchantQRCode(merchantId) {
    const qr = await QRCode.findOne({
        where: { merchant_id: merchantId },
        attributes: ['id', 'payload', 'is_active', 'createdAt'],
    });
    if (!qr) throw createHttpError(404, 'No QR code found. Generate one first.');
    return qr;
}

module.exports = { generateQRCode, getMerchantQRCode };
