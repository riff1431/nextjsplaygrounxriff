const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('x_chat_messages').select('sender_name, body').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}
run();
