'use strict';

const { User, AdminLog, FraudFlag, Transaction, WithdrawalRequest, sequelize } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { createHttpError } = require('../middlewares/errorHandler.middleware');
const logger = require('../utils/logger.util');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Log an admin action to the audit trail.
 */
async function logAdminAction({ adminId, actionType, targetUserId, description, dbTxn }) {
    await AdminLog.create(
        { admin_id: adminId, action_type: actionType, target_user_id: targetUserId, description },
        { transaction: dbTxn }
    );
}

// ─── User Management ──────────────────────────────────────────────────────────

/**
 * List all pending users for approval.
 */
async function getPendingUsers() {
    return User.findAll({
        where: { status: 'PENDING' },
        attributes: ['id', 'first_name', 'last_name', 'business_name', 'email', 'phone', 'role', 'status', 'createdAt'],
        order: [['createdAt', 'ASC']],
    });
}

/**
 * Get all users (admin).
 */
async function getAllUsers({ page = 1, limit = 50, role, status, search }) {
    const offset = (page - 1) * limit;
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;

    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        where[Op.or] = [
            { first_name: { [Op.iLike]: term } },
            { last_name: { [Op.iLike]: term } },
            { email: { [Op.iLike]: term } },
            { phone: { [Op.iLike]: term } },
            // full-name search: concat first + last
            literal(`(first_name || ' ' || last_name) ILIKE '${search.trim().replace(/'/g, "''")}%'`),
        ];
    }

    const { count, rows } = await User.findAndCountAll({
        where,
        limit,
        offset,
        attributes: ['id', 'first_name', 'last_name', 'business_name', 'business_category', 'email', 'phone', 'role', 'status', 'email_verified', 'createdAt'],
        order: [['createdAt', 'DESC']],
    });
    return { total: count, page, limit, totalPages: Math.ceil(count / limit), users: rows };
}

/**
 * Approve a user registration.
 */
