
CREATE TABLE IF NOT EXISTS public.suga_creator_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    unlock_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suga_creator_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'CUTE',
    emoji TEXT NOT NULL DEFAULT '💖',
    name TEXT NOT NULL,
    description TEXT,
    buy_price NUMERIC NOT NULL DEFAULT 0,
    reveal_price NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.suga_creator_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suga_creator_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for secrets
CREATE POLICY "Secrets viewable by everyone" ON public.suga_creator_secrets FOR SELECT USING (true);
CREATE POLICY "Creators insert secrets" ON public.suga_creator_secrets FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update secrets" ON public.suga_creator_secrets FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators delete secrets" ON public.suga_creator_secrets FOR DELETE USING (auth.uid() = creator_id);

-- Policies for favorites
CREATE POLICY "Favorites viewable by everyone" ON public.suga_creator_favorites FOR SELECT USING (true);
CREATE POLICY "Creators insert favorites" ON public.suga_creator_favorites FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update favorites" ON public.suga_creator_favorites FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators delete favorites" ON public.suga_creator_favorites FOR DELETE USING (auth.uid() = creator_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.suga_creator_secrets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suga_creator_favorites;
