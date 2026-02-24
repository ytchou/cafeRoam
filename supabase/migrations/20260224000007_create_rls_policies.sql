-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxonomy_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ: directory browsing without auth
CREATE POLICY "shops_public_read" ON shops FOR SELECT USING (true);
CREATE POLICY "shop_photos_public_read" ON shop_photos FOR SELECT USING (true);
CREATE POLICY "shop_reviews_public_read" ON shop_reviews FOR SELECT USING (true);
CREATE POLICY "taxonomy_tags_public_read" ON taxonomy_tags FOR SELECT USING (true);
CREATE POLICY "shop_tags_public_read" ON shop_tags FOR SELECT USING (true);

-- PROFILES: users own their profile
CREATE POLICY "profiles_own_read" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- LISTS: users own their lists
CREATE POLICY "lists_own_read" ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lists_own_insert" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists_own_update" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lists_own_delete" ON lists FOR DELETE USING (auth.uid() = user_id);

-- LIST ITEMS: users manage items in their own lists
CREATE POLICY "list_items_own_read" ON list_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid())
);
CREATE POLICY "list_items_own_insert" ON list_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid())
);
CREATE POLICY "list_items_own_delete" ON list_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM lists WHERE lists.id = list_items.list_id AND lists.user_id = auth.uid())
);

-- CHECK-INS: users own their check-ins
CREATE POLICY "check_ins_own_read" ON check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "check_ins_own_insert" ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- STAMPS: users read their own stamps (system creates them)
CREATE POLICY "stamps_own_read" ON stamps FOR SELECT USING (auth.uid() = user_id);

-- JOB QUEUE: no client policies (workers use service role key which bypasses RLS)
