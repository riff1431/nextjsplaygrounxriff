const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: rooms } = await supabase.from('rooms').select('*').eq('type', 'x-chat');
    console.log("Rooms:");
    console.log(rooms.map(r => ({id: r.id, host: r.host_id, status: r.status})));

    const { data: sessions } = await supabase.from('room_sessions').select('*');
    console.log("\nRoom Sessions:");
    console.log(sessions.map(s => ({id: s.id, room_id: s.room_id, status: s.status})));
}

check().catch(console.error);
