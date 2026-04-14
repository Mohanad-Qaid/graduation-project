'use strict';

const { User, AdminLog, FraudFlag, sequelize } = require('../models');
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
async function getAllUsers({ page = 1, limit = 50, role, status }) {
    const offset = (page - 1) * limit;
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const { count, rows } = await User.findAndCountAll({
        where,
        limit,
        offset,
        attributes: ['id', 'first_name', 'last_name', 'business_name', 'email', 'phone', 'role', 'status', 'createdAt'],
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
    });
    return { total: count, page, limit, totalPages: Math.ceil(count / limit), flags: rows };
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
    });
    return { total: count, page, limit, totalPages: Math.ceil(count / limit), logs: rows };
}

module.exports = {
    getPendingUsers,
    getAllUsers,
    approveUser,
    rejectUser,
    suspendUser,
    getFraudFlags,
    reviewFraudFlag,
    getAdminLogs,
};
