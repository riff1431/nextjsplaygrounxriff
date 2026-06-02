import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing supabase credentials in env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
    console.log("Upserting RiskPayGo settings in database...");
    const { data, error } = await supabase
        .from('payment_settings')
        .upsert({
            provider: 'riskpaygo',
            is_enabled: true,
            config: {
                api_url: "https://riskpaygo.com/portal/api/plugin",
                return_url: "http://localhost:3000/account/wallet?status=success",
                cancel_url: "http://localhost:3000/account/wallet?status=cancelled",
                mode: "test"
            },
            secret_config: {
                merchant_id: "test_merchant",
                api_token: "test_token",
                webhook_secret: "test_secret"
            },
            updated_at: new Date().toISOString()
        }, { onConflict: 'provider' })
        .select();

    if (error) {
        console.error("Upsert failed:", error);
    } else {
        console.log("Successfully seeded RiskPayGo settings!", data);
    }
}

run();
