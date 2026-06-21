# 💳 E-Wallet Digital Payment Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React_Native-CLI-blue.svg)](https://reactnative.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)

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
└── admin-portal/     # React + Vite Admin Dashboard (Management & Analytics)
```

---

## ✨ Key Features

### 📱 Mobile App (Customer)
- **Seamless Onboarding**: Register and login (requires admin approval for security).
- **Wallet Management**: View real-time wallet balance and simulate top-ups.
- **QR Code Payments**: Scan merchant QR codes for instant, contactless payments.
- **Transaction Tracking**: View detailed transaction history and expense dashboard charts.
- **Profile Management**: Update user details and preferences.

### 🏪 Mobile App (Merchant)
- **Business Account**: Register and login (requires admin approval).
- **Revenue Dashboard**: Monitor wallet balance and today's total revenue.
- **Payment Collection**: Generate dynamic QR codes to receive payments from customers.
- **Fund Management**: Request money withdrawals and track withdrawal history.

### 💻 Admin Web Portal
- **Centralized Dashboard**: Comprehensive statistics and activity overview.
- **Approval Workflows**: Approve or reject customer/merchant registrations and withdrawal requests.
- **Transaction Monitoring**: Filter and view all platform transactions.
- **AI Fraud Detection**: View and act upon transactions flagged by the automated fraud detection system.
- **User Management**: Activate, suspend, or manage platform users.
- **Audit Logs**: Maintain system integrity with detailed admin activity logs.

---

## 🛠 Tech Stack

| Component | Technologies |
| --- | --- |
| **Backend** | Node.js, Express, PostgreSQL, Socket.io (Real-time), JWT, bcrypt |
| **Mobile App** | React Native CLI, Redux Toolkit, React Navigation, React Native Paper, SQLite (Offline storage), react-native-qrcode-svg |
| **Admin Portal**| React 18, Vite, Redux Toolkit, Ant Design, Recharts, React Router v6 |

---

## 🛡 System Architecture & Security

- **Role-Based Access Control (RBAC)**: Distinct permissions for Customers, Merchants, and Admins.
- **Authentication**: Secure JWT-based authentication with bcrypt password hashing.
- **Real-Time Capabilities**: Socket.io integration for instant balance updates and notifications.
- **Data Integrity**: Immutable transaction logging.
- **Fraud Detection Engine**: Automatically flags suspicious activities based on:
  - Unusually large transaction amounts (e.g., > $10,000)
  - Rapid successive transactions (e.g., 5+ in 5 minutes)
  - New account anomalies (e.g., accounts < 7 days old moving > $1,000)
  - Daily transaction limit breaches (e.g., > $50,000)

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

# For iOS (macOS only)
cd ios && pod install && cd ..
npm run ios

# For Android
npm run android
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

## 📄 License

This project is licensed under the MIT License.
