'use strict';

const { body, param, query } = require('express-validator');

// ─── Auth ─────────────────────────────────────────────────────────────────────

const registerRules = [
    body('first_name').trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1–50 characters.'),
    body('last_name').trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1–50 characters.'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('phone')
        .trim()
        .matches(/^\+?[0-9]{7,20}$/)
        .withMessage('Valid phone number required (7–20 digits, optional leading +).'),
    body('password')
        .matches(/^\d{6}$/)
        .withMessage('PIN must be exactly 6 digits.'),
    body('role').isIn(['CUSTOMER', 'MERCHANT']).withMessage('Role must be CUSTOMER or MERCHANT.'),
    body('business_name')
        .if(body('role').equals('MERCHANT'))
        .trim()
        .notEmpty()
        .withMessage('Business name is required for merchants.')
        .isLength({ max: 150 })
        .withMessage('Business name must be at most 150 characters.'),
];

const loginRules = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required.'),
    body('password').custom((value, { req }) => {
        // 1. If the request comes from the Admin Portal
        if (req.body.isAdmin) {
            if (!value || typeof value !== 'string' || value.length < 8) {
                throw new Error('Admin password must be a string of at least 8 characters.');
            }
            return true;
        }

        // 2. If the request comes from the Mobile App (Customers/Merchants)
        if (!/^\d{6}$/.test(value)) {
            throw new Error('PIN must be exactly 6 digits.');
        }
        return true;
    })
];

// ─── Wallet / Payment ─────────────────────────────────────────────────────────

const topUpRules = [
    body('amount')
        .isFloat({ gt: 0 })
        .withMessage('Amount must be a positive number.'),
    body('description').optional().trim().isLength({ max: 255 }),
];

const payQRRules = [
    body('merchantId').trim().isUUID().withMessage('Valid merchant ID (UUID) required.'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount is required and must be a positive number.'),
];

// ─── Withdrawal ───────────────────────────────────────────────────────────────

const withdrawalRequestRules = [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number.'),
];

// ─── Admin ────────────────────────────────────────────────────────────────────

const userIdParamRules = [
    param('userId').isUUID().withMessage('Valid user ID (UUID) required.'),
];

const adminTopUpRules = [
    param('userId').isUUID().withMessage('Valid user ID required.'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive.'),
    body('description').optional().trim().isLength({ max: 255 }),
];

const rejectReasonRules = [
    body('reason').optional().trim().isLength({ max: 500 }),
];

// ─── Pagination ───────────────────────────────────────────────────────────────

const paginationRules = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200.'),
];

module.exports = {
    registerRules,
    loginRules,
    topUpRules,
    payQRRules,
    withdrawalRequestRules,
    userIdParamRules,
    adminTopUpRules,
    rejectReasonRules,
    paginationRules,
};
