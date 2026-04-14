'use strict';

const { Router } = require('express');

const authRoutes = require('./auth.routes');
const customerRoutes = require('./customer.routes');
const merchantRoutes = require('./merchant.routes');
const adminRoutes = require('./admin.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/merchant', merchantRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
