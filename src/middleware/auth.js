/**
 * AUTHENTICATION MIDDLEWARE
 * 
 * This checks if a user is logged in before allowing access to protected routes.
 * It verifies the JWT token sent in the Authorization header.
 */

const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;
    
    // Check if header exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        message: 'Please log in to access this resource'
      });
    }
    
    // Extract the token (remove "Bearer " prefix)
    const token = authHeader.substring(7);
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get the user from database
    const result = await pool.query(
      'SELECT id, email, subscription_tier, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'Your account may have been deleted'
      });
    }
    
    const user = result.rows[0];
    
    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }
    
    // Attach user info to request object (available in route handlers)
    req.user = user;
    
    // Continue to the next middleware/route
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Please log in again'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired, please log in again'
      });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = authMiddleware;