'use strict';

const adminService = require('../services/admin.service');
const transactionService = require('../services/transaction.service');
const withdrawalService = require('../services/withdrawal.service');
const walletService = require('../services/wallet.service');
const { sendSuccess } = require('../utils/response.util');

// ─── User Management ──────────────────────────────────────────────────────────

/** GET /api/v1/admin/users */
async function getAllUsers(req, res, next) {
    try {
        const { page, limit, role, status } = req.query;
        const result = await adminService.getAllUsers({
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 50,
            role,
            status,
        });
        return sendSuccess(res, { message: 'Users retrieved.', data: result.users, meta: result });
    } catch (err) {
        next(err);
    }
}

/** GET /api/v1/admin/users/pending */
async function getPendingUsers(req, res, next) {
    try {
        const users = await adminService.getPendingUsers();
        return sendSuccess(res, { message: 'Pending users retrieved.', data: users });
    } catch (err) {
        next(err);
    }
}

/** PATCH /api/v1/admin/users/:userId/approve */
async function approveUser(req, res, next) {
    try {
        const user = await adminService.approveUser(req.params.userId, req.user.id);
        return sendSuccess(res, { message: 'User approved.', data: user });
    } catch (err) {
        next(err);
    }
}

/** PATCH /api/v1/admin/users/:userId/reject */
async function rejectUser(req, res, next) {
    try {
        const user = await adminService.rejectUser(req.params.userId, req.user.id, req.body.reason);
        return sendSuccess(res, { message: 'User rejected.', data: user });
    } catch (err) {
        next(err);
    }
}

/** PATCH /api/v1/admin/users/:userId/suspend */
async function suspendUser(req, res, next) {
    try {
        const user = await adminService.suspendUser(req.params.userId, req.user.id, req.body.reason);
        return sendSuccess(res, { message: 'User suspended.', data: user });
    } catch (err) {
        next(err);
    }
}

/** PATCH /api/v1/admin/users/:userId/reactivate */
async function reactivateUser(req, res, next) {
    try {
        const user = await adminService.reactivateUser(req.params.userId, req.user.id);
        return sendSuccess(res, { message: 'User reactivated.', data: user });
    } catch (err) {
        next(err);
    }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/** GET /api/v1/admin/transactions */
async function getAllTransactions(req, res, next) {
    try {
        const { page, limit, type, status } = req.query;
        const result = await transactionService.getAllTransactions({
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 50,
            type,
            status,
        });
        return sendSuccess(res, { message: 'Transactions retrieved.', data: result.transactions, meta: result });
    } catch (err) {
        next(err);
    }
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────

/** GET /api/v1/admin/withdrawals */
async function listWithdrawals(req, res, next) {
    try {
        const { page, limit, status } = req.query;
        const result = await withdrawalService.listWithdrawalRequests({
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 20,
            status,
        });
        return sendSuccess(res, { message: 'Withdrawal requests retrieved.', data: result.requests, meta: result });
    } catch (err) {
        next(err);
    }
}

/** PATCH /api/v1/admin/withdrawals/:requestId/approve */
async function approveWithdrawal(req, res, next) {
    try {
        const result = await withdrawalService.approveWithdrawal(req.params.requestId, req.user.id);
        return sendSuccess(res, { message: 'Withdrawal approved.', data: result });
    } catch (err) {
        next(err);
    }
}

/** PATCH /api/v1/admin/withdrawals/:requestId/reject */
async function rejectWithdrawal(req, res, next) {
    try {
        const result = await withdrawalService.rejectWithdrawal(
            req.params.requestId,
            req.user.id,
            req.body.reason
        );
        return sendSuccess(res, { message: 'Withdrawal rejected and balance refunded.', data: result });
    } catch (err) {
        next(err);
    }
}

// ─── Top-up (Admin credits a user wallet) ─────────────────────────────────────

/** POST /api/v1/admin/users/:userId/topup */
async function adminTopUp(req, res, next) {
    try {
        const { amount, description } = req.body;
        const txn = await walletService.topUpWallet({
            userId: req.params.userId,
            amount: parseFloat(amount),
            description: description || `Admin top-up by ${req.user.email}`,
        });
        return sendSuccess(res, { statusCode: 201, message: 'Wallet topped up.', data: txn });
    } catch (err) {
        next(err);
    }
}

// ─── Fraud Flags ──────────────────────────────────────────────────────────────

/** GET /api/v1/admin/fraud-flags */
async function getFraudFlags(req, res, next) {
    try {
        const { page, limit, reviewed } = req.query;
        const result = await adminService.getFraudFlags({
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 20,
            reviewed: reviewed !== undefined ? reviewed === 'true' : undefined,
        });
        return sendSuccess(res, { message: 'Fraud flags retrieved.', data: result.fraudFlags, meta: result });
    } catch (err) {
        next(err);
    }
}

/** PATCH /api/v1/admin/fraud-flags/:flagId/review */
async function reviewFraudFlag(req, res, next) {
    try {
        const flag = await adminService.reviewFraudFlag(req.params.flagId, req.user.id);
        return sendSuccess(res, { message: 'Fraud flag marked as reviewed.', data: flag });
    } catch (err) {
        next(err);
    }
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

/** GET /api/v1/admin/stats */
async function getDashboardStats(req, res, next) {
    try {
        const stats = await adminService.getDashboardStats();
        return sendSuccess(res, { message: 'Dashboard stats retrieved.', data: stats });
    } catch (err) {
        next(err);
    }
}

/** GET /api/v1/admin/revenue */
async function getPlatformRevenue(req, res, next) {
    try {
        const { startDate, endDate } = req.query;
        const data = await adminService.getPlatformRevenue({ startDate, endDate });
        return sendSuccess(res, { message: 'Platform revenue retrieved.', data });
    } catch (err) {
        next(err);
    }
}

// ─── Admin Logs ───────────────────────────────────────────────────────────────

/** GET /api/v1/admin/logs */
async function getAdminLogs(req, res, next) {
    try {
        const { page, limit } = req.query;
        const result = await adminService.getAdminLogs({
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 50,
        });
        return sendSuccess(res, { message: 'Admin logs retrieved.', data: result.logs, meta: result });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getAllUsers,
    getPendingUsers,
    approveUser,
    rejectUser,
    suspendUser,
    reactivateUser,
    getAllTransactions,
    listWithdrawals,
    approveWithdrawal,
    rejectWithdrawal,
    adminTopUp,
    getFraudFlags,
    reviewFraudFlag,
    getAdminLogs,
    getDashboardStats,
    getPlatformRevenue,
};
