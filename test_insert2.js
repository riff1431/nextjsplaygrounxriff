require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testInsert() {
  const roomId = "0e3a38dc-f84d-463e-afac-b20e70fca8dd";
  const { data: sessions } = await supabase.from('room_sessions').select('id').eq('room_id', roomId).limit(1);
  const sessionId = sessions && sessions.length > 0 ? sessions[0].id : null;
  console.log("Found session:", sessionId);

  const payload = {
    room_id: roomId,
    sender_name: "test",
    body: "test message 2",
    lane: "Free",
    paid_amount: 0,
    status: "Queued"
  };
  if (sessionId) payload.session_id = sessionId;

  const { data, error } = await supabase.from('x_chat_messages').insert(payload).select().single();
  console.log("Insert result with session:", { data, error });
}

testInsert();
