# E-Wallet Backend — Semi-Closed Digital Payment Platform

A production-ready REST API built with **Node.js**, **Express**, **PostgreSQL**, **Redis**, and **JWT**.

---

## 📁 Project Structure

```
ewallet-backend/
├── src/
│   ├── config/
│   │   ├── database.js        # Sequelize instance
│   │   └── redis.js           # ioredis client
│   ├── models/
│   │   ├── index.js           # Model init + all associations
│   │   ├── user.model.js
│   │   ├── wallet.model.js
│   │   ├── transaction.model.js
│   │   ├── qr.model.js
│   │   ├── withdrawal.model.js
│   │   ├── adminLog.model.js
│   │   └── fraudFlag.model.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── customer.controller.js
│   │   ├── merchant.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── wallet.service.js
│   │   ├── payment.service.js
│   │   ├── qr.service.js
│   │   ├── transaction.service.js
│   │   ├── withdrawal.service.js
│   │   └── admin.service.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── customer.routes.js
│   │   ├── merchant.routes.js
│   │   └── admin.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   ├── rateLimiter.middleware.js
│   │   ├── errorHandler.middleware.js
│   │   └── validate.middleware.js
│   ├── utils/
│   │   ├── jwt.util.js
│   │   ├── response.util.js
│   │   ├── generateRef.util.js
│   │   ├── fraud.util.js
│   │   ├── logger.util.js
│   │   └── validators.util.js
│   ├── seeders/
│   │   └── adminSeed.js
│   ├── app.js
│   └── server.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14
- Redis ≥ 7

---

## 🚀 Setup & Installation

### 1. Install dependencies

```bash
cd ewallet-backend
npm install
```

### 2. Configure environment

Edit `.env` with your actual credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ewallet_db
DB_USER=postgres
DB_PASSWORD=your_password

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_SECRET=your_very_long_secret_here
JWT_REFRESH_SECRET=another_long_secret_here

SEED_ADMIN_EMAIL=admin@ewallet.com
SEED_ADMIN_PASSWORD=Admin@123456
```

### 3. Create the database

```sql
CREATE DATABASE ewallet_db;
```

### 4. Seed the admin user

```bash
npm run seed
```

This creates the first `ADMIN` user with credentials from your `.env`.

### 5. Start the server

```bash
# Development (auto-reload)
npm run dev

# Production
NODE_ENV=production npm start
```

Server starts on `http://localhost:5000`

---

## 📡 API Reference

Base URL: `http://localhost:5000/api/v1`

All protected routes require:
```
Authorization: Bearer <access_token>
```

### 🔑 Auth

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register as CUSTOMER or MERCHANT |
| POST | `/auth/login` | Public | Login, get JWT tokens |
| POST | `/auth/logout` | Authenticated | Invalidate tokens |

**Register body:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+905001234567",
  "password": "Secret@123",
  "role": "CUSTOMER"
}
```

**Login response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": "...", "role": "CUSTOMER", "status": "PENDING" }
  }
}
```

---

### 👤 Customer (requires APPROVED status)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customer/wallet` | View wallet balance |
| POST | `/customer/wallet/topup` | Top-up wallet |
| POST | `/customer/pay` | Pay via QR code |
| GET | `/customer/transactions` | Transaction history (paginated) |
| GET | `/customer/expenses/summary` | Monthly expense summary |

**Pay via QR:**
```json
{
  "qrId": "uuid-of-qr-code",
  "amount": 50.00
}
```

---

### 🏪 Merchant (requires APPROVED status)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/merchant/qr/generate` | Generate QR code |
| GET | `/merchant/qr` | List active QR codes |
| GET | `/merchant/wallet` | View wallet balance |
| GET | `/merchant/transactions` | Transaction history |
| POST | `/merchant/withdrawal` | Request withdrawal |
| GET | `/merchant/withdrawal` | List withdrawal requests |

**Generate QR:**
```json
{ "amount": 100.00 }
```
_Leave `amount` null for open-amount QR._

---

### 🛡️ Admin (ADMIN role only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | All users (filterable) |
| GET | `/admin/users/pending` | Pending approval users |
| PATCH | `/admin/users/:userId/approve` | Approve registration |
| PATCH | `/admin/users/:userId/reject` | Reject registration |
| PATCH | `/admin/users/:userId/suspend` | Suspend account |
| POST | `/admin/users/:userId/topup` | Credit user wallet |
| GET | `/admin/transactions` | All transactions |
| GET | `/admin/withdrawals` | All withdrawal requests |
| PATCH | `/admin/withdrawals/:requestId/approve` | Approve withdrawal |
| PATCH | `/admin/withdrawals/:requestId/reject` | Reject + refund |
| GET | `/admin/fraud-flags` | Fraud flags |
| PATCH | `/admin/fraud-flags/:flagId/review` | Mark flag reviewed |
| GET | `/admin/logs` | Admin audit logs |

---

## 📊 Response Format

All responses follow this shape:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## 🔒 Security Features

- **Helmet** — secure HTTP headers
- **CORS** — configurable allowed origins
- **JWT** — short-lived access tokens (15m) + refresh tokens (7d)
- **Token blocklist** — Redis-backed logout invalidation
- **Role-based access control** — CUSTOMER, MERCHANT, ADMIN
- **Approval gate** — all non-admin endpoints require APPROVED status
- **bcrypt** — password hashing (12 rounds)
- **Rate limiting** — Redis-backed, per-IP, per-endpoint
- **Input validation** — express-validator on all inputs
- **SELECT FOR UPDATE** — database-level lock on all balance mutations

---

## 💳 Payment Flow

```
Customer sends POST /customer/pay
  │
  ├─ [1] Validate JWT + role + status
  ├─ [2] Begin DB transaction
  ├─ [3] Lock QR code row (SELECT FOR UPDATE)
  ├─ [4] Validate QR: active + not expired + not self-payment
  ├─ [5] Lock sender wallet (SELECT FOR UPDATE)
  ├─ [6] Check: balance ≥ amount
  ├─ [7] Lock receiver wallet (SELECT FOR UPDATE)
  ├─ [8] Deduct sender balance
  ├─ [9] Credit receiver balance
  ├─ [10] Insert Transaction record (COMPLETED)
  ├─ [11] Deactivate QR (single-use)
  ├─ [12] COMMIT
  └─ [13] Async fraud evaluation (non-blocking)
```

---

## 🚨 Fraud Detection

Risk scoring runs async after every payment:

| Factor | Score |
|--------|-------|
| Amount ≥ `FRAUD_LARGE_TXN_AMOUNT` (default 5000 TRY) | +30 |
| > 5 transactions from same wallet per hour (Redis velocity) | +40 |
| Transaction between 00:00–05:00 UTC | +30 |

Transactions scoring ≥ `FRAUD_SCORE_THRESHOLD` (default 70) create a `FraudFlag` for admin review.

---

## 🧪 Development Tips

- Use `?page=1&limit=20` for paginated endpoints
- JWT access tokens expire in 15 minutes — use the refresh token to get a new one
- Run `npm run dev` for nodemon auto-restart
- In development, `sequelize.sync({ alter: true })` auto-migrates schema

---

## 📝 License

MIT
