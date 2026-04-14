'use strict';

const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const QRCode = sequelize.define(
        'QRCode',
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
                unique: true, // one static QR per merchant enforced at DB level
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
            payload: {
                type: DataTypes.TEXT, // signed JWT encoding merchantId + walletId + merchantName
                allowNull: false,
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        },
        {
            tableName: 'qr_codes',
            timestamps: true,
            indexes: [
                { fields: ['merchant_id'] },
                { fields: ['is_active'] },
            ],
        }
    );

    return QRCode;
};
