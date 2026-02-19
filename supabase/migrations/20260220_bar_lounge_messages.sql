-- Create table for Bar Lounge chat messages
CREATE TABLE IF NOT EXISTS public.bar_lounge_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    handle TEXT,
    content TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bar_lounge_messages ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bar_lounge_messages' AND policyname = 'Public can view messages'
    ) THEN
        CREATE POLICY "Public can view messages" ON public.bar_lounge_messages
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bar_lounge_messages' AND policyname = 'Authenticated users can insert messages'
    ) THEN
        CREATE POLICY "Authenticated users can insert messages" ON public.bar_lounge_messages
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
