/**
 * SERVER ENTRY POINT
 */

require('dotenv').config();

const app = require('./src/app');
require('./src/config/database');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 EvilAI Alert Server Started');
  console.log('='.repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(50) + '\n');
});

// Keep the server running
server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
