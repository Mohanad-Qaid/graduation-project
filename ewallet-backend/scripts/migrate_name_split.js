/**
 * One-time migration: full_name → first_name + last_name + business_name
 *
 * Safe to run multiple times (idempotent).
 * Run with: node scripts/migrate_name_split.js
 */

'use strict';

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        dialect: 'postgres',
        logging: console.log,
    }
);

async function run() {
    const qi = sequelize.getQueryInterface();

    console.log('\n🔄  Starting migration: name split\n');

    // 1. Get existing columns
    const columns = await qi.describeTable('users');

    // 2. Add first_name (nullable first so existing rows don't fail)
    if (!columns.first_name) {
        console.log('→ Adding column: first_name');
        await qi.addColumn('users', 'first_name', {
            type: DataTypes.STRING(50),
            allowNull: true,
        });
    } else {
        console.log('✓ Column first_name already exists, skipping.');
    }

    // 3. Add last_name (nullable first)
    if (!columns.last_name) {
        console.log('→ Adding column: last_name');
        await qi.addColumn('users', 'last_name', {
            type: DataTypes.STRING(50),
            allowNull: true,
        });
    } else {
        console.log('✓ Column last_name already exists, skipping.');
    }

    // 4. Add business_name
    if (!columns.business_name) {
        console.log('→ Adding column: business_name');
        await qi.addColumn('users', 'business_name', {
            type: DataTypes.STRING(150),
            allowNull: true,
        });
    } else {
        console.log('✓ Column business_name already exists, skipping.');
    }

    // 5. Populate first_name / last_name from full_name (for existing rows)
    if (columns.full_name) {
        console.log('→ Populating first_name / last_name from full_name…');
        await sequelize.query(`
            UPDATE users
            SET
                first_name = TRIM(SPLIT_PART(full_name, ' ', 1)),
                last_name  = COALESCE(
                    NULLIF(TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)), ''),
                    TRIM(SPLIT_PART(full_name, ' ', 1))
                )
            WHERE first_name IS NULL OR first_name = ''
        `);
        console.log('✓ Existing rows populated.');
    } else {
        console.log('✓ No full_name column found — skipping backfill.');
    }

    // 6. Set NOT NULL on first_name and last_name
    console.log('→ Enforcing NOT NULL on first_name and last_name…');
    await sequelize.query(`ALTER TABLE users ALTER COLUMN first_name SET NOT NULL`);
    await sequelize.query(`ALTER TABLE users ALTER COLUMN last_name SET NOT NULL`);

    // 7. Drop full_name if it still exists
    if (columns.full_name) {
        console.log('→ Dropping column: full_name');
        await qi.removeColumn('users', 'full_name');
    }

    console.log('\n✅  Migration complete!\n');
    await sequelize.close();
    process.exit(0);
}

run().catch((err) => {
    console.error('\n❌  Migration failed:', err.message, '\n');
    process.exit(1);
});
