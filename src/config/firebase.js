/**
 * FIREBASE CONFIGURATION
 * 
 * This file sets up Firebase Admin SDK for sending push notifications.
 */

const admin = require('firebase-admin');

// Initialize Firebase only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // The private key has \n characters that need to be converted to actual newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  console.log('✅ Firebase initialized successfully');
}

module.exports = admin;