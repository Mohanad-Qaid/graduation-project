'use strict';

const walletService = require('../services/wallet.service');
const transactionService = require('../services/transaction.service');
const paymentService = require('../services/payment.service');
const { sendSuccess } = require('../utils/response.util');

/**
 * GET /api/v1/customer/wallet
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
 * POST /api/v1/customer/wallet/topup
 * Admin-initiated top-up on behalf of customer, or internal flow.
 */
async function topUp(req, res, next) {
    try {
        const { amount, description } = req.body;
        const txn = await walletService.topUpWallet({ userId: req.user.id, amount, description });
        return sendSuccess(res, { statusCode: 201, message: 'Top-up successful.', data: txn });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/v1/customer/pay
 * Pay via QR code.
 */
async function payViaQR(req, res, next) {
    try {
        const { merchantId, amount } = req.body;
        const txn = await paymentService.processQRPayment({
            senderUserId: req.user.id,
            merchantId,
            amount,
        });
        return sendSuccess(res, { statusCode: 201, message: 'Payment successful.', data: txn });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/v1/customer/transactions
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
 * GET /api/v1/customer/expenses/summary
 */
async function getExpenseSummary(req, res, next) {
    try {
        const { year } = req.query;
        const summary = await transactionService.getExpenseSummary(req.user.id, year ? parseInt(year, 10) : undefined);
        return sendSuccess(res, { message: 'Expense summary retrieved.', data: summary });
    } catch (err) {
        next(err);
    }
}

module.exports = { getWallet, topUp, payViaQR, getTransactions, getExpenseSummary };
