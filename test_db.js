import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error } = await supabase.from('bar_lounge_messages').select('session_id').limit(1);
  console.log("bar_lounge_messages session_id:", error ? error.message : "Exists");
  const { error: err2 } = await supabase.from('chat_messages').select('session_id').limit(1);
  console.log("chat_messages session_id:", err2 ? err2.message : "Exists");
}
run();
