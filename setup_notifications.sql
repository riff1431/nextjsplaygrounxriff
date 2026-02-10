-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'like', 'follow', 'tip', 'subscribe', 'topup', 'approve', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Optional URL to redirect to
  metadata JSONB, -- fast access to related data (e.g. avatar_url, amount)
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 3. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Allow system or triggers to insert (usually service role), but for now allow authenticated to insert if they are triggering it?
-- Actually, usually notifications are created by triggers or edge functions. 
-- But for this MVP, if client-side actions trigger notifications for *other* users, we need INSERT policy.
-- E.g. User A likes User B's post -> User A inserts notification for User B.
CREATE POLICY "Authenticated users can insert notifications"
ON notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated'); 
-- Note: Ideally this should be stricter or handled by Database Triggers to prevent spam, 
-- but for "Playground" level, this is acceptable.

-- 4. Realtime
-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
