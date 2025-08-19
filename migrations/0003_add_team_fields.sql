-- Add additional team management fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_amount VARCHAR DEFAULT '0.00';
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_status VARCHAR DEFAULT 'Inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS position VARCHAR DEFAULT 'Left';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR;

-- Update existing users to have registration_date set to created_at if null
UPDATE users SET registration_date = created_at WHERE registration_date IS NULL;

-- Create pending_recruits table for admin processing workflow
CREATE TABLE IF NOT EXISTS pending_recruits (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  full_name VARCHAR NOT NULL,
  mobile VARCHAR,
  recruiter_id VARCHAR NOT NULL,
  package_amount VARCHAR DEFAULT '0.00',
  position VARCHAR DEFAULT 'Left',
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE
);