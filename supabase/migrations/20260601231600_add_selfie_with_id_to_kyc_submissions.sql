-- Migration to add selfie_with_id_url to kyc_submissions
-- This supports manual KYC verification which requires uploading a selfie holding the ID card.

ALTER TABLE public.kyc_submissions ADD COLUMN IF NOT EXISTS selfie_with_id_url TEXT;
