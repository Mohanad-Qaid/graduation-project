'use strict';

const { sequelize, User, Wallet, Transaction, WithdrawalRequest } = require('../models');
const bcrypt = require('bcrypt');

const BUSINESS_CATEGORIES = ['Food & Drink', 'Shopping', 'Transport', 'Bills & Utilities', 'Lifestyle'];

async function runSeeder() {
    const { faker } = await import('@faker-js/faker');
    console.log('🌱 Starting demo data generation...');

    let dbTxn;
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database.');

        dbTxn = await sequelize.transaction();

        // 1. Create Users
        console.log('🔄 Seeding Users...');
        const passwordHash = await bcrypt.hash('123456', 10);

        const usersToCreate = Array.from({ length: 50 }).map(() => {
            // ~70% CUSTOMER, ~30% MERCHANT
            const role = faker.helpers.arrayElement(['CUSTOMER', 'CUSTOMER', 'MERCHANT']);
            const businessCategory = role === 'MERCHANT'
                ? faker.helpers.arrayElement(BUSINESS_CATEGORIES)
                : null;
            return {
                id: faker.string.uuid(),
                first_name: faker.person.firstName(),
                last_name: faker.person.lastName(),
                business_name: role === 'MERCHANT' ? faker.company.name() : null,
                business_category: businessCategory,
                email: faker.internet.email().toLowerCase(),
                phone: '+905' + faker.string.numeric(9),
                password_hash: passwordHash,
                role: role,
                // ~66% APPROVED, ~33% PENDING
                status: faker.helpers.arrayElement(['PENDING', 'APPROVED', 'APPROVED']),
                createdAt: faker.date.past({ years: 1 }),
                updatedAt: new Date()
            };
        });

        const createdUsers = await User.bulkCreate(usersToCreate, { transaction: dbTxn, returning: true });
        console.log(`✅ Created ${createdUsers.length} users.`);

        // 2. Create Wallets
        console.log('🔄 Seeding Wallets...');
        const walletsToCreate = createdUsers.map(user => ({
            id: faker.string.uuid(),
            user_id: user.id,
            balance: faker.finance.amount({ min: 10, max: 1000, dec: 2 }),
            currency: 'TRY',
            createdAt: user.createdAt,
            updatedAt: new Date()
        }));

        const createdWallets = await Wallet.bulkCreate(walletsToCreate, { transaction: dbTxn, returning: true });
        console.log(`✅ Created ${createdWallets.length} wallets.`);

        // Build lookup maps for category resolution
        const walletOwnerMap = {}; // walletId → user
        createdWallets.forEach(wallet => {
            const owner = createdUsers.find(u => u.id === wallet.user_id);
            if (owner) walletOwnerMap[wallet.id] = owner;
        });

        // Separate merchant wallets from customer wallets for PAYMENT targeting
        const merchantWallets = createdWallets.filter(w => {
            const owner = walletOwnerMap[w.id];
            return owner && owner.role === 'MERCHANT' && owner.status === 'APPROVED';
        });
        const allWallets = createdWallets;

        // 3. Create Transactions
        console.log('🔄 Seeding Transactions...');
        const transactionsToCreate = Array.from({ length: 100 }).map(() => {
            const type = faker.helpers.arrayElement(['TOPUP', 'PAYMENT', 'WITHDRAWAL']);
            let sender_wallet_id = null;
            let receiver_wallet_id = null;
            let category = null;

            if (type === 'TOPUP') {
                receiver_wallet_id = faker.helpers.arrayElement(allWallets).id;
            } else if (type === 'WITHDRAWAL') {
                sender_wallet_id = faker.helpers.arrayElement(allWallets).id;
            } else {
                // PAYMENT: Customer → Merchant, always has a category
                const senderWallet = faker.helpers.arrayElement(allWallets);
                // Pick a merchant wallet; fall back to any different wallet if none exist
                let receiverWallet = merchantWallets.length > 0
                    ? faker.helpers.arrayElement(merchantWallets)
                    : faker.helpers.arrayElement(allWallets.filter(w => w.id !== senderWallet.id));

                // Ensure distinct wallets
                while (receiverWallet.id === senderWallet.id) {
                    receiverWallet = faker.helpers.arrayElement(allWallets);
                }

                sender_wallet_id = senderWallet.id;
                receiver_wallet_id = receiverWallet.id;

                // Inherit category from the merchant receiver
                const receiverOwner = walletOwnerMap[receiverWallet.id];
                category = receiverOwner?.business_category
                    || faker.helpers.arrayElement(BUSINESS_CATEGORIES);
            }

            return {
                id: faker.string.uuid(),
                sender_wallet_id,
                receiver_wallet_id,
                amount: faker.finance.amount({ min: 5, max: 200, dec: 2 }),
                transaction_type: type,
                status: faker.helpers.arrayElement(['PENDING', 'COMPLETED', 'FAILED']),
                reference_code: faker.string.alphanumeric(16).toUpperCase(),
                description: faker.lorem.sentence(),
                category,
                createdAt: faker.date.recent({ days: 30 }),
                updatedAt: new Date()
            };
        });

        const createdTransactions = await Transaction.bulkCreate(transactionsToCreate, { transaction: dbTxn, returning: true });
        console.log(`✅ Created ${createdTransactions.length} transactions.`);

        // 4. Create Withdrawal Requests
        console.log('🔄 Seeding Withdrawal Requests for Merchants...');
        const merchants = createdUsers.filter(u => u.role === 'MERCHANT');
        const merchantWalletsFull = merchants
            .map(m => createdWallets.find(w => w.user_id === m.id))
            .filter(Boolean);

        const withdrawalsToCreate = [];
        for (let i = 0; i < Math.min(10, merchantWalletsFull.length); i++) {
            const wallet = faker.helpers.arrayElement(merchantWalletsFull);
            withdrawalsToCreate.push({
                id: faker.string.uuid(),
                merchant_id: wallet.user_id,
                wallet_id: wallet.id,
                amount: faker.finance.amount({ min: 20, max: 300, dec: 2 }),
                status: faker.helpers.arrayElement(['PENDING', 'PENDING', 'APPROVED']),
                createdAt: faker.date.recent({ days: 10 }),
                updatedAt: new Date()
            });
        }

        if (withdrawalsToCreate.length > 0) {
            const createdWithdrawals = await WithdrawalRequest.bulkCreate(withdrawalsToCreate, { transaction: dbTxn, returning: true });
            console.log(`✅ Created ${createdWithdrawals.length} withdrawal requests.`);
        } else {
            console.log('⚠️ No merchants available to create withdrawal requests.');
        }

        await dbTxn.commit();
        console.log('🎉 Demo data seeded successfully!');
        console.log('You can login with any generated email and the password "123456"');

    } catch (error) {
        if (dbTxn) await dbTxn.rollback();
        console.error('❌ Error seeding demo data:', error.message);
        if (error.errors) console.error('Validation errors:', error.errors.map(e => e.message));
        if (error.parent) console.error('Parent error:', error.parent.message);
    } finally {
        await sequelize.close();
    }
}

runSeeder();
