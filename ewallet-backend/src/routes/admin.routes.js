'use strict';

const { Router } = require('express');
const controller = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
    userIdParamRules,
    adminTopUpRules,
    rejectReasonRules,
    paginationRules,
} = require('../utils/validators.util');

const router = Router();

// All admin routes require authentication + ADMIN role (status not checked — admins are always APPROVED)
router.use(authenticate, authorize('ADMIN'));

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
router.get('/stats', controller.getDashboardStats);

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', paginationRules, validate, controller.getAllUsers);
router.get('/users/pending', controller.getPendingUsers);
router.patch('/users/:userId/approve', userIdParamRules, validate, controller.approveUser);
router.patch('/users/:userId/reject', [...userIdParamRules, ...rejectReasonRules], validate, controller.rejectUser);
router.patch('/users/:userId/suspend', [...userIdParamRules, ...rejectReasonRules], validate, controller.suspendUser);

// ─── Top-up ───────────────────────────────────────────────────────────────────
router.post('/users/:userId/topup', adminTopUpRules, validate, controller.adminTopUp);

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get('/transactions', paginationRules, validate, controller.getAllTransactions);

// ─── Withdrawals ──────────────────────────────────────────────────────────────
router.get('/withdrawals', paginationRules, validate, controller.listWithdrawals);
router.patch('/withdrawals/:requestId/approve', controller.approveWithdrawal);
router.patch('/withdrawals/:requestId/reject', rejectReasonRules, validate, controller.rejectWithdrawal);

// ─── Fraud Flags ──────────────────────────────────────────────────────────────
router.get('/fraud-flags', paginationRules, validate, controller.getFraudFlags);
router.patch('/fraud-flags/:flagId/review', controller.reviewFraudFlag);

// ─── Admin Logs ───────────────────────────────────────────────────────────────
router.get('/logs', paginationRules, validate, controller.getAdminLogs);

module.exports = router;
