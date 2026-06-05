-- Casino Backend Schema Setup

-- 1. Create casino_lounges table
CREATE TABLE IF NOT EXISTS public.casino_lounges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    creator_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    game_type TEXT NOT NULL,
    casino_game_id TEXT NOT NULL,
    min_bet NUMERIC DEFAULT 0,
    max_bet NUMERIC DEFAULT 0,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INT DEFAULT 60,
    cover_image_url TEXT,
    creator_avatar_url TEXT,
    description TEXT,
    vip_only BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'live', -- 'live', 'scheduled', 'ended'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create casino_chat_messages table
CREATE TABLE IF NOT EXISTS public.casino_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lounge_id UUID REFERENCES public.casino_lounges(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.casino_lounges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casino_chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
DROP POLICY IF EXISTS "Public read casino_lounges" ON public.casino_lounges;
CREATE POLICY "Public read casino_lounges" 
ON public.casino_lounges FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Creator manage casino_lounges" ON public.casino_lounges;
CREATE POLICY "Creator manage casino_lounges" 
ON public.casino_lounges FOR ALL 
USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Public read casino_chat" ON public.casino_chat_messages;
CREATE POLICY "Public read casino_chat" 
ON public.casino_chat_messages FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated insert casino_chat" ON public.casino_chat_messages;
CREATE POLICY "Authenticated insert casino_chat" 
ON public.casino_chat_messages FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 5. Seed the room_settings entry for the Casino room type
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
    entry_info_section1,
    entry_info_section2,
    entry_info_section3,
    entry_info_pro_tip
) VALUES (
    'casino',
    'Casino',
    true,
    true,
    true,
    0,
    0,
    0,
    0,
    false,
    true,
    true,
    '{
        "title": "What Happens Here",
        "items": [
            {"emoji": "🎲", "text": "Host or join live casino table lounges"},
            {"emoji": "🎥", "text": "Watch creators play and stream live"},
            {"emoji": "💬", "text": "Chat with the creator and other players"}
        ]
    }'::jsonb,
    '{
        "title": "How to Participate",
        "items": [
            {"emoji": "1️⃣", "text": "Select a creator''s active casino table"},
            {"emoji": "2️⃣", "text": "Join the room to access the stream and chat"},
            {"emoji": "3️⃣", "text": "Play the game on the left, interact on the right"}
        ]
    }'::jsonb,
    '{
        "title": "Ways to Spend",
        "items": [
            {"emoji": "💰", "text": "Place bets inside the casino iframe"},
            {"emoji": "💵", "text": "Tip the creator directly in the lounge"},
            {"emoji": "🎁", "text": "Send custom gifts to show support"}
        ]
    }'::jsonb,
    'Two separate wallets: your PGX wallet handles tips/gifts, while your Casino wallet handles bets!'
) ON CONFLICT (room_type) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_active = EXCLUDED.is_active,
    public_sessions_enabled = EXCLUDED.public_sessions_enabled,
    private_sessions_enabled = EXCLUDED.private_sessions_enabled,
    entry_info_section1 = EXCLUDED.entry_info_section1,
    entry_info_section2 = EXCLUDED.entry_info_section2,
    entry_info_section3 = EXCLUDED.entry_info_section3,
    entry_info_pro_tip = EXCLUDED.entry_info_pro_tip;
