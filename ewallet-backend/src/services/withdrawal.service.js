'use strict';

const { WithdrawalRequest, Wallet, Transaction, User, sequelize } = require('../models');
const { generateReferenceCode } = require('../utils/generateRef.util');
const { createHttpError } = require('../middlewares/errorHandler.middleware');
const logger = require('../utils/logger.util');

/**
 * Merchant submits a withdrawal request.
 * Immediately locks the requested amount in the wallet.
 *
 * @param {object} params
 * @param {string} params.merchantId
 * @param {number} params.amount
 */
async function requestWithdrawal({ merchantId, amount }) {
    const dbTxn = await sequelize.transaction();
    try {
        const wallet = await Wallet.findOne({
            where: { user_id: merchantId },
            transaction: dbTxn,
            lock: true,
        });
        if (!wallet) throw createHttpError(404, 'Wallet not found.');

        const balance = parseFloat(wallet.balance);
        if (balance < parseFloat(amount)) {
            throw createHttpError(400, `Insufficient balance. Available: ${balance}`);
        }

        // Deduct immediately to prevent double-withdrawal pending
        wallet.balance = (balance - parseFloat(amount)).toFixed(2);
        await wallet.save({ transaction: dbTxn });

        const request = await WithdrawalRequest.create(
            {
                merchant_id: merchantId,
                wallet_id: wallet.id,
                amount,
                status: 'PENDING',
            },
            { transaction: dbTxn }
        );

        await dbTxn.commit();
        logger.info(`Withdrawal requested — merchant: ${merchantId}, amount: ${amount}`);
        return request;
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

/**
 * Admin approves a withdrawal request.
 * Records a WITHDRAWAL transaction.
 *
 * @param {string} requestId
 * @param {string} adminId
 */
async function approveWithdrawal(requestId, adminId) {
    const dbTxn = await sequelize.transaction();
    try {
        const request = await WithdrawalRequest.findByPk(requestId, { transaction: dbTxn, lock: true });
        if (!request) throw createHttpError(404, 'Withdrawal request not found.');
        if (request.status !== 'PENDING') {
            throw createHttpError(400, `Request already ${request.status}.`);
        }

        request.status = 'APPROVED';
        request.processed_by = adminId;
        request.processed_at = new Date();
        await request.save({ transaction: dbTxn });

        // Record the WITHDRAWAL transaction
        await Transaction.create(
            {
                sender_wallet_id: request.wallet_id,
                receiver_wallet_id: null,
                amount: request.amount,
                transaction_type: 'WITHDRAWAL',
                status: 'COMPLETED',
                reference_code: generateReferenceCode(),
                description: `Withdrawal approved by admin`,
            },
            { transaction: dbTxn }
        );

        await dbTxn.commit();
        return request;
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

/**
 * Admin rejects a withdrawal — refunds balance to merchant wallet.
 *
 * @param {string} requestId
 * @param {string} adminId
 * @param {string} [reason]
 */
async function rejectWithdrawal(requestId, adminId, reason) {
    const dbTxn = await sequelize.transaction();
    try {
        const request = await WithdrawalRequest.findByPk(requestId, { transaction: dbTxn, lock: true });
        if (!request) throw createHttpError(404, 'Withdrawal request not found.');
        if (request.status !== 'PENDING') {
            throw createHttpError(400, `Request already ${request.status}.`);
        }

        // Refund the previously deducted balance
        const wallet = await Wallet.findByPk(request.wallet_id, { transaction: dbTxn, lock: true });
        wallet.balance = (parseFloat(wallet.balance) + parseFloat(request.amount)).toFixed(2);
        await wallet.save({ transaction: dbTxn });

        request.status = 'REJECTED';
        request.processed_by = adminId;
        request.processed_at = new Date();
        request.rejection_reason = reason || null;
        await request.save({ transaction: dbTxn });

        await dbTxn.commit();
        return request;
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

/**
 * List withdrawal requests (admin).
 * @param {string} [status] - filter
 */
async function listWithdrawalRequests({ page = 1, limit = 20, status }) {
    const offset = (page - 1) * limit;
    const where = status ? { status } : {};

    const { count, rows } = await WithdrawalRequest.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
            {
                model: User,
                as: 'merchant',
                attributes: ['id', 'first_name', 'last_name', 'email', 'business_name'],
            },
        ],
    });

    return { total: count, page, limit, totalPages: Math.ceil(count / limit), requests: rows };
}

/**
 * Merchant's own withdrawal requests.
 */
async function getMerchantWithdrawals(merchantId) {
    return WithdrawalRequest.findAll({
        where: { merchant_id: merchantId },
        order: [['createdAt', 'DESC']],
    });
}

module.exports = {
    requestWithdrawal,
    approveWithdrawal,
    rejectWithdrawal,
    listWithdrawalRequests,
    getMerchantWithdrawals,
};
