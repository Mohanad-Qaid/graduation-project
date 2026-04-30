'use strict';

/**
 * demoSeed.js — Full demo data generator for the e-wallet platform.
 *
 * Run with:  npm run seed:demo
 *
 * What it seeds (in dependency order):
 *   1. Users     — 1 ADMIN, ~15 MERCHANTs, ~35 CUSTOMERs
 *   2. Wallets   — one per user (one-to-one)
 *   3. QRCodes   — one per APPROVED MERCHANT (signed JWT payload)
 *   4. Transactions — TOPUPs, PAYMENTs (customer→merchant), WITHDRAWALs (merchant only)
 *   5. WithdrawalRequests — PENDING / APPROVED / REJECTED with full fee breakdown
 *   6. AdminLogs — realistic admin action trail
 *   7. FraudFlags — flagged on a subset of high-risk PAYMENT transactions
 *
 * Every entity is linked correctly so foreign-key constraints are never violated.
 */

const {
    sequelize,
    User,
    Wallet,
    Transaction,
    QRCode,
    WithdrawalRequest,
    AdminLog,
    FraudFlag,
} = require('../models');

const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { WITHDRAWAL_FEE_RATE } = require('../config/fees.config');

// ─── Constants ─────────────────────────────────────────────────────────────
const TURKISH_BANKS = [
    'Ziraat Bankası',
    'Garanti BBVA',
    'İş Bankası',
    'Yapı Kredi',
    'Halkbank',
    'Vakıfbank',
    'Akbank',
    'Denizbank',
    'QNB Finansbank',
    'TEB',
];

const BUSINESS_CATEGORIES = [
    'Food & Drink',
    'Shopping',
    'Transport',
    'Bills & Utilities',
    'Lifestyle',
];

const TOPUP_DESCRIPTIONS = [
    'Wallet Top-up via Credit Card',
    'Account Funding',
    'Deposit via Bank Transfer',
    'Cash Top-up',
    'Online Deposit',
];

const WITHDRAWAL_DESCRIPTIONS = [
    'Bank Withdrawal',
    'Transfer to Bank Account',
    'Revenue Payout',
];

const FRAUD_REASONS = [
    'Unusual transaction amount compared to user history',
    'High-frequency transactions in short time window',
    'Impossible travel — IP location differs from registration country',
    'Transaction from new device or unusual location',
    'Multiple failed attempts before success',
    'Suspicious round-number amount pattern',
];

const ADMIN_ACTIONS = [
    'USER_APPROVED',
    'USER_REJECTED',
    'USER_SUSPENDED',
    'WITHDRAWAL_APPROVED',
    'WITHDRAWAL_REJECTED',
];

const TR_CITIES    = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya'];
const QR_JWT_SECRET = process.env.JWT_SECRET || 'demo-qr-secret';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Generate a realistic Turkish IBAN: TR + 24 digits (26 chars) */
function genIBAN(faker) {
    return 'TR' + faker.string.numeric(24);
}

/** Generate a reference code in the format TXN-<8 alphanum> */
function genRefCode(faker) {
    return 'TXN-' + faker.string.alphanumeric(12).toUpperCase();
}

/** Return a date between `start` and `end` */
function randBetween(faker, start, end) {
    return faker.date.between({ from: start, to: end });
}

