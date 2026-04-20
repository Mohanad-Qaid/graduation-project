'use strict';

/**
 * Admin Seeder — run once to bootstrap the first ADMIN user.
 * Usage: node src/seeders/adminSeed.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const bcrypt = require('bcrypt');
const { sequelize, User, Wallet } = require('../models');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

async function seedAdmin() {
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@ewallet.com';
    const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';
    const first_name = process.env.SEED_ADMIN_FIRST_NAME || 'System';
    const last_name = process.env.SEED_ADMIN_LAST_NAME || 'Admin';
    const phone = process.env.SEED_ADMIN_PHONE || '+905000000000';

    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync only for seeding — use migrations in production
        await sequelize.sync({ alter: true });
        console.log('Schema synchronized.');

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            console.log(`Admin already exists: ${email}`);
            process.exit(0);
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const dbTxn = await sequelize.transaction();
        try {
            const admin = await User.create(
                {
                    first_name,
                    last_name,
                    email,
                    phone,
                    password_hash,
                    role: 'ADMIN',
                    status: 'APPROVED',
                },
                { transaction: dbTxn }
            );

            await Wallet.create(
                { user_id: admin.id, balance: 0.0, currency: 'TRY' },
                { transaction: dbTxn }
            );

            await dbTxn.commit();
            console.log('✅ Admin user created successfully.');
            console.log(`   Email   : ${email}`);
            console.log(`   Password: ${password}`);
            console.log('   ⚠️  Change the password immediately after first login!');
        } catch (err) {
            await dbTxn.rollback();
            throw err;
        }
    } catch (err) {
        console.error('❌ Seeder failed:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

seedAdmin();
