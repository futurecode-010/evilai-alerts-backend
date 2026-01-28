/**
 * SERVER ENTRY POINT
 * 
 * This starts the Express server.
 */

// Load environment variables FIRST (before anything else)
require('dotenv').config();

// Import the app
const app = require('./src/app');

// Import database to test connection on startup
require('./src/config/database');

// Get port from environment or default to 3000
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 EvilAI Alert Server Started');
  console.log('='.repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(50) + '\n');
});