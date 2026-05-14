'use strict';

const { Wallet, Transaction, User, sequelize } = require('../models');
const { generateReferenceCode } = require('../utils/generateRef.util');
const { evaluateAndFlagTransaction } = require('../utils/fraud.util');
const { createHttpError } = require('../middlewares/errorHandler.middleware');
const logger = require('../utils/logger.util');

/**
 * Top up a customer wallet.
 * In a semi-closed system this is admin/internal action only.
 * @param {object} params
 * @param {string} params.userId     - Wallet owner's user ID
 * @param {number} params.amount
 * @param {string} params.description
 * @returns {object} transaction record
 */
async function topUpWallet({ userId, amount, description, transactionIp }) {
    // ── Deposit limits ──────────────────────────────────────────────────────
    const parsedAmount = parseFloat(amount);
    if (parsedAmount < 100) {
        throw createHttpError(400, 'Minimum deposit amount is 100 TRY.');
    }
    if (parsedAmount > 50000) {
        throw createHttpError(400, 'Maximum deposit amount is 50,000 TRY per transaction.');
    }

    const wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) throw createHttpError(404, 'Wallet not found.');

    const balanceBefore = parseFloat(wallet.balance); // captured for Gemini context

    const dbTxn = await sequelize.transaction();
    try {
        // Credit balance
        wallet.balance = parseFloat(wallet.balance) + parseFloat(amount);
        await wallet.save({ transaction: dbTxn });

        // Record transaction
        const txn = await Transaction.create(
            {
                sender_wallet_id: null, // top-up has no sender (external funding)
                receiver_wallet_id: wallet.id,
                amount,
                transaction_type: 'TOPUP',
                status: 'COMPLETED',
                reference_code: generateReferenceCode(),
                description: description || 'Wallet top-up',
            },
            { transaction: dbTxn }
        );

        await dbTxn.commit();

        // Non-blocking fraud evaluation — catches suspicious large top-ups to new accounts
        evaluateAndFlagTransaction({
            transactionId: txn.id,
            senderWalletId: wallet.id,  // used for velocity tracking
            amount,
            transactionType: 'TOPUP',
            senderBalanceBefore: balanceBefore,
            transactionIp,
        }).catch((err) => logger.error('[fraud] Top-up evaluation error:', err.message));

        return txn;
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

/**
 * Get wallet info by userId.
 * @param {string} userId
 */
async function getWalletByUserId(userId) {
    const wallet = await Wallet.findOne({
        where: { user_id: userId },
        attributes: ['id', 'balance', 'currency', 'updatedAt'],
    });
    if (!wallet) throw createHttpError(404, 'Wallet not found.');
    return wallet;
}

module.exports = { topUpWallet, getWalletByUserId };
