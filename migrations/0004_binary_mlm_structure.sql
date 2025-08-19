-- Migration: Binary MLM Structure
-- Add binary tree structure fields to users table

-- Add Binary MLM structure columns
ALTER TABLE users 
ADD COLUMN sponsor_id VARCHAR,
ADD COLUMN parent_id VARCHAR,
ADD COLUMN left_child_id VARCHAR,
ADD COLUMN right_child_id VARCHAR,
ADD COLUMN level VARCHAR DEFAULT '0';

-- Update existing position column to be more flexible (remove default)
ALTER TABLE users ALTER COLUMN position DROP DEFAULT;

-- Remove old recruiter_id reference if it exists (replaced by sponsor_id)
ALTER TABLE users DROP COLUMN IF EXISTS referred_by CASCADE;

-- Add foreign key constraints for binary tree structure
ALTER TABLE users 
ADD CONSTRAINT fk_sponsor FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_left_child FOREIGN KEY (left_child_id) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_right_child FOREIGN KEY (right_child_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for efficient tree traversal
CREATE INDEX idx_users_sponsor_id ON users(sponsor_id);
CREATE INDEX idx_users_parent_id ON users(parent_id);
CREATE INDEX idx_users_left_child_id ON users(left_child_id);
CREATE INDEX idx_users_right_child_id ON users(right_child_id);
CREATE INDEX idx_users_level ON users(level);

-- Update pending_recruits table for binary position tracking
ALTER TABLE pending_recruits 
ADD COLUMN intended_parent_id VARCHAR,
ADD CONSTRAINT fk_intended_parent FOREIGN KEY (intended_parent_id) REFERENCES users(id) ON DELETE SET NULL;