const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /user/filters
 * Get user's alert filter settings
 */
router.get('/filters', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT min_win_rate, min_ev, min_sample_size FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ filters: result.rows[0] });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: 'Failed to get filters' });
  }
});

/**
 * PUT /user/filters
 * Update user's alert filter settings
 */
router.put('/filters', async (req, res) => {
  try {
    const { min_win_rate, min_ev, min_sample_size } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET min_win_rate = COALESCE($1, min_win_rate),
           min_ev = COALESCE($2, min_ev),
           min_sample_size = COALESCE($3, min_sample_size),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING min_win_rate, min_ev, min_sample_size`,
      [min_win_rate, min_ev, min_sample_size, req.user.id]
    );

    console.log(`✅ Filters updated for user ${req.user.id}`);
    res.json({ filters: result.rows[0] });
  } catch (error) {
    console.error('Update filters error:', error);
    res.status(500).json({ error: 'Failed to update filters' });
  }
});

/**
 * PUT /user/fcm-token
 * Update user's FCM token for mobile push notifications
 */
router.put('/fcm-token', async (req, res) => {
  try {
    const { fcm_token } = req.body;

    if (!fcm_token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    await pool.query(
      'UPDATE users SET fcm_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [fcm_token, req.user.id]
    );

    console.log(`✅ FCM token updated for user ${req.user.id}`);
    res.json({ message: 'FCM token updated' });
  } catch (error) {
    console.error('Update FCM token error:', error);
    res.status(500).json({ error: 'Failed to update FCM token' });
  }
});

/**
 * PUT /user/push-subscription
 * Update user's Web Push subscription for PWA notifications
 */
router.put('/push-subscription', async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ error: 'Push subscription is required' });
    }

    // Store as JSON string
    const subscriptionStr = typeof subscription === 'string' 
      ? subscription 
      : JSON.stringify(subscription);

    await pool.query(
      'UPDATE users SET web_push_subscription = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [subscriptionStr, req.user.id]
    );

    console.log(`✅ Web Push subscription updated for user ${req.user.id}`);
    res.json({ message: 'Push subscription saved' });
  } catch (error) {
    console.error('Update push subscription error:', error);
    res.status(500).json({ error: 'Failed to save push subscription' });
  }
});

/**
 * GET /user/alerts
 * Get user's alert history
 */
router.get('/alerts', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM alerts 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ alerts: result.rows });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

/**
 * GET /user/vapid-key
 * Get VAPID public key for Web Push subscription
 */
router.get('/vapid-key', (req, res) => {
  res.json({ 
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null 
  });
});

module.exports = router;
