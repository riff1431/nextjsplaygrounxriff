-- Migration to update kyc_submissions for Didit integration (Fixed)
-- This adds support for automated verification sessions

-- 1. Add new columns to kyc_submissions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_submissions' AND column_name = 'didit_session_id') THEN
        ALTER TABLE kyc_submissions ADD COLUMN didit_session_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_submissions' AND column_name = 'verification_url') THEN
        ALTER TABLE kyc_submissions ADD COLUMN verification_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_submissions' AND column_name = 'decision') THEN
        ALTER TABLE kyc_submissions ADD COLUMN decision JSONB; -- Store full decision payload
    END IF;
END $$;

-- 2. Make old columns optional
-- Adjusting strictly to the current schema (document_url, selfie_url)
ALTER TABLE kyc_submissions ALTER COLUMN id_type DROP NOT NULL;
ALTER TABLE kyc_submissions ALTER COLUMN document_url DROP NOT NULL;
ALTER TABLE kyc_submissions ALTER COLUMN selfie_url DROP NOT NULL;

-- 3. Create index for faster lookup by session_id
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_didit_session_id ON kyc_submissions(didit_session_id);
