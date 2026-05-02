import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
// Try using ANON key instead of SERVICE ROLE to simulate a real user
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: { user }, error: err1 } = await supabase.auth.getUser();
  console.log("User:", user?.id, err1);

  // Authenticate as a test user
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'fan@example.com', // guess an email or just sign up a new one
    password: 'password'
  });
  console.log("Auth:", authErr ? authErr.message : authData.user?.id);
  
  if (authData?.user) {
      const insertPayload = {
          room_id: '0e3a38dc-f84d-463e-afac-b20e70fca8dd',
          sender_id: authData.user.id,
          sender_name: 'Fan Test',
          body: 'test message fan',
          lane: 'Free',
          paid_amount: 0,
          status: 'Queued'
      };
      const { data, error } = await supabase.from('x_chat_messages').insert(insertPayload).select().single();
      console.log("Error inserting:", error);
  }
}
run();
