-- Add web push subscription column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS web_push_subscription TEXT;
