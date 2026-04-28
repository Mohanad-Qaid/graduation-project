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
            fee_rate: {
                type: DataTypes.DECIMAL(5, 4),
                allowNull: true,
                comment: 'Fee rate snapshot at time of request (e.g. 0.0700 = 7%)',
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
                { fields: ['processed_by'] },
                { fields: ['createdAt'] },
            ],
        }
    );

    return WithdrawalRequest;
};
