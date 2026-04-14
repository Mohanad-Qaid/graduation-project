'use strict';

const { Router } = require('express');
const controller = require('../controllers/merchant.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize, requireApproved } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
    withdrawalRequestRules,
    paginationRules,
} = require('../utils/validators.util');

const router = Router();

// All merchant routes require authentication + approved status + MERCHANT role
router.use(authenticate, requireApproved, authorize('MERCHANT'));

// POST /api/v1/merchant/qr/generate  (no body required)
router.post('/qr/generate', controller.generateQR);

// GET  /api/v1/merchant/qr
router.get('/qr', controller.getQRCode);

// GET  /api/v1/merchant/wallet
router.get('/wallet', controller.getWallet);

// GET  /api/v1/merchant/transactions
router.get('/transactions', paginationRules, validate, controller.getTransactions);

// POST /api/v1/merchant/withdrawal
router.post('/withdrawal', withdrawalRequestRules, validate, controller.requestWithdrawal);

// GET  /api/v1/merchant/withdrawal
router.get('/withdrawal', controller.getWithdrawals);

module.exports = router;
