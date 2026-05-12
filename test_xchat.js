const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data: messages } = await supabase.from('x_chat_messages').select('*').order('created_at', { ascending: false }).limit(5);
    console.log(messages);
}
check();
