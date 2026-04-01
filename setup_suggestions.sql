-- Platform Suggestions Table

CREATE TABLE IF NOT EXISTS public.platform_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'implemented', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.platform_suggestions ENABLE ROW LEVEL SECURITY;

-- Drops existing policies before creating to allow easy updating
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON public.platform_suggestions;
DROP POLICY IF EXISTS "Users can view their own suggestions" ON public.platform_suggestions;
DROP POLICY IF EXISTS "Admins can view all suggestions" ON public.platform_suggestions;
DROP POLICY IF EXISTS "Admins can update suggestions" ON public.platform_suggestions;

-- Allow users to insert their own suggestions
CREATE POLICY "Users can insert their own suggestions" 
    ON public.platform_suggestions 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own suggestions (Fixes front-end submit error)
CREATE POLICY "Users can view their own suggestions" 
    ON public.platform_suggestions 
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Allow admins to see all suggestions
CREATE POLICY "Admins can view all suggestions" 
    ON public.platform_suggestions 
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
        )
    );

-- Allow admins to update suggestions
CREATE POLICY "Admins can update suggestions" 
    ON public.platform_suggestions 
    FOR UPDATE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
        )
    );
