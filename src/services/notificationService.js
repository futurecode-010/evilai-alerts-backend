const admin = require('../config/firebase');
const pool = require('../config/database');

async function sendPushNotification(user, alert) {
  if (!user.fcm_token) {
    console.log('User ' + user.id + ' has no FCM token, skipping');
    return { success: false, reason: 'No FCM token' };
  }

  const directionEmoji = alert.direction === 'bullish' ? '🟢' : '🔴';
  const arrow = alert.direction === 'bullish' ? '↑' : '↓';
  const signalName = alert.signalType + arrow;

  const title = directionEmoji + ' ' + signalName + ' Signal';

  let bodyParts = [];
  if (alert.price) bodyParts.push('Entry: ' + alert.price);
  if (alert.tp1) bodyParts.push('TP1: ' + alert.tp1);
  if (alert.stop) bodyParts.push('SL: ' + alert.stop);
  const body = bodyParts.join(' | ');

  const message = {
    token: user.fcm_token,
    notification: {
      title: title,
      body: body,
    },
    data: {
      signalType: String(alert.signalType || ''),
      direction: String(alert.direction || ''),
      price: String(alert.price || ''),
      target: String(alert.target || ''),
      tp1: String(alert.tp1 || ''),
      stop: String(alert.stop || ''),
      winRate: String(alert.winRate || ''),
      ev: String(alert.ev || ''),
      rr: String(alert.rr || ''),
      sampleSize: String(alert.sampleSize || ''),
      timestamp: alert.timestamp || new Date().toISOString(),
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'trading_alerts',
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent to user ' + user.id);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Failed to send to user ' + user.id + ':', error.message);

    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      await pool.query('UPDATE users SET fcm_token = NULL WHERE id = $1', [user.id]);
    }

    return { success: false, reason: error.message };
  }
}

module.exports = { sendPushNotification };