/** Pick a random element from an array */
function pick(faker, arr) {
    return faker.helpers.arrayElement(arr);
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function runSeeder() {
    const { faker } = await import('@faker-js/faker');

    console.log('🌱  Starting demo data generation...');

    let dbTxn;
    try {
        await sequelize.authenticate();
        console.log('✅  Connected to database.');

        dbTxn = await sequelize.transaction();

        // ──────────────────────────────────────────────────────────────────
        // 1. USERS
        // ──────────────────────────────────────────────────────────────────
        console.log('\n🔄  Seeding Users…');

        const passwordHash = await bcrypt.hash('123456', 10);
        const NOW          = new Date();
        const usersPayload = [];

        // --- 1a. Resolve the existing ADMIN (created by adminSeed.js / npm run seed) ---
        //         The demo seeder does NOT create its own admin to avoid duplicate-key
        //         errors on email / phone. Run `npm run seed` first.
        const existingAdmin = await User.findOne({ where: { role: 'ADMIN' } });
        if (!existingAdmin) {
            throw new Error(
                'No ADMIN user found. Please run `npm run seed` first to create the admin account.'
            );
        }
        const adminId = existingAdmin.id;
        console.log(`ℹ️   Using existing admin: ${existingAdmin.email} (${adminId})`);

        // --- 1b. 15 MERCHANTs ---
        const merchantIds = [];
        for (let i = 0; i < 15; i++) {
            const id       = uuidv4();
            const city     = pick(faker, TR_CITIES);
            const status   = pick(faker, ['APPROVED', 'APPROVED', 'APPROVED', 'PENDING', 'REJECTED']);
            merchantIds.push(id);
            usersPayload.push({
                id,
                first_name:          faker.person.firstName(),
                last_name:           faker.person.lastName(),
                business_name:       faker.company.name(),
                business_category:   pick(faker, BUSINESS_CATEGORIES),
                email:               `merchant${i + 1}@${faker.internet.domainName()}`.toLowerCase(),
                phone:               '+905' + faker.string.numeric(9),
                password_hash:       passwordHash,
                role:                'MERCHANT',
                status,
                registration_country:'TR',
                registration_city:   city,
                last_login_ip:       null,
                createdAt:           faker.date.past({ years: 1 }),
                updatedAt:           NOW,
            });
        }

        // --- 1c. 35 CUSTOMERs ---
        const customerIds = [];
        for (let i = 0; i < 35; i++) {
            const id     = uuidv4();
            const city   = pick(faker, TR_CITIES);
            const status = pick(faker, ['APPROVED', 'APPROVED', 'APPROVED', 'PENDING']);
            customerIds.push(id);
            usersPayload.push({
                id,
                first_name:          faker.person.firstName(),
                last_name:           faker.person.lastName(),
                business_name:       null,
                business_category:   null,
                email:               `customer${i + 1}@${faker.internet.domainName()}`.toLowerCase(),
                phone:               '+905' + faker.string.numeric(9),
                password_hash:       passwordHash,
                role:                'CUSTOMER',
                status,
                registration_country:'TR',
                registration_city:   city,
                last_login_ip:       null,
                createdAt:           faker.date.past({ years: 1 }),
                updatedAt:           NOW,
            });
        }

        const createdUsers = await User.bulkCreate(usersPayload, {
            transaction: dbTxn,
            returning:   true,
        });
        const userMap = Object.fromEntries(createdUsers.map(u => [u.id, u]));
        console.log(`✅  Created ${createdUsers.length} users.`);

        // ──────────────────────────────────────────────────────────────────
        // 2. WALLETS  (one per user)
        // ──────────────────────────────────────────────────────────────────
        console.log('\n🔄  Seeding Wallets…');

        const walletsPayload = createdUsers.map(user => ({
            id:        uuidv4(),
            user_id:   user.id,
            // Merchants tend to have higher balances (sales accumulate)
            balance:   user.role === 'MERCHANT'
                ? faker.finance.amount({ min: 200,  max: 5000, dec: 2 })
                : faker.finance.amount({ min: 10,   max: 1500, dec: 2 }),
            currency:  'TRY',
            createdAt: user.createdAt,
            updatedAt: NOW,
        }));

        const createdWallets = await Wallet.bulkCreate(walletsPayload, {
            transaction: dbTxn,
            returning:   true,
        });

        // Build lookup maps
        const walletMap      = Object.fromEntries(createdWallets.map(w => [w.id, w]));
        const userWalletMap  = Object.fromEntries(createdWallets.map(w => [w.user_id, w]));
        // walletId → owning User
        const walletOwnerMap = Object.fromEntries(createdWallets.map(w => [w.id, userMap[w.user_id]]));

        const approvedMerchantWallets = createdWallets.filter(w => {
            const owner = walletOwnerMap[w.id];
            return owner && owner.role === 'MERCHANT' && owner.status === 'APPROVED';
        });

        const customerWallets = createdWallets.filter(w => {
            const owner = walletOwnerMap[w.id];
            return owner && owner.role === 'CUSTOMER';
        });

        console.log(`✅  Created ${createdWallets.length} wallets.`);

        // ──────────────────────────────────────────────────────────────────
        // 3. QR CODES  (one per APPROVED MERCHANT)
        // ──────────────────────────────────────────────────────────────────
        console.log('\n🔄  Seeding QR Codes for approved merchants…');

        const qrPayload = approvedMerchantWallets.map(wallet => {
            const merchant = walletOwnerMap[wallet.id];
            // Mimics what qr.service.js would sign
            const payload = jwt.sign(
                {
                    merchantId:   merchant.id,
                    walletId:     wallet.id,
                    merchantName: merchant.business_name,
                },
                QR_JWT_SECRET,
                { expiresIn: '365d' }
            );
            return {
                id:          uuidv4(),
                merchant_id: merchant.id,
                wallet_id:   wallet.id,
                payload,
                is_active:   true,
                createdAt:   merchant.createdAt,
                updatedAt:   NOW,
            };
        });

        const createdQRs = await QRCode.bulkCreate(qrPayload, {
            transaction: dbTxn,
            returning:   true,
        });
        console.log(`✅  Created ${createdQRs.length} QR codes.`);

        // ──────────────────────────────────────────────────────────────────
        // 4. TRANSACTIONS
        // ──────────────────────────────────────────────────────────────────
        console.log('\n🔄  Seeding Transactions…');

        const txnPayload     = [];
        const usedRefCodes   = new Set();

        function uniqueRef() {
            let code;
            do { code = genRefCode(faker); } while (usedRefCodes.has(code));
            usedRefCodes.add(code);
            return code;
        }

        // ── 4a. TOPUPs: any wallet receives money (no sender) ──
        for (let i = 0; i < 40; i++) {
            const receiverWallet = pick(faker, createdWallets);
            const owner          = walletOwnerMap[receiverWallet.id];
            const createdAt      = randBetween(faker, owner.createdAt, NOW);
            txnPayload.push({
                id:                  uuidv4(),
                sender_wallet_id:    null,
                receiver_wallet_id:  receiverWallet.id,
                amount:              faker.finance.amount({ min: 50, max: 1000, dec: 2 }),
                transaction_type:    'TOPUP',
                status:              pick(faker, ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED']),
                reference_code:      uniqueRef(),
                description:         pick(faker, TOPUP_DESCRIPTIONS),
                category:            null,
                createdAt,
                updatedAt:           NOW,
            });
        }

        // ── 4b. PAYMENTs: customer → approved merchant ──
        for (let i = 0; i < 50; i++) {
            if (customerWallets.length === 0 || approvedMerchantWallets.length === 0) break;

            const senderWallet   = pick(faker, customerWallets);
            let   receiverWallet = pick(faker, approvedMerchantWallets);
            // Prevent self-payment (unlikely but safe)
            let attempts = 0;
            while (receiverWallet.id === senderWallet.id && attempts++ < 10) {
                receiverWallet = pick(faker, approvedMerchantWallets);
            }

            const merchantOwner = walletOwnerMap[receiverWallet.id];
            const category      = merchantOwner?.business_category
                                    || pick(faker, BUSINESS_CATEGORIES);
            const createdAt     = randBetween(faker, walletOwnerMap[senderWallet.id].createdAt, NOW);

            txnPayload.push({
                id:                  uuidv4(),
                sender_wallet_id:    senderWallet.id,
                receiver_wallet_id:  receiverWallet.id,
                amount:              faker.finance.amount({ min: 5, max: 350, dec: 2 }),
                transaction_type:    'PAYMENT',
                status:              pick(faker, ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'FAILED']),
                reference_code:      uniqueRef(),
                description:         `Payment for ${category}`,
                category,
                createdAt,
                updatedAt:           NOW,
            });
        }

        // ── 4c. WITHDRAWALs: merchant wallet loses funds (no receiver) ──
        for (let i = 0; i < 20; i++) {
            if (approvedMerchantWallets.length === 0) break;
            const senderWallet = pick(faker, approvedMerchantWallets);
            const owner        = walletOwnerMap[senderWallet.id];
            const createdAt    = randBetween(faker, owner.createdAt, NOW);
            txnPayload.push({
                id:                  uuidv4(),
                sender_wallet_id:    senderWallet.id,
                receiver_wallet_id:  null,
                amount:              faker.finance.amount({ min: 20, max: 800, dec: 2 }),
                transaction_type:    'WITHDRAWAL',
                status:              pick(faker, ['COMPLETED', 'COMPLETED', 'PENDING']),
                reference_code:      uniqueRef(),
                description:         pick(faker, WITHDRAWAL_DESCRIPTIONS),
                category:            null,
                createdAt,
                updatedAt:           NOW,
            });
        }

        const createdTxns = await Transaction.bulkCreate(txnPayload, {
            transaction: dbTxn,
            returning:   true,
        });
        console.log(`✅  Created ${createdTxns.length} transactions (40 TOPUPs, 50 PAYMENTs, 20 WITHDRAWALs).`);

        // ──────────────────────────────────────────────────────────────────
        // 5. WITHDRAWAL REQUESTS
        //    For every MERCHANT (any status) — mix of PENDING/APPROVED/REJECTED
        // ──────────────────────────────────────────────────────────────────
        console.log('\n🔄  Seeding Withdrawal Requests…');

        const allMerchants     = createdUsers.filter(u => u.role === 'MERCHANT');
        const withdrawalPayload = [];

        for (const merchant of allMerchants) {
            const wallet   = userWalletMap[merchant.id];
            if (!wallet) continue;

            // Each merchant gets 1–4 withdrawal requests
            const count = faker.number.int({ min: 1, max: 4 });
            for (let i = 0; i < count; i++) {
                const grossAmount   = parseFloat(
                    faker.finance.amount({ min: 50, max: 2000, dec: 2 })
                );
                const feeAmount     = parseFloat((grossAmount * WITHDRAWAL_FEE_RATE).toFixed(2));
                const netAmount     = parseFloat((grossAmount - feeAmount).toFixed(2));
                const bankName      = pick(faker, TURKISH_BANKS);
                const status        = pick(faker, ['PENDING', 'PENDING', 'APPROVED', 'REJECTED']);
                const createdAt     = randBetween(faker, merchant.createdAt, NOW);

                // Only APPROVED / REJECTED have admin processing info
                let processedBy   = null;
                let processedAt   = null;
                let rejectionReason = null;

                if (status === 'APPROVED' || status === 'REJECTED') {
                    processedBy = adminId;
                    processedAt = randBetween(faker, createdAt, NOW);
                }
                if (status === 'REJECTED') {
                    rejectionReason = pick(faker, [
                        'Insufficient documentation provided.',
                        'IBAN validation failed — please re-submit.',
                        'Account under review for compliance.',
                        'Requested amount exceeds available balance.',
                        'Duplicate withdrawal request detected.',
                    ]);
                }

                withdrawalPayload.push({
                    id:                  uuidv4(),
                    merchant_id:         merchant.id,
                    wallet_id:           wallet.id,
                    amount:              grossAmount,
                    bank_name:           bankName,
                    bank_account:        genIBAN(faker),
                    bank_account_name:   `${merchant.first_name} ${merchant.last_name}`,
                    fee_amount:          feeAmount,
                    net_amount:          netAmount,
                    status,
                    processed_by:        processedBy,
                    processed_at:        processedAt,
                    rejection_reason:    rejectionReason,
                    createdAt,
                    updatedAt:           NOW,
                });
            }
        }

        const createdWithdrawals = await WithdrawalRequest.bulkCreate(withdrawalPayload, {
            transaction: dbTxn,
            returning:   true,
        });
        console.log(`✅  Created ${createdWithdrawals.length} withdrawal requests.`);

        // ──────────────────────────────────────────────────────────────────
        // 6. ADMIN LOGS
        // ──────────────────────────────────────────────────────────────────
        console.log('\n🔄  Seeding Admin Logs…');

        const adminLogPayload = [];

        // Log for every approved/rejected user
        for (const user of createdUsers) {
            if (user.role === 'ADMIN') continue;
            if (user.status === 'PENDING') continue; // No action taken yet

            const actionType  = user.status === 'APPROVED' ? 'USER_APPROVED'
                              : user.status === 'REJECTED'  ? 'USER_REJECTED'
                              : 'USER_SUSPENDED';

            adminLogPayload.push({
                id:             uuidv4(),
                admin_id:       adminId,
                action_type:    actionType,
                target_user_id: user.id,
                description:    `${actionType.replace('_', ' ')} for user ${user.email}`,
                createdAt:      randBetween(faker, user.createdAt, NOW),
                updatedAt:      NOW,
            });
        }

        // Log for every processed withdrawal request
        for (const wr of createdWithdrawals) {
            if (wr.status === 'PENDING') continue;

            const actionType = wr.status === 'APPROVED'
                ? 'WITHDRAWAL_APPROVED'
                : 'WITHDRAWAL_REJECTED';

            adminLogPayload.push({
                id:             uuidv4(),
                admin_id:       adminId,
                action_type:    actionType,
                target_user_id: wr.merchant_id,
                description:    `${actionType} — amount: ₺${wr.amount}${wr.status === 'REJECTED' ? ` | reason: ${wr.rejection_reason}` : ''}`,
                createdAt:      wr.processed_at || NOW,
                updatedAt:      NOW,
            });
        }

        const createdLogs = await AdminLog.bulkCreate(adminLogPayload, {
            transaction: dbTxn,
            returning:   true,
        });
        console.log(`✅  Created ${createdLogs.length} admin log entries.`);

        // ──────────────────────────────────────────────────────────────────
        // 7. FRAUD FLAGS
        //    Flag ~15% of PAYMENT transactions (those are the high-risk ones)
        // ──────────────────────────────────────────────────────────────────
        console.log('\n🔄  Seeding Fraud Flags…');

        const paymentTxns    = createdTxns.filter(t => t.transaction_type === 'PAYMENT');
        const flaggedTxns    = faker.helpers.arrayElements(
            paymentTxns,
            Math.ceil(paymentTxns.length * 0.20)   // flag ~20% of payments
        );

        const fraudPayload = flaggedTxns.map(txn => {
            const riskScore  = faker.number.int({ min: 45, max: 100 });
            const reviewed   = faker.datatype.boolean({ probability: 0.6 }); // 60% reviewed
            return {
                id:             uuidv4(),
                transaction_id: txn.id,
                risk_score:     riskScore,
                reason:         pick(faker, FRAUD_REASONS),
                reviewed,
                reviewed_by:    reviewed ? adminId : null,
                reviewed_at:    reviewed ? randBetween(faker, txn.createdAt, NOW) : null,
                createdAt:      txn.createdAt,
                updatedAt:      NOW,
            };
        });

        const createdFlags = await FraudFlag.bulkCreate(fraudPayload, {
            transaction: dbTxn,
            returning:   true,
        });
        console.log(`✅  Created ${createdFlags.length} fraud flags.`);

        // ──────────────────────────────────────────────────────────────────
        // COMMIT
        // ──────────────────────────────────────────────────────────────────
        await dbTxn.commit();

        console.log('🎉  Demo data seeded successfully!');
        console.log('─────────────────────────────────────────────────────');
        console.log(`  Admin login   →  ${existingAdmin.email}  (password set by adminSeed)`);
        console.log('  Merchant login →  merchant1@…       /  123456');
        console.log('  Customer login →  customer1@…       /  123456');
        console.log('─────────────────────────────────────────────────────\n');

    } catch (error) {
        if (dbTxn) await dbTxn.rollback();
        console.error('\n❌  Error seeding demo data:', error.message);
        if (error.errors) {
            console.error(
                'Validation errors:',
                error.errors.map(e => e.message)
            );
        }
        if (error.parent) {
            console.error('DB error:', error.parent.message);
        }
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

runSeeder();
