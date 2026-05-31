'use strict';

const { Op, fn, col } = require('sequelize');
const { FraudFlag, Transaction, User, Wallet } = require('../models');
const redisClient = require('../config/redis');
const { getGeoLocation } = require('./geo.util');
const logger = require('./logger.util');
const { assessFraudWithFallback } = require('./groqFraud.util');

const FRAUD_SCORE_THRESHOLD = parseInt(process.env.FRAUD_SCORE_THRESHOLD, 10) || 70;
const LARGE_TXN_AMOUNT = parseFloat(process.env.FRAUD_LARGE_TXN_AMOUNT) || 5000;
const FRAUD_WINDOW_SECS = 3600;

// Heuristic fallback

/**
 * Rule-based scoring used when the Groq AI is unavailable.
 * @param {{ senderWalletId: string, amount: number }} params
 * @returns {Promise<{ score: number, reasons: string[] }>}
 */
async function computeHeuristicScore({ senderWalletId, amount }) {
    let score = 0;
    const reasons = [];

    if (parseFloat(amount) >= LARGE_TXN_AMOUNT) {
        score += 30;
        reasons.push(`Large transaction amount: ${amount} TRY`);
    }

    if (senderWalletId) {
        const key = `fraud:velocity:${senderWalletId}`;
        const count = await redisClient.incr(key);
        if (count === 1) await redisClient.expire(key, FRAUD_WINDOW_SECS);
        if (count > 5) {
            score += 40;
            reasons.push(`High velocity: ${count} transactions within 1 hour`);
        }
    }

    const hour = new Date().getUTCHours();
    if (hour >= 0 && hour < 5) {
        score += 30;
        reasons.push(`Unusual transaction hour (UTC ${hour}:xx)`);
    }

    return { score: Math.min(score, 100), reasons };
}


// Context builder

/**
 * Assembles the rich context object that is sent to the fraud AI.
 * Runs three background DB queries (avg value, last top-up, is new recipient).
 * These run concurrently for efficiency.
 *
 * @param {object} params
 * @returns {Promise<object>} context
 */
async function buildFraudContext({
    senderWalletId, receiverWalletId,
    amount, transactionType,
    senderBalanceBefore, transactionIp,
    senderUser,  // full User row
}) {
    //  Velocity from Redis
    const velocityKey = `fraud:velocity:${senderWalletId}`;
    const velocityCount = await redisClient.incr(velocityKey);
    if (velocityCount === 1) await redisClient.expire(velocityKey, FRAUD_WINDOW_SECS);

    // Concurrent DB queries    
    const [avgResult, lastTopUp, priorTxn, receiverWallet] = await Promise.all([

        // Average historical transaction value for the sender
        Transaction.findOne({
            where: { sender_wallet_id: senderWalletId, status: 'COMPLETED' },
            attributes: [[fn('AVG', col('amount')), 'avg']],
            raw: true,
        }),

        // Most recent top-up for this wallet (to detect "top-up then drain" scam)
        Transaction.findOne({
            where: { receiver_wallet_id: senderWalletId, transaction_type: 'TOPUP', status: 'COMPLETED' },
            order: [['createdAt', 'DESC']],
            attributes: ['createdAt'],
            raw: true,
        }),

        // Has this sender ever paid this recipient before?
        receiverWalletId ? Transaction.findOne({
            where: {
                sender_wallet_id: senderWalletId,
                receiver_wallet_id: receiverWalletId,
                status: 'COMPLETED',
            },
            attributes: ['id'],
            raw: true,
        }) : Promise.resolve(null),

        // Recipient wallet to get account age
        receiverWalletId ? Wallet.findByPk(receiverWalletId, { attributes: ['createdAt'], raw: true }) : Promise.resolve(null),
    ]);

    // Derived metrics
    const now = Date.now();

    const senderAccountAgeDays = senderUser?.createdAt
        ? Math.floor((now - new Date(senderUser.createdAt).getTime()) / 86_400_000)
        : null;

    const recipientAccountAgeDays = receiverWallet?.createdAt
        ? Math.floor((now - new Date(receiverWallet.createdAt).getTime()) / 86_400_000)
        : null;

    const historicalAvgValue = avgResult?.avg ? Math.round(parseFloat(avgResult.avg) * 100) / 100 : null;

    const minutesSinceLastTopUp = lastTopUp?.createdAt
        ? Math.round((now - new Date(lastTopUp.createdAt).getTime()) / 60_000)
        : null;

    const percentageOfBalance = senderBalanceBefore && senderBalanceBefore > 0
        ? Math.round((parseFloat(amount) / parseFloat(senderBalanceBefore)) * 100 * 10) / 10
        : null;

    const isFirstTimeTransfer = receiverWalletId ? priorTxn === null : null;

    // Geolocation (live API)
    let transactionGeo = null;
    if (transactionIp) {
        const geo = await getGeoLocation(transactionIp);
        if (geo) transactionGeo = { country: geo.country, city: geo.city };
    }

    const homeGeo = (senderUser?.registration_country || senderUser?.registration_city)
        ? { country: senderUser.registration_country, city: senderUser.registration_city }
        : null;

    const isUnusualHour = (() => { const h = new Date().getUTCHours(); return h >= 0 && h < 5; })();

    //  what is sent to the ai prompt 
    return {
        transaction: {
            type: transactionType,
            amountTRY: parseFloat(amount),
            ...(transactionGeo && { location: transactionGeo }),
        },
        sender: {
            accountAgeDays: senderAccountAgeDays,
            homeLocation: homeGeo,
            balanceBeforeTRY: senderBalanceBefore ? parseFloat(senderBalanceBefore) : null,
            percentageOfBalanceSent: percentageOfBalance,
            velocity1Hour: velocityCount,
            historicalAverageValueTRY: historicalAvgValue,
            minutesSinceLastTopUp: minutesSinceLastTopUp,
            isUnusualHour,
        },
        recipient: {
            accountAgeDays: recipientAccountAgeDays,
            isFirstTimeTransfer,
        },
    };
}

