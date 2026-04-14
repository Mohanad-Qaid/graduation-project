'use strict';

const { Transaction, Wallet, sequelize } = require('../models');
const { Op } = require('sequelize');
const { createHttpError } = require('../middlewares/errorHandler.middleware');

/**
 * Get transaction history for a wallet (paginated).
 * Returns both sent and received transactions.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.type]    - filter by transaction_type
 * @param {string} [params.status]  - filter by status
 */
async function getTransactionHistory({ userId, page = 1, limit = 20, type, status }) {
    const wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) throw createHttpError(404, 'Wallet not found.');

    const offset = (page - 1) * limit;

    const where = {
        [Op.or]: [
            { sender_wallet_id: wallet.id },
            { receiver_wallet_id: wallet.id },
        ],
    };
    if (type) where.transaction_type = type;
    if (status) where.status = status;

    const { count, rows } = await Transaction.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        attributes: [
            'id', 'sender_wallet_id', 'receiver_wallet_id',
            'amount', 'transaction_type', 'status',
            'reference_code', 'description', 'createdAt',
        ],
    });

    return {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        transactions: rows,
    };
}

/**
 * Get monthly expense summary for a customer (grouped by month, outgoing only).
 * @param {string} userId
 * @param {number} [year]  - defaults to current year
 */
async function getExpenseSummary(userId, year) {
    const wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) throw createHttpError(404, 'Wallet not found.');

    const targetYear = year || new Date().getFullYear();

    const results = await Transaction.findAll({
        where: {
            sender_wallet_id: wallet.id,
            status: 'COMPLETED',
            transaction_type: 'PAYMENT',
            createdAt: {
                [Op.between]: [
                    new Date(`${targetYear}-01-01`),
                    new Date(`${targetYear}-12-31T23:59:59`),
                ],
            },
        },
        attributes: [
            [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'month'],
            [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'ASC']],
        raw: true,
    });

    return results;
}

/**
 * Get all transactions (admin view, paginated).
 */
async function getAllTransactions({ page = 1, limit = 50, type, status }) {
    const offset = (page - 1) * limit;
    const where = {};
    if (type) where.transaction_type = type;
    if (status) where.status = status;

    const { count, rows } = await Transaction.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
    });

    return {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        transactions: rows,
    };
}

module.exports = { getTransactionHistory, getExpenseSummary, getAllTransactions };
