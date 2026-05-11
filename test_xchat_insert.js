import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const payload = {
    room_id: 'feca9e5c-0ccc-408b-bc69-42d2280ad567',
    sender_name: 'maria anne',
    body: 'Hello with session_id',
    lane: 'Free',
    paid_amount: 0,
    status: 'Queued',
    session_id: '47dee3d8-5b4d-48af-91cb-71280fa7c4d5' // Example UUID
  };
  
  console.log("Attempting to insert:", payload);
  const { data, error } = await supabase.from('x_chat_messages').insert(payload).select();
  
  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success:", data);
  }
}

testInsert();
