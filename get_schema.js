const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // try fetching one profile to see its structure
    const { data: profile } = await supabase.from('profiles').select('*, account_types!account_type_id(*), memberships!membership_id(*), creator_levels!creator_level_id(*)').limit(1).single();
    console.log(JSON.stringify(profile, null, 2));
}
run();
