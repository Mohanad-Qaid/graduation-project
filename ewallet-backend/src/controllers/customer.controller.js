'use strict';

const walletService = require('../services/wallet.service');
const transactionService = require('../services/transaction.service');
const paymentService = require('../services/payment.service');
const { sendSuccess } = require('../utils/response.util');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        const { amount, description, paymentIntentId } = req.body;

        // Verify payment intent directly with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ success: false, message: 'Payment incomplete or failed.' });
        }

        if (paymentIntent.metadata.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Payment intent user mismatch.' });
        }

        const amountInCents = Math.round(parseFloat(amount) * 100);
        if (paymentIntent.amount !== amountInCents) {
            return res.status(400).json({ success: false, message: 'Amount mismatch.' });
        }

        const txn = await walletService.topUpWallet({ userId: req.user.id, amount, description, transactionIp: req.ip });
        return sendSuccess(res, { statusCode: 201, message: 'Top-up successful.', data: txn });
    } catch (err) {
        next(err);
    }
}

async function createTopUpIntent(req, res, next) {
    try {
        const { amount } = req.body;
        const amountInCents = Math.round(parseFloat(amount) * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'try',
            metadata: { userId: req.user.id },
            automatic_payment_methods: { enabled: true },
        });

        return res.status(200).json({
            statusCode: 200,
            message: 'Stripe intent created',
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            }
        });
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
            transactionIp: req.ip,
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
        const { page, limit, type, status, startDate, endDate } = req.query;
        const result = await transactionService.getTransactionHistory({
            userId: req.user.id,
            page: parseInt(page, 10) || 1,
            limit: parseInt(limit, 10) || 20,
            type,
            status,
            startDate,
            endDate,
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
        const { period } = req.query;
        const summary = await transactionService.getExpenseSummary(req.user.id, period);
        return sendSuccess(res, { message: 'Expense summary retrieved.', data: summary });
    } catch (err) {
        next(err);
    }
}

module.exports = { getWallet, topUp, createTopUpIntent, payViaQR, getTransactions, getExpenseSummary };
