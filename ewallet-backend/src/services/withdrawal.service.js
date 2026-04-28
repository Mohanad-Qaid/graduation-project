'use strict';

const { WithdrawalRequest, Wallet, Transaction, User, sequelize } = require('../models');
const { generateReferenceCode } = require('../utils/generateRef.util');
const { createHttpError } = require('../middlewares/errorHandler.middleware');
const logger = require('../utils/logger.util');
const { WITHDRAWAL_FEE_RATE } = require('../config/fees.config');

/**
 * Merchant submits a withdrawal request.
 * Immediately locks the gross amount in the wallet.
 * Fee is calculated and stored; only the net amount is paid out on approval.
 *
 * @param {object} params
 * @param {string} params.merchantId
 * @param {number} params.amount - gross amount requested
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

        const grossAmount = parseFloat(amount);
        const balance = parseFloat(wallet.balance);
        if (balance < grossAmount) {
            throw createHttpError(400, `Insufficient balance. Available: ${balance}`);
        }

        // Compute fee breakdown
        const feeAmount = parseFloat((grossAmount * WITHDRAWAL_FEE_RATE).toFixed(2));
        const netAmount = parseFloat((grossAmount - feeAmount).toFixed(2));

        // Deduct gross amount immediately to prevent double-withdrawal pending
        wallet.balance = (balance - grossAmount).toFixed(2);
        await wallet.save({ transaction: dbTxn });

        const request = await WithdrawalRequest.create(
            {
                merchant_id: merchantId,
                wallet_id: wallet.id,
                amount: grossAmount,
                fee_rate: WITHDRAWAL_FEE_RATE,
                fee_amount: feeAmount,
                net_amount: netAmount,
                status: 'PENDING',
            },
            { transaction: dbTxn }
        );

        await dbTxn.commit();
        logger.info(
            `Withdrawal requested — merchant: ${merchantId}, gross: ${grossAmount}, fee: ${feeAmount}, net: ${netAmount}`
        );
        return request;
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

/**
 * Admin approves a withdrawal request.
 * Records a WITHDRAWAL transaction for the NET amount (after fee).
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

        // Record the WITHDRAWAL transaction for the NET payout amount (fee retained by platform)
        const payoutAmount = request.net_amount != null
            ? parseFloat(request.net_amount)
            : parseFloat(request.amount); // fallback for legacy rows without fee fields

        await Transaction.create(
            {
                sender_wallet_id: request.wallet_id,
                receiver_wallet_id: null,
                amount: payoutAmount,
                transaction_type: 'WITHDRAWAL',
                status: 'COMPLETED',
                reference_code: generateReferenceCode(),
                description: `Withdrawal approved by admin — fee: ${request.fee_amount ?? 0} TRY retained`,
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
 * Admin rejects a withdrawal — refunds the FULL GROSS amount to merchant wallet.
 * No fee is collected on rejected withdrawals.
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

        // Refund the GROSS amount (merchant loses no fee on rejection)
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
