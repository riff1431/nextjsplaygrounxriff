import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const creatorId = '594ad763-2614-4790-99b2-6009fff14e6e';
  
  console.log('--- 1. Profile Query ---');
  const profileRes = await supabase
    .from("profiles")
    .select("username, avatar_url, full_name, bio, location, cover_url, subscription_price_weekly, subscription_price_monthly")
    .eq("id", creatorId)
    .single();
  console.log('Profile:', profileRes.error ? profileRes.error.message : 'Success');

  console.log('--- 2. Rooms Query ---');
  const roomsRes = await supabase
    .from("rooms")
    .select("id, title, type, status, created_at")
    .eq("host_id", creatorId);
  console.log('Rooms:', roomsRes.error ? roomsRes.error.message : 'Success: ' + roomsRes.data.length + ' rooms');

  console.log('--- 3. Followers Query ---');
  const followersRes = await supabase
    .from("followers")
    .select("id", { count: "exact", head: true })
    .eq("following_id", creatorId);
  console.log('Followers:', followersRes.error ? followersRes.error.message : 'Success: ' + followersRes.count);

  console.log('--- 4. Follows Query ---');
  const followsRes = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", creatorId);
  console.log('Follows:', followsRes.error ? followsRes.error.message : 'Success: ' + followsRes.count);

  console.log('--- 5. Subscriptions Query ---');
  const subsRes = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .eq("status", "active");
  console.log('Subscriptions:', subsRes.error ? subsRes.error.message : 'Success: ' + subsRes.count);

  console.log('--- 6. Active Subs Query ---');
  const activeSubsRes = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("creator_id", creatorId)
    .eq("status", "active");
  console.log('Active Subs:', activeSubsRes.error ? activeSubsRes.error.message : 'Success: ' + activeSubsRes.data.length + ' rows');
}

check().catch(console.error);
