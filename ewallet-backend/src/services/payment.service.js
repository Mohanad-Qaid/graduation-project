'use strict';

const { Wallet, Transaction, QRCode, User, sequelize } = require('../models');
const { generateReferenceCode } = require('../utils/generateRef.util');
const { evaluateAndFlagTransaction } = require('../utils/fraud.util');
const { createHttpError } = require('../middlewares/errorHandler.middleware');
const logger = require('../utils/logger.util');

/**
 * Process a QR-based payment.
 *
 * The mobile client sends { merchantId, amount } after parsing the static QR locally.
 * The backend validates:
 *  1. merchantId exists in DB and has role === 'MERCHANT'
 *  2. The merchant has an active QR code (to get wallet_id)
 *  3. Customer has sufficient balance
 *
 * @param {object} params
 * @param {string} params.senderUserId  - Paying customer's user ID
 * @param {string} params.merchantId    - Merchant's user UUID (from scanned QR)
 * @param {number} params.amount        - Amount entered by the customer
 * @returns {object} transaction record
 */
async function processQRPayment({ senderUserId, merchantId, amount }) {
    const dbTxn = await sequelize.transaction();

    try {
        // ── Step 1: Validate merchant exists and is a MERCHANT ─────────────
        const merchant = await User.findByPk(merchantId, { transaction: dbTxn });
        if (!merchant) throw createHttpError(404, 'Merchant not found.');
        if (merchant.role !== 'MERCHANT') {
            throw createHttpError(400, 'The scanned QR code does not belong to a valid merchant.');
        }
        if (merchantId === senderUserId) {
            throw createHttpError(400, 'Merchant cannot pay their own QR code.');
        }

        // ── Step 2: Locate active QR → get wallet_id ──────────────────────
        const qr = await QRCode.findOne({ where: { merchant_id: merchantId }, transaction: dbTxn, lock: true });
        if (!qr) throw createHttpError(404, 'Merchant has not set up a QR code.');
        if (!qr.is_active) throw createHttpError(400, 'Merchant QR code is deactivated.');

        // ── Step 3: Resolve and validate amount ───────────────────────────
        const paymentAmount = parseFloat(amount);
        if (!paymentAmount || paymentAmount <= 0) {
            throw createHttpError(400, 'Invalid payment amount.');
        }

        // ── Step 3: Lock sender wallet ─────────────────────────────────────
        const senderWallet = await Wallet.findOne({
            where: { user_id: senderUserId },
            transaction: dbTxn,
            lock: true,
        });
        if (!senderWallet) throw createHttpError(404, 'Sender wallet not found.');

        // ── Step 4: Check sufficient balance ───────────────────────────────
        const senderBalance = parseFloat(senderWallet.balance);
        if (senderBalance < paymentAmount) {
            throw createHttpError(400, `Insufficient balance. Available: ${senderBalance}, Required: ${paymentAmount}`);
        }

        // ── Step 5: Lock receiver (merchant) wallet ────────────────────────
        const receiverWallet = await Wallet.findByPk(qr.wallet_id, { transaction: dbTxn, lock: true });
        if (!receiverWallet) throw createHttpError(404, 'Merchant wallet not found.');

        // ── Step 6: Deduct sender ──────────────────────────────────────────
        senderWallet.balance = (senderBalance - paymentAmount).toFixed(2);
        await senderWallet.save({ transaction: dbTxn });

        // ── Step 7: Credit receiver ────────────────────────────────────────
        receiverWallet.balance = (parseFloat(receiverWallet.balance) + paymentAmount).toFixed(2);
        await receiverWallet.save({ transaction: dbTxn });

        // ── Step 8: Record transaction ─────────────────────────────────────
        const txnRecord = await Transaction.create(
            {
                sender_wallet_id: senderWallet.id,
                receiver_wallet_id: receiverWallet.id,
                amount: paymentAmount,
                transaction_type: 'PAYMENT',
                status: 'COMPLETED',
                reference_code: generateReferenceCode(),
                description: `QR payment to merchant`,
                category: merchant.business_category || 'General',
            },
            { transaction: dbTxn }
        );

        // ── Commit ─────────────────────────────────────────────────────────
        await dbTxn.commit();

        // ── Step 9: Non-blocking fraud evaluation ──────────────────────────
        evaluateAndFlagTransaction({
            transactionId: txnRecord.id,
            senderWalletId: senderWallet.id,
            amount: paymentAmount,
        }).catch((err) => logger.error('Fraud evaluation error:', err.message));

        return txnRecord;
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

module.exports = { processQRPayment };
