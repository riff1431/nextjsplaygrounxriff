-- Create table for global Bar Lounge configuration
CREATE TABLE IF NOT EXISTS public.admin_bar_config (
    id int PRIMARY KEY CHECK (id = 1), -- Singleton row
    vip_price numeric DEFAULT 150,
    ultra_vip_price numeric DEFAULT 400,
    spin_odds jsonb DEFAULT '[
        {"id": "o1", "label": "Pinned Message (1 min)", "odds": 30, "note": "Fan’s next message pins above chat."},
        {"id": "o2", "label": "Priority Cam (2 min)", "odds": 20, "note": "Fan badge glows; creator sees first."},
        {"id": "o3", "label": "VIP Booth Discount $50", "odds": 12, "note": "Applies to VIP Booth unlock."},
        {"id": "o4", "label": "Free +2 Minutes", "odds": 18, "note": "Adds 2 minutes of free time."},
        {"id": "o5", "label": "Creator Dares You", "odds": 10, "note": "Creator can send a dare prompt."},
        {"id": "o6", "label": "Try Again", "odds": 10, "note": "No perk, but creator shoutout."}
    ]'::jsonb,
    menu_items jsonb DEFAULT '[
        {"id": "d1", "name": "Whiskey Shot", "price": 8, "icon": "🥃", "tone": "red"},
        {"id": "d2", "name": "Neon Martini", "price": 25, "icon": "🍸", "tone": "pink"},
        {"id": "d3", "name": "Blue Lagoon", "price": 25, "icon": "🧊", "tone": "blue"},
        {"id": "d4", "name": "Champagne Bottle", "price": 100, "icon": "🍾", "tone": "yellow", "special": "champagne"},
        {"id": "d5", "name": "VIP Bottle", "price": 250, "icon": "👑", "tone": "purple", "special": "vipbottle"}
    ]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_bar_config ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'admin_bar_config' AND policyname = 'Admin full access'
    ) THEN
        CREATE POLICY "Admin full access" ON public.admin_bar_config
            FOR ALL
            USING ( (auth.jwt() ->> 'role') = 'service_role' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' )
            WITH CHECK ( (auth.jwt() ->> 'role') = 'service_role' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'admin_bar_config' AND policyname = 'Public read access'
    ) THEN
        CREATE POLICY "Public read access" ON public.admin_bar_config
            FOR SELECT
            USING ( true );
    END IF;
END $$;

-- Seed default row if not exists
INSERT INTO public.admin_bar_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
