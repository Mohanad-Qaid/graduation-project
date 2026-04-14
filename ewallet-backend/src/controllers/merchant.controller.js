'use strict';

const qrService = require('../services/qr.service');
const walletService = require('../services/wallet.service');
const transactionService = require('../services/transaction.service');
const withdrawalService = require('../services/withdrawal.service');
const { sendSuccess } = require('../utils/response.util');

/**
 * POST /api/v1/merchant/qr/generate
 * Idempotent — returns existing QR if already generated.
 */
async function generateQR(req, res, next) {
    try {
        const qr = await qrService.generateQRCode(req.user.id);
        return sendSuccess(res, { statusCode: 201, message: 'QR code ready.', data: qr });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/merchant/qr
 */
async function getQRCode(req, res, next) {
    try {
        const qr = await qrService.getMerchantQRCode(req.user.id);
        return sendSuccess(res, { message: 'QR code retrieved.', data: qr });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/merchant/wallet
 */
async function getWallet(req, res, next) {
    try {
        const wallet = await walletService.getWalletByUserId(req.user.id);
        return sendSuccess(res, { message: 'Wallet retrieved.', data: wallet });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/merchant/transactions
 */
async function getTransactions(req, res, next) {
    try {
        const { page, limit, type, status } = req.query;
        const result = await transactionService.getTransactionHistory({
            userId: req.user.id,
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 20,
            type,
            status,
        });
        return sendSuccess(res, { message: 'Transactions retrieved.', data: result.transactions, meta: result });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/v1/merchant/withdrawal
 */
async function requestWithdrawal(req, res, next) {
    try {
        const { amount } = req.body;
        const request = await withdrawalService.requestWithdrawal({
            merchantId: req.user.id,
            amount: parseFloat(amount),
        });
        return sendSuccess(res, { statusCode: 201, message: 'Withdrawal request submitted.', data: request });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/merchant/withdrawal
 */
async function getWithdrawals(req, res, next) {
    try {
        const requests = await withdrawalService.getMerchantWithdrawals(req.user.id);
        return sendSuccess(res, { message: 'Withdrawal requests retrieved.', data: requests });
    } catch (err) {
        next(err);
    }
}

module.exports = { generateQR, getQRCode, getWallet, getTransactions, requestWithdrawal, getWithdrawals };
