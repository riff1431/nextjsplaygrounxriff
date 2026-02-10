-- Full Backend Schema for Competition Manager

-- 1. Enhanced Competitions Table
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS prize_pool JSONB DEFAULT '{}';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{}';
-- Ensure fan_count_paid exists (from previous step)
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS fan_count_paid INT DEFAULT 0;

-- 2. Votes Table (Audit Trail & Limits)
CREATE TABLE IF NOT EXISTS competition_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES competition_participants(id) ON DELETE CASCADE NOT NULL, -- Who received the vote
    voter_user_id UUID REFERENCES profiles(id), -- Who voted (can be null for anon if allowed, but usually auth required)
    round_index INT DEFAULT 0, -- To track "votes per round"
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tips Table (Financials)
CREATE TABLE IF NOT EXISTS competition_tips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES competition_participants(id) ON DELETE CASCADE NOT NULL, -- Who received tip
    tipper_user_id UUID REFERENCES profiles(id), -- Who tipped
    amount_cents INT NOT NULL, -- Total amount
    creator_amount_cents INT NOT NULL, -- 90%
    house_amount_cents INT NOT NULL, -- 10%
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Activity Log (Feed)
CREATE TABLE IF NOT EXISTS competition_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'vote', 'tip', 'system', 'rank_change', 'queue_update'
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_comp_votes_competition ON competition_votes(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_votes_creator ON competition_votes(creator_id);
CREATE INDEX IF NOT EXISTS idx_comp_tips_competition ON competition_tips(competition_id);
CREATE INDEX IF NOT EXISTS idx_comp_activity_competition ON competition_activity(competition_id);

-- RLS Policies

-- Votes
ALTER TABLE competition_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view votes" ON competition_votes FOR SELECT USING (true);
CREATE POLICY "Fans can vote" ON competition_votes FOR INSERT WITH CHECK (auth.uid() = voter_user_id);

-- Tips
ALTER TABLE competition_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view tips" ON competition_tips FOR SELECT USING (true);
CREATE POLICY "Fans can tip" ON competition_tips FOR INSERT WITH CHECK (auth.uid() = tipper_user_id);

-- Activity
ALTER TABLE competition_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view activity" ON competition_activity FOR SELECT USING (true);
-- System/Functions usually insert, but we allow authenticated users to view. 
-- In a real app, only server-side triggers or admin API should write to activity, 
-- but for this MVP with Next.js API routes (service role), we can rely on that or allow inserts if we move logic to client (we won't).
-- We'll allow "Creator manage" logic to insert for simulated events or client-sourced events if needed, but mainly API will do it.
CREATE POLICY "Service/Creator insert activity" ON competition_activity FOR ALL USING (
   auth.uid() IN (SELECT host_id FROM rooms WHERE id = (SELECT room_id FROM competitions WHERE id = competition_id))
);

