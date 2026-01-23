-- Confession Unlocks Schema

CREATE TABLE IF NOT EXISTS confession_unlocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    confession_id UUID REFERENCES confessions(id) ON DELETE CASCADE NOT NULL,
    price_paid NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, confession_id)
);

-- RLS
ALTER TABLE confession_unlocks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own unlocks" ON confession_unlocks FOR SELECT USING (
    auth.uid() = user_id
);

-- Insert usually happens via API (Service Role) or function, but allowing authenticated insert for now if we do client-side logic (which we likely won't, but safely restricting to own id)
CREATE POLICY "Users insert own unlocks" ON confession_unlocks FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- Creator can see who unlocked their confessions
CREATE POLICY "Creator view unlocks" ON confession_unlocks FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM confessions c
        JOIN rooms r ON c.room_id = r.id
        WHERE c.id = confession_unlocks.confession_id
        AND r.host_id = auth.uid()
    )
);
