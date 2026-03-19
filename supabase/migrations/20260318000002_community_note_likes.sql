-- 20260318000002_community_note_likes.sql
CREATE TABLE community_note_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES check_ins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(checkin_id, user_id)
);

CREATE INDEX idx_community_note_likes_checkin ON community_note_likes(checkin_id);

ALTER TABLE community_note_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own likes" ON community_note_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON community_note_likes
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read likes" ON community_note_likes
  FOR SELECT USING (true);
