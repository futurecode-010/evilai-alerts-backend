const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const router = express.Router();

// Discord OAuth Config
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://evilai-alerts-production.up.railway.app/auth/discord/callback';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const DISCORD_PREMIUM_ROLE_ID = process.env.DISCORD_PREMIUM_ROLE_ID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://evilai-signal-app.vercel.app';

// =====================================================
// GET /auth/discord
// Redirects user to Discord OAuth
// =====================================================
router.get('/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds.members.read',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// =====================================================
// GET /auth/discord/callback
// Handles Discord OAuth callback
// =====================================================
router.get('/discord/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    console.error('Discord OAuth error:', error);
    return res.redirect(`${FRONTEND_URL}/login?error=discord_denied`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('Discord token error:', tokenData);
      return res.redirect(`${FRONTEND_URL}/login?error=token_failed`);
    }

    // Get user info from Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userResponse.json();

    console.log(`Discord user: ${discordUser.username} (${discordUser.id})`);

    // Check if user has Premium role in the guild
    const memberResponse = await fetch(
      `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!memberResponse.ok) {
      console.log(`User ${discordUser.username} is not in the server`);
      return res.redirect(`${FRONTEND_URL}/login?error=not_in_server`);
    }

    const memberData = await memberResponse.json();
    const hasPremium = memberData.roles && memberData.roles.includes(DISCORD_PREMIUM_ROLE_ID);

    if (!hasPremium) {
      console.log(`User ${discordUser.username} does not have Premium role`);
      return res.redirect(`${FRONTEND_URL}/login?error=no_premium`);
    }

    console.log(`✅ User ${discordUser.username} has Premium role`);

    // Find or create user in database
    let user;
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE discord_id = $1',
      [discordUser.id]
    );

    if (existingUser.rows.length > 0) {
      // Update existing user
      user = existingUser.rows[0];
      await pool.query(
        `UPDATE users SET 
          discord_username = $1, 
          discord_avatar = $2,
          discord_access_token = $3,
          updated_at = CURRENT_TIMESTAMP 
        WHERE discord_id = $4`,
        [discordUser.username, discordUser.avatar, tokenData.access_token, discordUser.id]
      );
      console.log(`✅ Updated user: ${discordUser.username}`);
    } else {
      // Create new user
      const result = await pool.query(
        `INSERT INTO users (discord_id, discord_username, discord_avatar, discord_access_token, email, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [
          discordUser.id,
          discordUser.username,
          discordUser.avatar,
          tokenData.access_token,
          discordUser.email || `${discordUser.id}@discord.user`
        ]
      );
      user = result.rows[0];
      console.log(`✅ Created new user: ${discordUser.username}`);
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id, discordId: discordUser.id, username: discordUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store active token for single-session enforcement
    await pool.query(
      'UPDATE users SET active_token = $1 WHERE id = $2',
      [jwtToken, user.id]
    );

    // Redirect to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${jwtToken}`);

  } catch (error) {
    console.error('Discord OAuth error:', error);
    res.redirect(`${FRONTEND_URL}/login?error=server_error`);
  }
});

// =====================================================
// POST /auth/register (kept for backwards compatibility)
// =====================================================
router.post('/register', async (req, res) => {
  res.status(403).json({ 
    error: 'Registration disabled',
    message: 'Please use Discord login to access the app' 
  });
});

// =====================================================
// POST /auth/login (kept for backwards compatibility)
// =====================================================
router.post('/login', async (req, res) => {
  res.status(403).json({ 
    error: 'Login method disabled',
    message: 'Please use Discord login to access the app' 
  });
});

module.exports = router;