//  Main evaluation entry-point 

/**
 * Evaluate a completed transaction for fraud and persist a FraudFlag if
 * the score meets the threshold. Always fire-and-forget from the service layer.
 *
 * @param {object} params
 * @param {string} params.transactionId
 * @param {string} params.senderWalletId
 * @param {string} [params.receiverWalletId]
 * @param {number} params.amount
 * @param {string} [params.transactionType]   - 'PAYMENT' | 'TOPUP'
 * @param {number} [params.senderBalanceBefore]
 * @param {string} [params.transactionIp]     - req.ip forwarded from controller
 */
async function evaluateAndFlagTransaction({
    transactionId, senderWalletId, receiverWalletId,
    amount, transactionType = 'PAYMENT',
    senderBalanceBefore, transactionIp,
}) {
    let score, reasons, analyzedBy;

    try {
        const senderWallet = await Wallet.findByPk(senderWalletId, {
            include: [{ model: User, as: 'owner', attributes: ['id', 'createdAt', 'registration_country', 'registration_city'] }],
        });
        const senderUser = senderWallet?.owner || null;

        const aiEnabled = process.env.FRAUD_AI_ENABLED !== 'false';

        if (aiEnabled) {
            const context = await buildFraudContext({
                senderWalletId, receiverWalletId,
                amount, transactionType,
                senderBalanceBefore, transactionIp,
                senderUser,
            });

            try {
                ({ score, reasons, analyzedBy } = await assessFraudWithFallback(context));
                logger.info(`[fraud] score=${score} analyzedBy=${analyzedBy} txn=${transactionId}`);
            } catch (aiErr) {
                logger.warn(`[fraud] Groq AI failed, falling back to heuristics: ${aiErr.message}`);
                ({ score, reasons } = await computeHeuristicScore({ senderWalletId, amount }));
                analyzedBy = 'heuristic';
                logger.info(`[fraud] Heuristic fallback score=${score} txn=${transactionId}`);
            }
        } else {
            logger.info('[fraud] Groq AI disabled (FRAUD_AI_ENABLED=false) — using heuristics');
            ({ score, reasons } = await computeHeuristicScore({ senderWalletId, amount }));
            analyzedBy = 'heuristic';
        }
    } catch (err) {
        logger.error(`[fraud] Context build error for txn=${transactionId}: ${err.message}`);
        // Absolute last resort: heuristic with zero context
        score = parseFloat(amount) >= LARGE_TXN_AMOUNT ? 30 : 0;
        reasons = score > 0 ? ['Large transaction amount (context error fallback)'] : ['No risk factors detected'];
        analyzedBy = 'heuristic';
    }

    if (score >= FRAUD_SCORE_THRESHOLD) {
        await FraudFlag.create({
            transaction_id: transactionId,
            risk_score: score,
            reason: reasons.join('; '),
            analyzed_by: analyzedBy,
            reviewed: false,
        });
        logger.warn(`[fraud] Flag created: txn=${transactionId} score=${score} analyzedBy=${analyzedBy}`);
    }

    return { score, flagged: score >= FRAUD_SCORE_THRESHOLD };
}

module.exports = { evaluateAndFlagTransaction };
