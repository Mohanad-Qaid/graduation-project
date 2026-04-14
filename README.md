# E-Wallet Digital Payment Platform

A complete e-wallet ecosystem with mobile app for customers/merchants and admin web portal.

## Project Structure

```
e-wallet/
├── backend/          # Node.js + Express API Server
├── mobile/           # React Native Mobile App (Customer & Merchant)
└── admin-portal/     # React Admin Dashboard
```

## Features

### Mobile App (Customer)
- Register/Login (requires admin approval)
- View wallet balance
- Add balance (simulated top-up)
- Scan QR code and make payments
- Confirm payments
- View transaction history
- Expense dashboard with charts
- Profile management

### Mobile App (Merchant)
- Register/Login (requires admin approval)
- View wallet balance and today's revenue
- Generate QR code for payments
- Receive customer payments
- Request withdrawal
- View withdrawal history
- Transaction history
- Profile management

### Admin Web Portal
- Admin login
- Dashboard with statistics
- Approve/reject customer and merchant registrations
- Approve/reject withdrawal requests
- View all transactions with filters
- View suspicious transactions (AI-flagged)
- User management (activate/suspend users)
- Admin activity logs

### System Features
- Role-based access control (Customer, Merchant, Admin)
- JWT authentication with hashed passwords
- QR-based internal payments
- Real-time balance updates (Socket.io)
- Immutable transaction logging
- Rule-based fraud detection
- Offline data viewing (SQLite)

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- React Native CLI setup (Android Studio / Xcode)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Initialize database
npm run db:init

# Start server
npm run dev
```

Default admin: `admin@ewallet.com` / `admin123`

### 2. Admin Portal Setup

```bash
cd admin-portal

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# iOS (Mac only)
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

**Note:** Update API_URL in `mobile/src/services/api.js`:
- Android Emulator: `http://10.0.2.2:3000/api`
- iOS Simulator: `http://localhost:3000/api`
- Physical device: Use your computer's IP address

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile

### Users (Admin)
- `GET /api/users` - List all users
- `GET /api/users/pending` - Get pending registrations
- `PATCH /api/users/:id/approve` - Approve user
- `PATCH /api/users/:id/reject` - Reject user
- `PATCH /api/users/:id/suspend` - Suspend user
- `PATCH /api/users/:id/activate` - Activate user

### Wallet
- `GET /api/wallet/balance` - Get balance
- `POST /api/wallet/topup` - Top up wallet

### Transactions
- `POST /api/transactions/pay` - Make payment
- `GET /api/transactions` - Get user transactions
- `GET /api/transactions/all` - Get all transactions (admin)
- `GET /api/transactions/suspicious` - Get suspicious transactions (admin)
- `GET /api/transactions/stats` - Get expense stats

### QR Payments
- `POST /api/qr/generate` - Generate payment QR (merchant)
- `POST /api/qr/verify` - Verify QR code

### Withdrawals
- `POST /api/withdrawals/request` - Request withdrawal (merchant)
- `GET /api/withdrawals/history` - Get withdrawal history
- `GET /api/withdrawals/pending` - Get pending withdrawals (admin)
- `PATCH /api/withdrawals/:id/approve` - Approve withdrawal (admin)
- `PATCH /api/withdrawals/:id/reject` - Reject withdrawal (admin)

### Dashboard
- `GET /api/dashboard/admin` - Admin dashboard stats
- `GET /api/dashboard/merchant` - Merchant dashboard stats
- `GET /api/dashboard/logs` - Admin activity logs

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Socket.io (real-time updates)
- bcrypt (password hashing)

### Mobile App
- React Native CLI
- Redux Toolkit
- React Navigation
- React Native Paper
- SQLite (offline storage)
- react-native-qrcode-svg

### Admin Portal
- React 18 + Vite
- Redux Toolkit
- Ant Design
- Recharts
- React Router v6

## Fraud Detection

The system automatically flags transactions based on:
- Large transaction amounts (> $10,000)
- Rapid transactions (5+ in 5 minutes)
- New accounts (< 7 days) with large transfers (> $1,000)
- Daily transaction limit exceeded (> $50,000)

## License

MIT
