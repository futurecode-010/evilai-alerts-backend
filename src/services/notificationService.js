const admin = require('firebase-admin');
const webpush = require('web-push');

// Configure web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@evilai.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push configured');
}

class NotificationService {
  /**
   * Send push notification to a user (FCM or Web Push)
   */
  async sendToUser(user, alert) {
    const results = { fcm: null, webpush: null };

    // Try FCM (mobile app)
    if (user.fcm_token) {
      try {
        results.fcm = await this.sendFCM(user.fcm_token, alert);
      } catch (error) {
        console.error(`FCM failed for user ${user.id}:`, error.message);
      }
    }

    // Try Web Push (PWA)
    if (user.web_push_subscription) {
      try {
        results.webpush = await this.sendWebPush(user.web_push_subscription, alert);
      } catch (error) {
        console.error(`Web Push failed for user ${user.id}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Send via Firebase Cloud Messaging
   */
  async sendFCM(token, alert) {
    const message = {
      token: token,
      notification: {
        title: this.formatTitle(alert),
        body: this.formatBody(alert),
      },
      data: {
        type: alert.type,
        price: String(alert.price),
        winRate: String(alert.winRate),
        ev: String(alert.ev),
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'trading_alerts',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ FCM sent: ${response}`);
    return response;
  }

  /**
   * Send via Web Push
   */
  async sendWebPush(subscription, alert) {
    const payload = JSON.stringify({
      title: this.formatTitle(alert),
      body: this.formatBody(alert),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        type: alert.type,
        price: alert.price,
        url: '/'
      }
    });

    const response = await webpush.sendNotification(
      typeof subscription === 'string' ? JSON.parse(subscription) : subscription,
      payload
    );
    console.log(`✅ Web Push sent`);
    return response;
  }

  /**
   * Format notification title
   */
  formatTitle(alert) {
    const direction = alert.type?.includes('B') ? '🟢 LONG' : '🔴 SHORT';
    return `${direction} Signal`;
  }

  /**
   * Format notification body
   */
  formatBody(alert) {
    return `Entry: $${alert.price} | WR: ${alert.winRate} | EV: ${alert.ev}`;
  }
}

module.exports = new NotificationService();
