'use strict';

const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const WithdrawalRequest = sequelize.define(
        'WithdrawalRequest',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: () => uuidv4(),
                primaryKey: true,
                allowNull: false,
            },
            merchant_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            wallet_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'wallets',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            amount: {
                type: DataTypes.NUMERIC(15, 2),
                allowNull: false,
                validate: {
                    min: 0.01,
                },
                comment: 'Gross amount the merchant requested (before fee deduction)',
            },
            bank_name: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'Name of the destination bank (e.g. Ziraat Bankası)',
            },
            bank_account: {
                type: DataTypes.STRING(34),
                allowNull: true,
                comment: 'Turkish IBAN — always TR + 24 digits (26 chars total)',
            },
            bank_account_name: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'Account holder full name',
            },
            fee_amount: {
                type: DataTypes.NUMERIC(15, 2),
                allowNull: true,
                comment: 'Platform fee collected (amount × fee_rate)',
            },
            net_amount: {
                type: DataTypes.NUMERIC(15, 2),
                allowNull: true,
                comment: 'Amount paid out to merchant (amount − fee_amount)',
            },
            status: {
                type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
                allowNull: false,
                defaultValue: 'PENDING',
            },
            processed_by: {
                type: DataTypes.UUID,
                allowNull: true, // set when admin processes
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'SET NULL',
            },
            processed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            rejection_reason: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: 'withdrawal_requests',
            timestamps: true,
            indexes: [
                { fields: ['merchant_id'] },
                { fields: ['status'] },
                { fields: ['createdAt'] },
            ],
        }
    );

    return WithdrawalRequest;
};
