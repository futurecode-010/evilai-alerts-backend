const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const alertParser = require('../services/alertParser');
const filterService = require('../services/filterService');
const notificationService = require('../services/notificationService');

router.post('/tradingview', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('INCOMING WEBHOOK');
    console.log('='.repeat(60));
    
    const rawMessage = req.body.message || req.body.text || JSON.stringify(req.body);
    console.log('📨 Raw:', JSON.stringify(req.body));
    
    const alert = alertParser.parse(req.body);
    
    if (!alert) {
      console.log('❌ Failed to parse alert');
      return res.status(400).json({ error: 'Invalid alert format' });
    }
    
    console.log('✅ Parsed:', alert.type, alert.action, 'price:', alert.price);

    const usersResult = await pool.query(`
      SELECT id, email, fcm_token, web_push_subscription, 
             min_win_rate, min_ev, min_sample_size 
      FROM users 
      WHERE is_active = true
    `);

    const users = usersResult.rows;
    console.log('Found ' + users.length + ' active users');

    let sentCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      if (!filterService.passesFilters(alert, user)) {
        console.log('User ' + user.id + ' filtered out');
        skippedCount++;
        continue;
      }

      console.log('✅ User ' + user.id + ' passes filters');

      // Save alert to database
      try {
        await pool.query(`
          INSERT INTO alerts (user_id, type, direction, price, tp, sl, win_rate, ev, sample_size, raw_message, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, [
          user.id,
          alert.type,
          alert.direction,
          alert.price || alert.entry,
          alert.target,
          alert.stop,
          alert.winRate,
          alert.ev,
          alert.sampleSize,
          JSON.stringify(alert.raw)
        ]);
        console.log('✅ Alert saved to DB for user ' + user.id);
      } catch (dbErr) {
        console.error('DB insert error:', dbErr.message);
      }

      if (!user.fcm_token && !user.web_push_subscription) {
        console.log('User ' + user.id + ' has no notification method');
        continue;
      }

      try {
        const result = await notificationService.sendToUser(user, alert);
        if (result.fcm || result.webpush) {
          sentCount++;
          console.log('✅ Notification sent to user ' + user.id);
        }
      } catch (error) {
        console.error('Failed to notify user ' + user.id + ':', error.message);
      }
    }

    console.log('\nSUMMARY: Sent to ' + sentCount + ', skipped ' + skippedCount);
    console.log('='.repeat(60) + '\n');

    res.json({ success: true, sent: sentCount, skipped: skippedCount });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

module.exports = router;
