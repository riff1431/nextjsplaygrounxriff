require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testBar() {
  const { data, error } = await supabase.from('bar_lounge_messages').select('session_id').limit(1);
  console.log("Bar message session_id check:", { data, error });
}

testBar();
