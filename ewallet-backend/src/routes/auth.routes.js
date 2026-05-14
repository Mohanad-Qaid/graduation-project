'use strict';

const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const otpController = require('../controllers/otp.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { authRateLimiter, otpRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    registerRules, loginRules,
    sendOTPRules, verifyEmailRules, resetPasswordRules, forgotPasswordRules,
} = require('../utils/validators.util');

const router = Router();

// POST /api/v1/auth/register
router.post('/register', authRateLimiter, registerRules, validate, controller.register);

// POST /api/v1/auth/login
router.post('/login', authRateLimiter, loginRules, validate, controller.login);

// GET /api/v1/auth/me
router.get('/me', authenticate, controller.getMe);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, controller.logout);

// POST /api/v1/auth/refresh  — no authenticate middleware, access token is already expired
router.post('/refresh', authRateLimiter, controller.refreshToken);

// ── OTP / Email Verification / Password Reset ──────────────────────────────────

// Send OTP (registration verify or reset — determined by body.purpose)
router.post('/send-otp', otpRateLimiter, sendOTPRules, validate, otpController.sendOTP);

// Resend OTP explicitly (same logic, separate route for clarity)
router.post('/resend-otp', otpRateLimiter, sendOTPRules, validate, otpController.resendOTP);

// Confirm OTP → mark email_verified = true
router.post('/verify-email', otpRateLimiter, verifyEmailRules, validate, otpController.verifyEmail);

// Send reset OTP (checks email exists + is verified)
router.post('/forgot-password', otpRateLimiter, forgotPasswordRules, validate, otpController.forgotPassword);

// Verify OTP + set new PIN
router.post('/reset-password', otpRateLimiter, resetPasswordRules, validate, otpController.doResetPassword);

module.exports = router;

