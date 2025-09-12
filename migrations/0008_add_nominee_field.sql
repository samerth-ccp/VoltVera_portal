-- Add nominee field to users table
ALTER TABLE users ADD COLUMN nominee varchar;

-- Add nominee field to pending_recruits table
ALTER TABLE pending_recruits ADD COLUMN nominee varchar;

-- Add new document URL fields to pending_recruits table
ALTER TABLE pending_recruits ADD COLUMN aadhaar_front_url varchar;
ALTER TABLE pending_recruits ADD COLUMN aadhaar_back_url varchar;
ALTER TABLE pending_recruits ADD COLUMN bank_cancelled_cheque_url varchar;

-- Add bank account holder name field to both tables
ALTER TABLE users ADD COLUMN bank_account_holder_name varchar;
ALTER TABLE pending_recruits ADD COLUMN bank_account_holder_name varchar;

-- Update KYC document types to support new document types
-- Note: This is a schema change that affects the application logic
-- The documentType field in kyc_documents table will now support:
-- 'pan', 'aadhaar_front', 'aadhaar_back', 'bank_cancelled_cheque', 'photo'

-- Add comments to document the changes
COMMENT ON COLUMN users.nominee IS 'Nominee name - replaces dateOfBirth field in registration';
COMMENT ON COLUMN pending_recruits.nominee IS 'Nominee name - replaces dateOfBirth field in registration';
COMMENT ON COLUMN pending_recruits.aadhaar_front_url IS 'Aadhaar card front side URL';
COMMENT ON COLUMN pending_recruits.aadhaar_back_url IS 'Aadhaar card back side URL';
COMMENT ON COLUMN pending_recruits.bank_cancelled_cheque_url IS 'Bank details or cancelled cheque URL';
COMMENT ON COLUMN users.bank_account_holder_name IS 'Bank account holder name (stored in uppercase)';
COMMENT ON COLUMN pending_recruits.bank_account_holder_name IS 'Bank account holder name (stored in uppercase)';
