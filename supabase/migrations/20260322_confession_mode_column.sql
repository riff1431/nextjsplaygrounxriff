-- Add confession_mode column: '1on1' (scoped to room/creator) or 'global' (visible to all creators)
ALTER TABLE confession_requests
  ADD COLUMN IF NOT EXISTS confession_mode TEXT NOT NULL DEFAULT '1on1'
    CHECK (confession_mode IN ('1on1', 'global'));

-- Allow any authenticated creator to view global requests
CREATE POLICY "Any creator can view global requests"
  ON confession_requests FOR SELECT
  USING (confession_mode = 'global');

-- Allow any creator to update (accept) global pending requests
CREATE POLICY "Any creator can accept global requests"
  ON confession_requests FOR UPDATE
  USING (confession_mode = 'global' AND status = 'pending_approval');
