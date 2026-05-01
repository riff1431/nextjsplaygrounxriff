const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.rpc('get_policies', { table_name: 'confession_requests' }).catch(() => ({ data: 'rpc failed' }));
    
    // Let's use a standard query if RPC doesn't exist
    const { data: dbData } = await supabase.from('confession_requests').select('creator_id, fan_id').limit(1);
    console.log("DB Data:", dbData);
}
check();
