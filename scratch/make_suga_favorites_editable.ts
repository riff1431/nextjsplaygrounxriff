import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing supabase credentials in env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
    console.log("Unlocking SUGA4U_FAVORITES in platform_split_config...");
    const { data, error } = await supabase
        .from('platform_split_config')
        .update({
            is_editable: true,
            description: 'Suga4U Favorites interactions split.'
        })
        .eq('split_key', 'SUGA4U_FAVORITES')
        .select();

    if (error) {
        console.error("Database update error:", error);
    } else {
        console.log("Successfully unlocked splits:", data);
    }
}

main();
