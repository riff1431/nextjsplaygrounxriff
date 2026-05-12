const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data: session } = await supabase.from('room_sessions').select('*').eq('id', 'f0946df5-2c95-4b45-98c9-c58094c7c9ce').single();
    console.log(session);
}
check();
