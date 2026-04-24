'use strict';

const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');
const { authRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { registerRules, loginRules } = require('../utils/validators.util');

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

module.exports = router;
