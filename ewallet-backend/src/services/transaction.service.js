'use strict';

const { Transaction, Wallet, User, FraudFlag, sequelize } = require('../models');
const { Op } = require('sequelize');
const { createHttpError } = require('../middlewares/errorHandler.middleware');

/**
 * Get transaction history for a wallet (paginated).
 * Returns both sent and received transactions.
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
            'reference_code', 'description', 'category', 'createdAt',
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
 * Get expense summary for a customer, grouped by period.
 * Returns totals, daily spending trend, and category breakdown.
 *
 * @param {string} userId
 * @param {string} period - 'week' | 'month' | 'year'
 */
async function getExpenseSummary(userId, period = 'month') {
    const wallet = await Wallet.findOne({ where: { user_id: userId } });
    if (!wallet) throw createHttpError(404, 'Wallet not found.');

    // ── Date range by period ───────────────────────────────────────────────
    const now = new Date();
    let startDate;
    if (period === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    } else if (period === 'year') {
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
    } else {
        // default: month
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
    }

    const dateRange = { [Op.between]: [startDate, now] };

    // ── Totals ─────────────────────────────────────────────────────────────
    const outgoingPayments = await Transaction.findAll({
        where: {
            sender_wallet_id: wallet.id,
            transaction_type: 'PAYMENT',
            status: 'COMPLETED',
            createdAt: dateRange,
        },
        attributes: [
            [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        raw: true,
    });

    const topups = await Transaction.findAll({
        where: {
            receiver_wallet_id: wallet.id,
            transaction_type: 'TOPUP',
            status: 'COMPLETED',
            createdAt: dateRange,
        },
        attributes: [
            [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        ],
        raw: true,
    });

    const spent = Number(outgoingPayments[0]?.total || 0);
    const topupTotal = Number(topups[0]?.total || 0);
    const transactionCount = Number(outgoingPayments[0]?.count || 0);

    // ── Daily Spending Trend (outgoing PAYMENTs grouped by day) ───────────
    const dailyRows = await Transaction.findAll({
        where: {
            sender_wallet_id: wallet.id,
            transaction_type: 'PAYMENT',
            status: 'COMPLETED',
            createdAt: dateRange,
        },
        attributes: [
            [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
            [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        ],
        group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
        raw: true,
    });

    const dailySpending = dailyRows.map((row) => ({
        date: row.date,
        total: Number(row.total || 0),
    }));

    // ── Category Breakdown ─────────────────────────────────────────────────
    const categoryRows = await Transaction.findAll({
        where: {
            sender_wallet_id: wallet.id,
            transaction_type: 'PAYMENT',
            status: 'COMPLETED',
            createdAt: dateRange,
            category: { [Op.not]: null },
        },
        attributes: [
            'category',
            [sequelize.fn('SUM', sequelize.col('amount')), 'total'],
        ],
        group: ['category'],
        order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
        raw: true,
    });

    const categoryBreakdown = categoryRows.map((row) => ({
        label: row.category,
        value: Number(row.total || 0),
    }));

    return {
        totals: {
            spent: Number(spent.toFixed(2)),
            topup: Number(topupTotal.toFixed(2)),
            transactionCount,
        },
        dailySpending,
        categoryBreakdown,
    };
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
        include: [
            {
                model: Wallet,
                as: 'senderWallet',
                attributes: ['id'],
                required: false,
                include: [
                    {
                        model: User,
                        as: 'owner',
                        attributes: ['id', 'first_name', 'last_name', 'email'],
                    },
                ],
            },
            {
                model: Wallet,
                as: 'receiverWallet',
                attributes: ['id'],
                required: false,
                include: [
                    {
                        model: User,
                        as: 'owner',
                        attributes: ['id', 'first_name', 'last_name', 'email'],
                    },
                ],
            },
            {
                model: FraudFlag,
                as: 'fraudFlags',
                attributes: ['id', 'risk_score'],
                required: false,
            },
        ],
        distinct: true,
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
