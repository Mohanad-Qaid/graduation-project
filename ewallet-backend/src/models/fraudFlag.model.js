'use strict';

const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const FraudFlag = sequelize.define(
        'FraudFlag',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: () => uuidv4(),
                primaryKey: true,
                allowNull: false,
            },
            transaction_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'transactions',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            risk_score: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: 0,
                    max: 100,
                },
            },
            reason: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            reviewed: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            reviewed_by: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'SET NULL',
            },
            reviewed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'fraud_flags',
            timestamps: true,
            indexes: [
                { fields: ['transaction_id'] },
                { fields: ['reviewed'] },
                { fields: ['risk_score'] },
                { fields: ['reviewed_by'] },
            ],
        }
    );

    return FraudFlag;
};
