'use strict';

const { Router } = require('express');
const controller = require('../controllers/customer.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize, requireApproved } = require('../middlewares/role.middleware');
const { paymentRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { topUpRules, payQRRules, paginationRules } = require('../utils/validators.util');

const router = Router();

// All customer routes require authentication + approved status + CUSTOMER role
router.use(authenticate, requireApproved, authorize('CUSTOMER'));

// GET  /api/v1/customer/wallet
router.get('/wallet', controller.getWallet);

// POST /api/v1/customer/wallet/topup
router.post('/wallet/topup', topUpRules, validate, controller.topUp);

router.post('/wallet/topup/intent', controller.createTopUpIntent);

// POST /api/v1/customer/pay
router.post('/pay', paymentRateLimiter, payQRRules, validate, controller.payViaQR);

// GET  /api/v1/customer/transactions
router.get('/transactions', paginationRules, validate, controller.getTransactions);

// GET  /api/v1/customer/expenses/summary
router.get('/expenses/summary', controller.getExpenseSummary);

module.exports = router;
