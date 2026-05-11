require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRpc() {
  const { data, error } = await supabase.rpc('transfer_funds', { p_from_user_id: 'a', p_to_user_id: 'b', p_amount: 1, p_description: 'test', p_room_id: 'c' });
  console.log("RPC check:", error?.message);
}

checkRpc();
