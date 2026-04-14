'use strict';

const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const Wallet = sequelize.define(
        'Wallet',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: () => uuidv4(),
                primaryKey: true,
                allowNull: false,
            },
            user_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            balance: {
                type: DataTypes.NUMERIC(15, 2),
                allowNull: false,
                defaultValue: 0.0,
                validate: {
                    min: 0,
                },
            },
            currency: {
                type: DataTypes.STRING(10),
                allowNull: false,
                defaultValue: 'TRY',
            },
        },
        {
            tableName: 'wallets',
            timestamps: true,
            indexes: [
                { unique: true, fields: ['user_id'] }, // one-to-one with User
                { fields: ['balance'] },
            ],
        }
    );

    return Wallet;
};
