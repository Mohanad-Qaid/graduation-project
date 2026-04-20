'use strict';

const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const Transaction = sequelize.define(
        'Transaction',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: () => uuidv4(),
                primaryKey: true,
                allowNull: false,
            },
            sender_wallet_id: {
                type: DataTypes.UUID,
                allowNull: true, // null for top-ups
                references: {
                    model: 'wallets',
                    key: 'id',
                },
                onDelete: 'SET NULL',
            },
            receiver_wallet_id: {
                type: DataTypes.UUID,
                allowNull: true, // null for withdrawals
                references: {
                    model: 'wallets',
                    key: 'id',
                },
                onDelete: 'SET NULL',
            },
            amount: {
                type: DataTypes.NUMERIC(15, 2),
                allowNull: false,
                validate: {
                    min: 0.01,
                },
            },
            transaction_type: {
                type: DataTypes.ENUM('TOPUP', 'PAYMENT', 'WITHDRAWAL'),
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
                allowNull: false,
                defaultValue: 'PENDING',
            },
            reference_code: {
                type: DataTypes.STRING(64),
                allowNull: false,
                unique: true,
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            category: {
                type: DataTypes.STRING(100),
                allowNull: true, // only PAYMENT transactions have a category
            },
        },
        {
            tableName: 'transactions',
            timestamps: true,
            indexes: [
                { unique: true, fields: ['reference_code'] },
                { fields: ['sender_wallet_id'] },
                { fields: ['receiver_wallet_id'] },
                { fields: ['transaction_type'] },
                { fields: ['status'] },
                { fields: ['createdAt'] },
            ],
        }
    );

    return Transaction;
};
