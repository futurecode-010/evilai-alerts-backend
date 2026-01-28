/**
 * DATABASE CONFIGURATION
 * 
 * This file sets up the connection to our PostgreSQL database.
 * We use a "connection pool" which keeps multiple connections open
 * for better performance.
 */

const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  // The connection string from our .env file
  connectionString: process.env.DATABASE_URL,
  
  // Required for Supabase (uses SSL)
  ssl: {
    rejectUnauthorized: false
  },
  
  // Pool settings
  max: 20,              // Maximum 20 connections
  idleTimeoutMillis: 30000,  // Close idle connections after 30 seconds
  connectionTimeoutMillis: 15000,  // Timeout after 2 seconds if can't connect
});

// Test the connection when server starts
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(-1);
});

module.exports = pool;