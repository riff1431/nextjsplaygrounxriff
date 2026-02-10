-- Add subscription pricing columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_price_weekly FLOAT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_price_monthly FLOAT DEFAULT NULL;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    tier TEXT CHECK (tier IN ('weekly', 'monthly')) NOT NULL,
    status TEXT CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" 
ON subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- Creators can view subscriptions to them
CREATE POLICY "Creators can view their subscribers" 
ON subscriptions FOR SELECT 
USING (auth.uid() = creator_id);

-- Users can create subscriptions (simulated payment)
CREATE POLICY "Users can create subscriptions" 
ON subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions (e.g. cancel)
CREATE POLICY "Users can update own subscriptions" 
ON subscriptions FOR UPDATE 
USING (auth.uid() = user_id);
