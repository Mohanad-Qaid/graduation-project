'use strict';

const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const User = sequelize.define(
        'User',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: () => uuidv4(),
                primaryKey: true,
                allowNull: false,
            },
            first_name: {
                type: DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: true,
                    len: [1, 50],
                },
            },
            last_name: {
                type: DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: true,
                    len: [1, 50],
                },
            },
            business_name: {
                type: DataTypes.STRING(150),
                allowNull: true, // only MERCHANT users have this
            },
            business_category: {
                type: DataTypes.STRING(100),
                allowNull: true, // only MERCHANT users have this
            },
            email: {
                type: DataTypes.STRING(150),
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true,
                },
            },
            phone: {
                type: DataTypes.STRING(20),
                allowNull: false,
                unique: true,
                validate: {
                    notEmpty: true,
                },
            },
            password_hash: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            role: {
                type: DataTypes.ENUM('CUSTOMER', 'MERCHANT', 'ADMIN'),
                allowNull: false,
                defaultValue: 'CUSTOMER',
            },
            status: {
                type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'),
                allowNull: false,
                defaultValue: 'PENDING',
            },
        },
        {
            tableName: 'users',
            timestamps: true,
            indexes: [
                { unique: true, fields: ['email'] },
                { unique: true, fields: ['phone'] },
                { fields: ['role'] },
                { fields: ['status'] },
            ],
        }
    );

    return User;
};
