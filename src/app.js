/**
 * MAIN APPLICATION
 * 
 * This configures the Express app with all middleware and routes.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const webhookRoutes = require('./routes/webhook');

// Create Express app
const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

// Security headers
app.use(helmet());

// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors({
  origin: '*',  // Allow all origins (restrict in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(morgan('dev'));

// Parse JSON bodies
app.use(bodyParser.json());

// Parse text bodies (TradingView sometimes sends plain text)
app.use(bodyParser.text());

// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// =====================================================
// ROUTES
// =====================================================

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'EvilAI Alert Server',
    status: 'Running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/webhook', webhookRoutes);

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not found',
    message: `The route ${req.method} ${req.path} does not exist`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

module.exports = app;