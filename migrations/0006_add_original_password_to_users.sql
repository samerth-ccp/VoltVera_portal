-- Migration: Add originalPassword column to users table
-- This allows admins to view the original passwords submitted during user creation

-- Add originalPassword column
ALTER TABLE users ADD COLUMN original_password TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN users.original_password IS 'Original plaintext password for admin viewing (not used for authentication)';

-- Update existing users to have a placeholder value
UPDATE users SET original_password = 'Password not available (created before this feature)' WHERE original_password IS NULL;
