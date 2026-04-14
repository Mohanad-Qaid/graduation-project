'use strict';

const redisClient = require('../config/redis');
const { FraudFlag, Transaction } = require('../models');
const { generateReferenceCode } = require('./generateRef.util');
const logger = require('./logger.util');

const FRAUD_SCORE_THRESHOLD = parseInt(process.env.FRAUD_SCORE_THRESHOLD, 10) || 70;
const LARGE_TXN_AMOUNT = parseFloat(process.env.FRAUD_LARGE_TXN_AMOUNT) || 5000;

// Redis TTL for temporary fraud scores (minutes → seconds)
const FRAUD_WINDOW_SECONDS = 3600; // 1 hour

/**
 * Compute a heuristic fraud risk score for a transaction.
 * Returns a score 0–100 and an array of reasons.
 *
 * Scoring factors:
 *  +30 – Large transaction (> threshold amount)
 *  +40 – High velocity: >5 transactions from same wallet in 1 hour
 *  +30 – Unusual hour (00:00–05:00 local time)
 *
 * @param {object} params
 * @param {string} params.senderWalletId
 * @param {number} params.amount
 * @returns {Promise<{ score: number, reasons: string[] }>}
 */
async function computeFraudScore({ senderWalletId, amount }) {
    let score = 0;
    const reasons = [];

    try {
        // Factor 1: Large transaction
        if (parseFloat(amount) >= LARGE_TXN_AMOUNT) {
            score += 30;
            reasons.push(`Large transaction amount: ${amount}`);
        }

        // Factor 2: High velocity — track using Redis counter
        if (senderWalletId) {
            const velocityKey = `fraud:velocity:${senderWalletId}`;
            const count = await redisClient.incr(velocityKey);
            // Set TTL only on the first increment
            if (count === 1) {
                await redisClient.expire(velocityKey, FRAUD_WINDOW_SECONDS);
            }
            if (count > 5) {
                score += 40;
                reasons.push(`High velocity: ${count} transactions within 1 hour`);
            }
        }

        // Factor 3: Unusual hour (server UTC — adjust if needed)
        const hour = new Date().getUTCHours();
        if (hour >= 0 && hour < 5) {
            score += 30;
            reasons.push(`Unusual transaction hour (UTC ${hour}:xx)`);
        }
    } catch (err) {
        // Fraud scoring should never block payment processing
        logger.error('Fraud score computation error:', err.message);
    }

    return { score: Math.min(score, 100), reasons };
}

/**
 * Evaluate a completed transaction for fraud and persist a FraudFlag if
 * the score meets the threshold.
 *
 * @param {object} params
 * @param {string} params.transactionId
 * @param {string} params.senderWalletId
 * @param {number} params.amount
 * @param {object} [params.dbTransaction]  - Sequelize transaction instance (optional)
 */
async function evaluateAndFlagTransaction({ transactionId, senderWalletId, amount, dbTransaction }) {
    const { score, reasons } = await computeFraudScore({ senderWalletId, amount });

    if (score >= FRAUD_SCORE_THRESHOLD) {
        await FraudFlag.create(
            {
                transaction_id: transactionId,
                risk_score: score,
                reason: reasons.join('; '),
                reviewed: false,
            },
            { transaction: dbTransaction }
        );
        logger.warn(`Fraud flag created for transaction ${transactionId} — score: ${score}`);
    }

    return { score, flagged: score >= FRAUD_SCORE_THRESHOLD };
}

module.exports = { computeFraudScore, evaluateAndFlagTransaction };
