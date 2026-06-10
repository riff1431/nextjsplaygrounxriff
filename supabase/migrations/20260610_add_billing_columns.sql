-- Migration to add dynamic per-minute billing columns to room_settings
-- Created: 2026-06-10

-- 1. Add columns to room_settings if they do not exist
ALTER TABLE public.room_settings 
ADD COLUMN IF NOT EXISTS free_minutes integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS min_wallet_balance numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS creator_split_percent numeric DEFAULT 85,
ADD COLUMN IF NOT EXISTS platform_split_percent numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS auto_kick_on_insufficient boolean DEFAULT true;

-- 2. Seed 'vip-rooms' setting if not exists
INSERT INTO public.room_settings (
    room_type,
    display_name,
    is_active,
    public_sessions_enabled,
    private_sessions_enabled,
    public_entry_fee,
    min_private_entry_fee,
    public_cost_per_min,
    min_private_cost_per_min,
    billing_enabled,
    tips_enabled,
    custom_requests_enabled,
    free_minutes,
    min_wallet_balance,
    creator_split_percent,
    platform_split_percent,
    auto_kick_on_insufficient,
    entry_info_section1,
    entry_info_section2,
    entry_info_section3,
    entry_info_pro_tip
) VALUES (
    'vip-rooms',
    'VIP Rooms',
    true,
    true,
    true,
    20,
    50,
    5,
    10,
    true,
    true,
    true,
    1,
    20,
    85,
    15,
    true,
    '{"title": "What Happens Here", "items": [{"emoji": "👑", "text": "Exclusive interactions in private VIP lounges"}, {"emoji": "🎥", "text": "Ultra-premium broadcasts for elite fans"}, {"emoji": "💬", "text": "One-on-one personal conversations"}]}'::jsonb,
    '{"title": "How to Participate", "items": [{"emoji": "1️⃣", "text": "Maintain minimum required wallet balance"}, {"emoji": "2️⃣", "text": "Unlock entry to watch and message creator"}]}'::jsonb,
    '{"title": "Ways to Spend", "items": [{"emoji": "💎", "text": "VIP tip boosts and reactions"}, {"emoji": "🎁", "text": "Send premium virtual gifts"}]}'::jsonb,
    'VIP rooms are private by default, offering closer engagement with creators!'
) ON CONFLICT (room_type) DO NOTHING;

-- 3. Update default key global_pricing in admin_settings to include these properties
UPDATE public.admin_settings
SET value = value || '{"per_minute_billing_enabled": true, "free_minutes": 1, "min_wallet_balance": 10, "creator_split_percent": 85, "platform_split_percent": 15, "auto_kick_on_insufficient": true}'::jsonb
WHERE key = 'global_pricing';
