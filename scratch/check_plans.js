const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkPlans() {
    const { data, error } = await supabase.from('creator_level_plans').select('*').order('sort_order', { ascending: true });
    if (error) {
        console.error("Error fetching plans:", error);
    } else {
        console.log("Plans structure:");
        data.forEach(p => {
            console.log(`ID: ${p.id} | Name: ${p.name} | Display: ${p.display_name} | Price: ${p.price}`);
        });
    }
}

checkPlans();
