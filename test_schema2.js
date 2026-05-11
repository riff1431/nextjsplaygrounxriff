require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
  const req = await supabase.from('x_chat_requests').select('session_id').limit(1);
  console.log("x_chat_requests session_id:", req.error?.message || "exists");

  const react = await supabase.from('x_chat_reactions').select('session_id').limit(1);
  console.log("x_chat_reactions session_id:", react.error?.message || "exists");
}

checkSchema();
