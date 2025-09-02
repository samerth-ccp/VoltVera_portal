-- Migration: Fix KYC Documents document_url constraint
-- ===================================================

-- Make document_url column nullable since we're now storing documents as binary data
ALTER TABLE kyc_documents ALTER COLUMN document_url DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN kyc_documents.document_url IS 'Legacy URL field - now optional since documents are stored as binary data in document_data column';
