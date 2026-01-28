/**
 * AUTHENTICATION ROUTES
 * 
 * Handles user registration and login.
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// =====================================================
// POST /auth/register
// Creates a new user account
// =====================================================

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing fields',
        message: 'Email and password are required' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email',
        message: 'Please enter a valid email address' 
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Weak password',
        message: 'Password must be at least 8 characters' 
      });
    }
    
    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Email exists',
        message: 'An account with this email already exists' 
      });
    }
    
    // Hash the password (bcrypt automatically adds salt)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create the user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash) 
       VALUES ($1, $2) 
       RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );
    
    const newUser = result.rows[0];
    console.log(`✅ New user registered: ${newUser.email} (ID: ${newUser.id})`);
    
    // Return success (don't auto-login, make them log in)
    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// =====================================================
// POST /auth/login
// Authenticates user and returns JWT token
// =====================================================

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing fields',
        message: 'Email and password are required' 
      });
    }
    
    // Find user by email
    const result = await pool.query(
      'SELECT id, email, password_hash, is_active, subscription_tier FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect' 
      });
    }
    
    const user = result.rows[0];
    
    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled' 
      });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect' 
      });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    console.log(`✅ User logged in: ${user.email} (ID: ${user.id})`);
    
    // Return token and user info
    res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;