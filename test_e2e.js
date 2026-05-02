import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log("--- Testing Fan ---");
  const { data: fanData, error: fanErr } = await supabase.auth.signInWithPassword({
    email: 'johndoe@gmail.com',
    password: 'password123'
  });
  if (fanErr) {
    console.error("Fan login error:", fanErr.message);
  } else {
    console.log("Fan logged in, UID:", fanData.user.id);
    
    // Try to send a message as Fan
    const insertPayload = {
      room_id: '0e3a38dc-f84d-463e-afac-b20e70fca8dd', // Assume a valid room id from the previous screenshot
      sender_name: 'John Doe',
      body: 'Hello from Fan E2E',
      lane: 'Free',
      paid_amount: 0,
      status: 'Queued'
    };
    const { data, error } = await supabase.from('x_chat_messages').insert(insertPayload).select().single();
    if (error) {
      console.error("Fan message send error:", error);
    } else {
      console.log("Fan message sent successfully!", data.id);
    }
  }

  // Logout Fan
  await supabase.auth.signOut();

  console.log("--- Testing Creator ---");
  const { data: creatorData, error: creatorErr } = await supabase.auth.signInWithPassword({
    email: 'greenwordpress.com@gmail.com',
    password: 'greenwordpress.com@gmail.com'
  });
  
  if (creatorErr) {
    console.error("Creator login error:", creatorErr.message);
  } else {
    console.log("Creator logged in, UID:", creatorData.user.id);
    
    // Try to send a message as Creator
    const insertPayload = {
      room_id: '0e3a38dc-f84d-463e-afac-b20e70fca8dd',
      sender_name: '🎤 Creator',
      body: 'Hello from Creator E2E',
      lane: 'Free',
      paid_amount: 0,
      status: 'Answered'
    };
    const { data, error } = await supabase.from('x_chat_messages').insert(insertPayload).select().single();
    if (error) {
      console.error("Creator message send error:", error);
    } else {
      console.log("Creator message sent successfully!", data.id);
    }
  }
}

run();
