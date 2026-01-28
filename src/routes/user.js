/**
 * USER ROUTES
 * 
 * Handles user settings and preferences.
 * All routes require authentication.
 */

const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes in this file
router.use(authMiddleware);

// =====================================================
// GET /user/filters
// Gets the current user's filter settings
// =====================================================

router.get('/filters', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        enable_b_bullish,
        enable_b_bearish,
        enable_a_bullish,
        enable_a_bearish,
        min_win_rate,
        min_ev,
        min_sample_size,
        min_rr,
        filter_mode
      FROM user_filters 
      WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // This shouldn't happen due to trigger, but just in case
      return res.status(404).json({ error: 'Filter settings not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: 'Failed to get filter settings' });
  }
});

// =====================================================
// PUT /user/filters
// Updates the current user's filter settings
// =====================================================

router.put('/filters', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      enable_b_bullish,
      enable_b_bearish,
      enable_a_bullish,
      enable_a_bearish,
      min_win_rate,
      min_ev,
      min_sample_size,
      min_rr,
      filter_mode
    } = req.body;
    
    // Validate filter_mode
    const validModes = ['NONE', 'WR', 'EV', 'BOTH', 'EITHER'];
    if (filter_mode && !validModes.includes(filter_mode)) {
      return res.status(400).json({ 
        error: 'Invalid filter mode',
        message: `filter_mode must be one of: ${validModes.join(', ')}`
      });
    }
    
    // Update the settings
    const result = await pool.query(
      `UPDATE user_filters SET
        enable_b_bullish = COALESCE($1, enable_b_bullish),
        enable_b_bearish = COALESCE($2, enable_b_bearish),
        enable_a_bullish = COALESCE($3, enable_a_bullish),
        enable_a_bearish = COALESCE($4, enable_a_bearish),
        min_win_rate = COALESCE($5, min_win_rate),
        min_ev = COALESCE($6, min_ev),
        min_sample_size = COALESCE($7, min_sample_size),
        min_rr = COALESCE($8, min_rr),
        filter_mode = COALESCE($9, filter_mode),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $10
      RETURNING *`,
      [
        enable_b_bullish,
        enable_b_bearish,
        enable_a_bullish,
        enable_a_bearish,
        min_win_rate,
        min_ev,
        min_sample_size,
        min_rr,
        filter_mode,
        userId
      ]
    );
    
    console.log(`✅ User ${userId} updated filter settings`);
    
    res.json({
      message: 'Filter settings updated',
      filters: result.rows[0]
    });
    
  } catch (error) {
    console.error('Update filters error:', error);
    res.status(500).json({ error: 'Failed to update filter settings' });
  }
});

// =====================================================
// POST /user/fcm-token
// Updates the user's FCM token for push notifications
// =====================================================

router.post('/fcm-token', async (req, res) => {
  try {
    const userId = req.user.id;
    const { fcm_token } = req.body;
    
    if (!fcm_token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }
    
    await pool.query(
      'UPDATE users SET fcm_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [fcm_token, userId]
    );
    
    console.log(`✅ User ${userId} updated FCM token`);
    
    res.json({ message: 'FCM token updated' });
    
  } catch (error) {
    console.error('FCM token update error:', error);
    res.status(500).json({ error: 'Failed to update FCM token' });
  }
});

// =====================================================
// GET /user/profile
// Gets the current user's profile info
// =====================================================

router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, email, subscription_tier, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router;