async function approveUser(targetUserId, adminId) {
    const dbTxn = await sequelize.transaction();
    try {
        const user = await User.findByPk(targetUserId, { transaction: dbTxn });
        if (!user) throw createHttpError(404, 'User not found.');
        if (user.status !== 'PENDING') {
            throw createHttpError(400, `Cannot approve user with status: ${user.status}`);
        }

        user.status = 'APPROVED';
        await user.save({ transaction: dbTxn });

        await logAdminAction({
            adminId,
            actionType: 'USER_APPROVED',
            targetUserId,
            description: `User ${user.email} approved.`,
            dbTxn,
        });

        await dbTxn.commit();
        logger.info(`Admin ${adminId} approved user ${targetUserId}`);
        return { id: user.id, email: user.email, status: user.status };
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

/**
 * Reject a user registration.
 */
async function rejectUser(targetUserId, adminId, reason) {
    const dbTxn = await sequelize.transaction();
    try {
        const user = await User.findByPk(targetUserId, { transaction: dbTxn });
        if (!user) throw createHttpError(404, 'User not found.');

        user.status = 'REJECTED';
        await user.save({ transaction: dbTxn });

        await logAdminAction({
            adminId,
            actionType: 'USER_REJECTED',
            targetUserId,
            description: `User ${user.email} rejected. Reason: ${reason || 'N/A'}`,
            dbTxn,
        });

        await dbTxn.commit();
        logger.info(`Admin ${adminId} rejected user ${targetUserId}`);
        return { id: user.id, email: user.email, status: user.status };
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

/**
 * Suspend a user.
 */
async function suspendUser(targetUserId, adminId, reason) {
    const dbTxn = await sequelize.transaction();
    try {
        const user = await User.findByPk(targetUserId, { transaction: dbTxn });
        if (!user) throw createHttpError(404, 'User not found.');
        if (user.role === 'ADMIN') throw createHttpError(403, 'Cannot suspend an admin account.');

        user.status = 'SUSPENDED';
        await user.save({ transaction: dbTxn });

        await logAdminAction({
            adminId,
            actionType: 'USER_SUSPENDED',
            targetUserId,
            description: `User ${user.email} suspended. Reason: ${reason || 'N/A'}`,
            dbTxn,
        });

        await dbTxn.commit();
        return { id: user.id, email: user.email, status: user.status };
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

/**
 * Reactivate a suspended (or rejected) user — set status back to APPROVED.
 */
async function reactivateUser(targetUserId, adminId) {
    const dbTxn = await sequelize.transaction();
    try {
        const user = await User.findByPk(targetUserId, { transaction: dbTxn });
        if (!user) throw createHttpError(404, 'User not found.');
        if (user.role === 'ADMIN') throw createHttpError(403, 'Cannot modify an admin account.');
        if (user.status === 'APPROVED') throw createHttpError(400, 'User is already active.');

        user.status = 'APPROVED';
        await user.save({ transaction: dbTxn });

        await logAdminAction({
            adminId,
            actionType: 'USER_REACTIVATED',
            targetUserId,
            description: `User ${user.email} reactivated by admin.`,
            dbTxn,
        });

        await dbTxn.commit();
        logger.info(`Admin ${adminId} reactivated user ${targetUserId}`);
        return { id: user.id, email: user.email, status: user.status };
    } catch (err) {
        await dbTxn.rollback();
        throw err;
    }
}

// ─── Fraud Management ─────────────────────────────────────────────────────────

/**
 * Get unreviewed fraud flags.
 */
async function getFraudFlags({ page = 1, limit = 20, reviewed }) {
    const offset = (page - 1) * limit;
    const where = {};
    if (reviewed !== undefined) where.reviewed = reviewed;

    const { count, rows } = await FraudFlag.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [{
            model: Transaction,
            as: 'transaction',
            attributes: ['id', 'reference_code', 'amount', 'transaction_type', 'createdAt'],
        }],
    });
    return { total: count, page, limit, totalPages: Math.ceil(count / limit), fraudFlags: rows };
}

/**
 * Mark a fraud flag as reviewed.
 */
async function reviewFraudFlag(flagId, adminId) {
    const flag = await FraudFlag.findByPk(flagId);
    if (!flag) throw createHttpError(404, 'Fraud flag not found.');
    if (flag.reviewed) throw createHttpError(400, 'Already reviewed.');

    flag.reviewed = true;
    flag.reviewed_by = adminId;
    flag.reviewed_at = new Date();
    await flag.save();

    return flag;
}

// ─── Admin Logs ───────────────────────────────────────────────────────────────

/**
 * Get paginated admin activity logs.
 */
async function getAdminLogs({ page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    const { count, rows } = await AdminLog.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
            {
                model: User,
                as: 'admin',
                attributes: ['id', 'first_name', 'last_name', 'email'],
            },
            {
                model: User,
                as: 'targetUser',
                attributes: ['id', 'first_name', 'last_name', 'email'],
            },
        ],
    });
    return { total: count, page, limit, totalPages: Math.ceil(count / limit), logs: rows };
}

/**
 * Aggregate counts needed by the admin dashboard in a single efficient call.
 * Includes total platform revenue from approved withdrawal fees.
 */
async function getDashboardStats() {
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
    const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6);

    const [
        totalUsers,
        customerCount,
        merchantCount,
        totalTransactions,
        pendingWithdrawals,
        unreviewedFraudFlags,
        revenueResult,
        newThisWeek,
        volumeRows,
        topMerchantRows,
        revenueByMonthRows,
    ] = await Promise.all([
        // Basic counts
        User.count({ where: { role: { [Op.ne]: 'ADMIN' } } }),
        User.count({ where: { role: 'CUSTOMER' } }),
        User.count({ where: { role: 'MERCHANT' } }),
        Transaction.count(),
        WithdrawalRequest.count({ where: { status: 'PENDING' } }),
        FraudFlag.count({ where: { reviewed: false } }),

        // Total platform revenue (from withdrawal fees)
        WithdrawalRequest.findOne({
            where: { status: 'APPROVED' },
            attributes: [[fn('SUM', col('fee_amount')), 'total']],
            raw: true,
        }),

        // New users this week
        User.count({ where: { role: { [Op.ne]: 'ADMIN' }, createdAt: { [Op.gte]: sevenDaysAgo } } }),

        // Volume breakdown by type — last 7 days
        Transaction.findAll({
            where: { createdAt: { [Op.gte]: sevenDaysAgo }, status: 'COMPLETED' },
            attributes: [
                'transaction_type',
                [fn('SUM', col('amount')), 'total'],
                [fn('COUNT', col('id')), 'count'],
            ],
            group: ['transaction_type'],
            raw: true,
        }),

        // Top merchants by payment volume received this month
        sequelize.query(`
            SELECT
                u.id,
                u.first_name,
                u.last_name,
                u.business_name,
                u.business_category,
                COALESCE(SUM(t.amount), 0) AS revenue
            FROM users u
            JOIN wallets w ON w.user_id = u.id
            JOIN transactions t ON t.receiver_wallet_id = w.id
            WHERE u.role = 'MERCHANT'
              AND t.status = 'COMPLETED'
              AND t."createdAt" >= NOW() - INTERVAL '30 days'
            GROUP BY u.id, u.first_name, u.last_name, u.business_name, u.business_category
            ORDER BY revenue DESC
            LIMIT 4
        `, { type: sequelize.QueryTypes.SELECT }),

        // Revenue by month — last 6 months (for sparkline)
        sequelize.query(`
            SELECT
                TO_CHAR(DATE_TRUNC('month', processed_at), 'Mon') AS month,
                COALESCE(SUM(fee_amount), 0) AS revenue
            FROM withdrawal_requests
            WHERE status = 'APPROVED'
              AND processed_at >= :sixMonthsAgo
            GROUP BY DATE_TRUNC('month', processed_at)
            ORDER BY DATE_TRUNC('month', processed_at) ASC
        `, { replacements: { sixMonthsAgo }, type: sequelize.QueryTypes.SELECT }),
    ]);

    const totalRevenue = parseFloat(revenueResult?.total || 0);

    // Shape volume breakdown — correct enum values: TOPUP, PAYMENT, WITHDRAWAL
    const volumeMap = { PAYMENT: 0, TOPUP: 0, WITHDRAWAL: 0 };
    let volumeTotal = 0;
    for (const row of volumeRows) {
        const t = row.transaction_type;
        const v = parseFloat(row.total || 0);
        if (t === 'PAYMENT') volumeMap.PAYMENT = v;
        if (t === 'TOPUP') volumeMap.TOPUP = v;
        if (t === 'WITHDRAWAL') volumeMap.WITHDRAWAL = v;
        volumeTotal += v;
    }
    const safeTotal = volumeTotal || 1;
    const volumeBreakdown = [
        { label: 'Merchant Payments', amount: Math.round(volumeMap.PAYMENT), percent: Math.round((volumeMap.PAYMENT / safeTotal) * 100), color: '#6200EE' },
        { label: 'Customer Top-ups', amount: Math.round(volumeMap.TOPUP), percent: Math.round((volumeMap.TOPUP / safeTotal) * 100), color: '#10B981' },
        { label: 'Withdrawals', amount: Math.round(volumeMap.WITHDRAWAL), percent: Math.round((volumeMap.WITHDRAWAL / safeTotal) * 100), color: '#F59E0B' },
    ];

    // Shape top merchants — assign colors for Avatar display
    const AVATAR_COLORS = ['#6200EE', '#2196F3', '#10B981', '#F59E0B'];
    const topMerchants = topMerchantRows.map((m, i) => ({
        name: m.business_name || `${m.first_name} ${m.last_name}`,
        category: m.business_category || 'Merchant',
        revenue: `₺${parseFloat(m.revenue).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
        avatar: (m.business_name || m.first_name || '?')[0].toUpperCase(),
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    }));

    // Revenue sparkline (last 6 months values)
    const revenueSparkline = revenueByMonthRows.map(r => parseFloat(r.revenue));
    const revenueSparklineLabels = revenueByMonthRows.map(r => r.month);

    return {
        totalUsers,
        customerCount,
        merchantCount,
        totalTransactions,
        pendingWithdrawals,
        unreviewedFraudFlags,
        totalRevenue,
        newThisWeek,
        volumeBreakdown,
        volumeTotal,
        topMerchants,
        revenueSparkline,
        revenueSparklineLabels,
    };
}

// ─── Revenue Tracking ─────────────────────────────────────────────────────────

/**
 * Calculate total platform revenue from approved withdrawal fees.
 * Supports optional date-range filtering on the processed_at timestamp.
 *
 * @param {object} params
 * @param {string} [params.startDate] - ISO date string (inclusive)
 * @param {string} [params.endDate]   - ISO date string (inclusive)
 */
async function getPlatformRevenue({ startDate, endDate } = {}) {
    const where = { status: 'APPROVED' };

    if (startDate || endDate) {
        where.processed_at = {};
        if (startDate) where.processed_at[Op.gte] = new Date(startDate);
        if (endDate) {
            // Include the full end day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.processed_at[Op.lte] = end;
        }
    }

    const result = await WithdrawalRequest.findOne({
        where,
        attributes: [
            [fn('SUM', col('fee_amount')), 'totalRevenue'],
            [fn('COUNT', col('id')), 'count'],
        ],
        raw: true,
    });

    return {
        totalRevenue: parseFloat(result?.totalRevenue || 0),
        count: parseInt(result?.count || 0, 10),
        startDate: startDate || null,
        endDate: endDate || null,
    };
}

module.exports = {
    getPendingUsers,
    getAllUsers,
    approveUser,
    rejectUser,
    suspendUser,
    reactivateUser,
    getFraudFlags,
    reviewFraudFlag,
    getAdminLogs,
    getDashboardStats,
    getPlatformRevenue,
};
