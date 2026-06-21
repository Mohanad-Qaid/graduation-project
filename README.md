# 💳 E-Wallet Digital Payment Platform

A complete, secure, and highly scalable e-wallet ecosystem. This project features a React Native mobile application for both customers and merchants, paired with a robust React-based Admin Web Portal to manage the entire ecosystem.

---

## 📑 Table of Contents
- [Project Structure](#-project-structure)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture & Security](#-system-architecture--security)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [License](#-license)

---

## 📂 Project Structure

```text
e-wallet/
├── ewallet-backend/  # Node.js + Express API Server (REST API, WebSockets)
├── mobile/           # React Native Mobile App (Customer & Merchant Interfaces)
└── admin-portal/     # React - Admin Dashboard (Management & Analytics)
```

---

## ✨ Key Features

### 📱 Mobile App (Customer)
- **Authentication**: Register a new account or log in. New accounts require admin approval before access is granted.
- **Home Dashboard**: View available wallet balance, quick-action shortcuts, and a list of recent transactions at a glance.
- **Add Balance (Top-Up)**: Simulate adding funds to the wallet using Stripe-powered payment integration.
- **QR Code Scanner**: Scan a merchant's QR code to initiate a payment instantly.
- **Payment Confirmation**: Review payment details (merchant name, amount) before confirming the transaction.
- **Transaction History**: Browse a full, paginated history of all past transactions with status and timestamps.
- **Expense Dashboard**: Visualize spending habits with charts and category breakdowns.
- **Notifications**: Receive real-time push notifications for payment confirmations and account updates.
- **Profile Management**: View and update personal information, change password, and log out securely.

### 🏪 Mobile App (Merchant)
- **Authentication**: Register a business account or log in. New accounts require admin approval before access is granted.
- **Home Dashboard**: View the available wallet balance, pending withdrawal amount, a Revenue Overview card (today's & this week's earnings with transaction counts), quick-action shortcuts, and a recent payments list.
- **Generate QR Code**: Instantly generate and display a personal QR code for customers to scan and pay.
- **Request Withdrawal**: Submit a bank withdrawal request by providing bank name, account holder name, IBAN, and a custom amount.
- **Withdrawal History**: Track all past withdrawal requests with their current status (Pending / Approved / Rejected) and bank details.
- **Transaction History**: Browse a full, paginated history of all incoming and outgoing transactions.
- **Notifications**: Receive real-time alerts when a customer completes a payment or when a withdrawal request is updated.
- **Profile Management**: View and update business and personal information, change password, and log out securely.

### 💻 Admin Web Portal
- **Dashboard**: A high-level overview of platform total users, total transactions, revenue, and recent activity charts.
- **Pending Registrations**: Review, approve, or reject new customer and merchant sign-up requests with a searchable list.
- **Withdrawal Requests**: Review and approve or reject pending merchant withdrawal requests, with full bank detail visibility.
- **All Transactions**: Browse every platform transaction with filtering and search capabilities.
- **Suspicious Transactions**: View AI-flagged transactions with fraud scores and take immediate action.
- **User Management**: Search all users and activate or suspend accounts as needed.
- **Admin Logs**: A complete, immutable audit trail of every administrative action taken on the platform.

---

## 🛠 Tech Stack

| Component | Technologies |
| --- | --- |
| **Backend** | Node.js, Express, PostgreSQL|
| **Mobile App** | React Native, Redux Toolkit, SQLite (Offline storage) |
| **Admin Portal**| React, Redux Toolkit |

---

## 🛡 System Architecture & Security

- **Role-Based Access Control (RBAC)**: Distinct permissions for Customers, Merchants, and Admins.
- **Authentication**: Secure JWT-based authentication with bcrypt password hashing.
- **Data Integrity**: Immutable transaction logging.
- **Fraud Detection Engine**: flags suspicious activities.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher)
- React Native CLI setup (Android Studio / Xcode)

### 1. Backend Setup

```bash
cd ewallet-backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your specific PostgreSQL credentials and secret keys

# Initialize the database
npm run db:init

# Start the development server
npm run dev
```
> **Default Admin Credentials:** `admin@ewallet.com` / `admin123`

### 2. Admin Portal Setup

```bash
cd admin-portal

# Install dependencies
npm install

# Start development server
npm run dev
```
> The portal will be available at [http://localhost:5173](http://localhost:5173)

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# For Android
npm run android

# For iOS (macOS only)
cd ios && pod install && cd ..
npm run ios
```
> **Important Configuration:** You must update the `API_URL` inside `mobile/.env` or `mobile/src/services/api.js`:
> - **Android Emulator**: `http://10.0.2.2:5000/api`
> - **iOS Simulator**: `http://localhost:5000/api`
> - **Physical Device**: Use your computer's local IP address (e.g., `http://192.168.1.X:5000/api`)

---

## 📡 API Reference

<details>
<summary>Click to view main API endpoints</summary>

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user/admin
- `GET /api/auth/me` - Get current authenticated user
- `PATCH /api/auth/profile` - Update user profile

### User Management (Admin)
- `GET /api/users` - List all users
- `GET /api/users/pending` - Get pending registrations
- `PATCH /api/users/:id/approve` - Approve user
- `PATCH /api/users/:id/reject` - Reject user
- `PATCH /api/users/:id/suspend` - Suspend user
- `PATCH /api/users/:id/activate` - Activate user

### Wallet & Transactions
- `GET /api/wallet/balance` - Get current balance
- `POST /api/wallet/topup` - Simulate wallet top-up
- `POST /api/transactions/pay` - Process a payment
- `GET /api/transactions` - Get user's transaction history
- `GET /api/transactions/all` - Get all global transactions (Admin)
- `GET /api/transactions/suspicious` - Get AI-flagged transactions (Admin)
- `GET /api/transactions/stats` - Get user expense statistics

### QR Code Operations
- `POST /api/qr/generate` - Generate payment QR code (Merchant)
- `POST /api/qr/verify` - Verify a scanned QR code

### Withdrawals
- `POST /api/withdrawals/request` - Request money withdrawal (Merchant)
- `GET /api/withdrawals/history` - Get withdrawal history
- `GET /api/withdrawals/pending` - Get pending withdrawals (Admin)
- `PATCH /api/withdrawals/:id/approve` - Approve withdrawal (Admin)
- `PATCH /api/withdrawals/:id/reject` - Reject withdrawal (Admin)

### Dashboard Analytics
- `GET /api/dashboard/admin` - Admin statistics and charts
- `GET /api/dashboard/merchant` - Merchant revenue statistics
- `GET /api/dashboard/logs` - Admin activity audit logs
</details>

---
