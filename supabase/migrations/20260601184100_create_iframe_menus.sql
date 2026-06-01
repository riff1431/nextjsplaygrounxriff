-- Create iframe_menus table
CREATE TABLE IF NOT EXISTS public.iframe_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT 'HelpCircle',
    color TEXT DEFAULT 'pink',
    target_role TEXT DEFAULT 'fan', -- 'fan', 'creator', 'both'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.iframe_menus ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all" ON public.iframe_menus;
DROP POLICY IF EXISTS "Enable write access for admins" ON public.iframe_menus;

-- Allow read access for everyone
CREATE POLICY "Enable read access for all" ON public.iframe_menus
    FOR SELECT USING (true);

-- Allow full access for admins (check both metadata and profile table role)
CREATE POLICY "Enable write access for admins" ON public.iframe_menus
    FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Enable realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'iframe_menus'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.iframe_menus;
    END IF;
END $$;
