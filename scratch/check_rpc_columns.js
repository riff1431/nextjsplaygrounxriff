const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkRpc() {
    const { data, error } = await supabase.rpc('get_creators_with_stats');
    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC returned rows:", data.length);
        if (data.length > 0) {
            console.log("Columns in first row:", Object.keys(data[0]));
            console.log("Sample row:", JSON.stringify(data[0], null, 2));
        }
    }
}

checkRpc();
