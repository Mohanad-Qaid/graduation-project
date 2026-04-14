'use strict';

const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const AdminLog = sequelize.define(
        'AdminLog',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: () => uuidv4(),
                primaryKey: true,
                allowNull: false,
            },
            admin_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
            },
            action_type: {
                type: DataTypes.STRING(100),
                allowNull: false,
                // Examples: USER_APPROVED, USER_REJECTED, WITHDRAWAL_APPROVED, USER_SUSPENDED
            },
            target_user_id: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onDelete: 'SET NULL',
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: 'admin_logs',
            timestamps: true,
            indexes: [
                { fields: ['admin_id'] },
                { fields: ['action_type'] },
                { fields: ['target_user_id'] },
                { fields: ['createdAt'] },
            ],
        }
    );

    return AdminLog;
};
