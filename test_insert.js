require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testInsert() {
  const roomId = "0e3a38dc-f84d-463e-afac-b20e70fca8dd"; // From screenshot
  const sessionId = "6309bb99-31e9-445e-85a0-a9cf3a778c1b"; // Best guess from URL in screenshot, wait, let me fetch it
  
  const { data: room, error: rErr } = await supabase.from('rooms').select('id').eq('id', roomId).single();
  console.log("Room check:", room, rErr);

  const payload = {
    room_id: roomId,
    sender_name: "test",
    body: "test message",
    lane: "Free",
    paid_amount: 0,
    status: "Queued"
  };

  const { data, error } = await supabase.from('x_chat_messages').insert(payload).select().single();
  console.log("Insert result:", { data, error });
}

testInsert();
