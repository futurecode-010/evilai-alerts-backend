const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const alertParser = require('../services/alertParser');
const filterService = require('../services/filterService');
const notificationService = require('../services/notificationService');

/**
 * POST /webhook/tradingview
 * Receives alerts from TradingView and forwards to users
 */
router.post('/tradingview', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('INCOMING WEBHOOK');
    console.log('='.repeat(60));
    
    // Parse the incoming alert
    const rawMessage = req.body.message || req.body.text || JSON.stringify(req.body);
    console.log(`📨 Parsing alert: ${JSON.stringify(req.body)}`);
    
    const alert = alertParser.parse(rawMessage);
    console.log('✅ Parsed alert:', alert);

    // Get all active users with their filter settings
    const usersResult = await pool.query(`
      SELECT id, email, fcm_token, web_push_subscription, 
             min_win_rate, min_ev, min_sample_size 
      FROM users 
      WHERE is_active = true
    `);

    const users = usersResult.rows;
    console.log(`Found ${users.length} active users`);

    let sentCount = 0;
    let skippedCount = 0;

    // Process each user
    for (const user of users) {
      // Check if alert passes user's filters
      if (!filterService.passesFilters(alert, user)) {
        console.log(`User ${user.id} filtered out (doesn't meet criteria)`);
        skippedCount++;
        continue;
      }

      // Check if user has any notification method
      if (!user.fcm_token && !user.web_push_subscription) {
        console.log(`User ${user.id} has no notification method, skipping`);
        continue;
      }

      // Send notification
      try {
        const result = await notificationService.sendToUser(user, alert);
        if (result.fcm || result.webpush) {
          sentCount++;
          console.log(`✅ Notification sent to user ${user.id}`);
        }
      } catch (error) {
        console.error(`Failed to notify user ${user.id}:`, error.message);
      }
    }

    console.log(`\nSUMMARY: Sent to ${sentCount} users, skipped ${skippedCount}`);
    console.log('='.repeat(60) + '\n');

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

module.exports = router;
