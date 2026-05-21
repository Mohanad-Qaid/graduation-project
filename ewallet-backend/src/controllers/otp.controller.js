'use strict';

const { requestOTP, confirmEmailOTP, verifyResetCode: verifyResetCodeService, resetPassword } = require('../services/otp.service');
const { sendSuccess } = require('../utils/response.util');

// POST /auth/send-otp
// Body: { email, purpose: 'verify' | 'reset' }
async function sendOTP(req, res, next) {
    try {
        const { email, purpose } = req.body;
        const mustExist = purpose === 'reset';
        await requestOTP(email, purpose, mustExist);
        return sendSuccess(res, {
            message: 'Verification code sent. Check your inbox.',
        });
    } catch (err) {
        next(err);
    }
}

// POST /auth/resend-otp
// Body: { email, purpose: 'verify' | 'reset' }
// Same logic as sendOTP — just a semantic alias so the UI can call it explicitly
async function resendOTP(req, res, next) {
    try {
        const { email, purpose } = req.body;
        const mustExist = purpose === 'reset';
        await requestOTP(email, purpose, mustExist);
        return sendSuccess(res, {
            message: 'A new verification code has been sent.',
        });
    } catch (err) {
        next(err);
    }
}

// POST /auth/verify-email
// Body: { email, code }
async function verifyEmail(req, res, next) {
    try {
        const { email, code } = req.body;
        await confirmEmailOTP(email, code);
        return sendSuccess(res, {
            message: 'Email verified successfully.',
        });
    } catch (err) {
        next(err);
    }
}

// POST /auth/forgot-password
// Body: { email }
// Just sends the OTP (mustExist=true, purpose='reset')
async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;
        await requestOTP(email, 'reset', true);
        return sendSuccess(res, {
            message: 'If that email is registered and verified, a reset code has been sent.',
        });
    } catch (err) {
        next(err);
    }
}

// POST /auth/verify-reset-code
// Body: { email, code }
async function verifyResetCode(req, res, next) {
    try {
        const { email, code } = req.body;
        const resetToken = await verifyResetCodeService(email, code);
        return sendSuccess(res, {
            message: 'Code verified successfully.',
            data: { resetToken },
        });
    } catch (err) {
        next(err);
    }
}

// POST /auth/reset-password
// Body: { resetToken, newPin }
async function doResetPassword(req, res, next) {
    try {
        const { resetToken, newPin } = req.body;
        await resetPassword(resetToken, newPin);
        return sendSuccess(res, {
            message: 'PIN reset successfully. You can now log in with your new PIN.',
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { sendOTP, resendOTP, verifyEmail, forgotPassword, verifyResetCode, doResetPassword };
