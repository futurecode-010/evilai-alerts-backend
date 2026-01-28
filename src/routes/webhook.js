const express = require('express');
const pool = require('../config/database');
const { parseAlert } = require('../services/alertParser');
const { shouldNotifyUser } = require('../services/filterService');
const { sendPushNotification } = require('../services/notificationService');

const router = express.Router();

// POST /webhook/tradingview
router.post('/tradingview', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('INCOMING WEBHOOK');
    console.log('='.repeat(60));
    
    const alert = parseAlert(req.body);
    
    if (!alert.isValid) {
      console.log('Could not parse alert, ignoring');
      return res.status(200).send('OK - Invalid alert format');
    }
    
    const usersResult = await pool.query(`
      SELECT u.id, u.email, u.fcm_token, f.enable_b_bullish, f.enable_b_bearish, f.enable_a_bullish, f.enable_a_bearish, f.min_win_rate, f.min_ev, f.min_sample_size, f.filter_mode
      FROM users u
      JOIN user_filters f ON u.id = f.user_id
      WHERE u.is_active = true
    `);
    
    const users = usersResult.rows;
    console.log('Found ' + users.length + ' active users');
    
    let sentCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      const filterResult = shouldNotifyUser(user, alert);
      
      if (filterResult.notify) {
        const sendResult = await sendPushNotification(user, alert);
        if (sendResult.success) {
          sentCount++;
        }
      } else {
        skippedCount++;
        console.log('Skipped user ' + user.id + ': ' + filterResult.reason);
      }
    }
    
    console.log('\nSUMMARY: Sent to ' + sentCount + ' users, skipped ' + skippedCount);
    console.log('='.repeat(60) + '\n');
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// GET /webhook/test
router.get('/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Webhook endpoint is working', 
    timestamp: new Date().toISOString() 
  });
});

module.exports = router;