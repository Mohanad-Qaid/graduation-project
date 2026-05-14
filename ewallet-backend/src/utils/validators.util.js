'use strict';

const { body, param, query } = require('express-validator');

// ─── Auth ─────────────────────────────────────────────────────────────────────

const registerRules = [
    body('first_name').trim().isLength({ min: 1, max: 50 }).withMessage('First name must be 1–50 characters.'),
    body('last_name').trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be 1–50 characters.'),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('phone')
        .trim()
        .matches(/^\+90\d{10}$/)
        .withMessage('Phone must be a valid Turkish number in the format +90XXXXXXXXXX.'),
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
    body('business_category')
        .if(body('role').equals('MERCHANT'))
        .notEmpty()
        .withMessage('Business category is required for merchants.')
        .isIn(['FOOD_AND_DRINK', 'SHOPPING', 'TRANSPORT', 'BILLS_AND_UTILITIES', 'LIFESTYLE'])
        .withMessage('Business category must be one of: FOOD_AND_DRINK, SHOPPING, TRANSPORT, BILLS_AND_UTILITIES, LIFESTYLE.'),
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
    body('paymentIntentId')
        .trim()
        .notEmpty()
        .withMessage('Payment intent ID is required.'),
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

// ─── OTP ──────────────────────────────────────────────────────────────────────

const sendOTPRules = [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('purpose')
        .isIn(['verify', 'reset'])
        .withMessage('Purpose must be "verify" or "reset".'),
];

const verifyEmailRules = [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('code')
        .trim()
        .matches(/^\d{6}$/)
        .withMessage('Code must be exactly 6 digits.'),
];

const resetPasswordRules = [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('code')
        .trim()
        .matches(/^\d{6}$/)
        .withMessage('Code must be exactly 6 digits.'),
    body('newPin')
        .matches(/^\d{6}$/)
        .withMessage('New PIN must be exactly 6 digits.'),
];

const forgotPasswordRules = [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required.'),
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
    sendOTPRules,
    verifyEmailRules,
    resetPasswordRules,
    forgotPasswordRules,
};
