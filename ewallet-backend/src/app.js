'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler.middleware');
const { globalRateLimiter } = require('./middlewares/rateLimiter.middleware');

const app = express();

//used for nginx to have the users' real ip.
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Global Rate Limiter
app.use(globalRateLimiter);

// API Routes
app.use('/api/v1', routes);

// 404 Handler
app.use(notFound);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
