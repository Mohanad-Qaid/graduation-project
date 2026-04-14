'use strict';

const sequelize = require('../config/database');

// ─── Import model factories ────────────────────────────────────────────────
const UserModel = require('./user.model');
const WalletModel = require('./wallet.model');
const TransactionModel = require('./transaction.model');
const QRCodeModel = require('./qr.model');
const WithdrawalRequestModel = require('./withdrawal.model');
const AdminLogModel = require('./adminLog.model');
const FraudFlagModel = require('./fraudFlag.model');

// ─── Initialize models ────────────────────────────────────────────────────
const User = UserModel(sequelize);
const Wallet = WalletModel(sequelize);
const Transaction = TransactionModel(sequelize);
const QRCode = QRCodeModel(sequelize);
const WithdrawalRequest = WithdrawalRequestModel(sequelize);
const AdminLog = AdminLogModel(sequelize);
const FraudFlag = FraudFlagModel(sequelize);

// ─── Associations ─────────────────────────────────────────────────────────

// User ↔ Wallet (one-to-one)
User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet', onDelete: 'CASCADE' });
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// User (Merchant) ↔ QRCode (one-to-one static QR)
User.hasOne(QRCode, { foreignKey: 'merchant_id', as: 'qrCode', onDelete: 'CASCADE' });
QRCode.belongsTo(User, { foreignKey: 'merchant_id', as: 'merchant' });

// Wallet ↔ QRCode (one-to-one static QR)
Wallet.hasOne(QRCode, { foreignKey: 'wallet_id', as: 'qrCode', onDelete: 'CASCADE' });
QRCode.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });

// Wallet ↔ Transaction (sender)
Wallet.hasMany(Transaction, { foreignKey: 'sender_wallet_id', as: 'sentTransactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'sender_wallet_id', as: 'senderWallet' });

// Wallet ↔ Transaction (receiver)
Wallet.hasMany(Transaction, { foreignKey: 'receiver_wallet_id', as: 'receivedTransactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'receiver_wallet_id', as: 'receiverWallet' });

// User (Merchant) ↔ WithdrawalRequest
User.hasMany(WithdrawalRequest, { foreignKey: 'merchant_id', as: 'withdrawalRequests', onDelete: 'CASCADE' });
WithdrawalRequest.belongsTo(User, { foreignKey: 'merchant_id', as: 'merchant' });

// Wallet ↔ WithdrawalRequest
Wallet.hasMany(WithdrawalRequest, { foreignKey: 'wallet_id', as: 'withdrawalRequests', onDelete: 'CASCADE' });
WithdrawalRequest.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });

// User (Admin) ↔ WithdrawalRequest (processed by)
User.hasMany(WithdrawalRequest, { foreignKey: 'processed_by', as: 'processedWithdrawals' });
WithdrawalRequest.belongsTo(User, { foreignKey: 'processed_by', as: 'processor' });

// User (Admin) ↔ AdminLog
User.hasMany(AdminLog, { foreignKey: 'admin_id', as: 'adminLogs', onDelete: 'CASCADE' });
AdminLog.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

// User (target) ↔ AdminLog
User.hasMany(AdminLog, { foreignKey: 'target_user_id', as: 'targetLogs' });
AdminLog.belongsTo(User, { foreignKey: 'target_user_id', as: 'targetUser' });

// Transaction ↔ FraudFlag
Transaction.hasMany(FraudFlag, { foreignKey: 'transaction_id', as: 'fraudFlags', onDelete: 'CASCADE' });
FraudFlag.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });

// User (Admin reviewer) ↔ FraudFlag
User.hasMany(FraudFlag, { foreignKey: 'reviewed_by', as: 'reviewedFlags' });
FraudFlag.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// ─── Exports ──────────────────────────────────────────────────────────────
module.exports = {
    sequelize,
    User,
    Wallet,
    Transaction,
    QRCode,
    WithdrawalRequest,
    AdminLog,
    FraudFlag,
};
