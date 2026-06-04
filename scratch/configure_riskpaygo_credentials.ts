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
    console.log("Updating RiskPayGo live credentials in public.payment_settings...");
    
    const config = {
        api_url: "https://riskpaygo.com/portal/api/plugin",
        return_url: "http://localhost:3000/account/wallet?status=success",
        cancel_url: "http://localhost:3000/account/wallet?status=cancelled",
        mode: "live"
    };

    const secretConfig = {
        merchant_id: "mer_E6AA8810",
        api_token: "rpg_d32f5efe13c86e389a2faf217ef8d2cb06070e0b13da6446beea32fdd15e5ea7f83848dbc3058f2147462f9a39103ea1",
        webhook_secret: "eb6ac242f394173b7c2837784f87e2a4e8604d48b36b18270897ed9dd6a237d8"
    };

    const { data, error } = await supabase
        .from('payment_settings')
        .upsert({
            provider: 'riskpaygo',
            is_enabled: true,
            config,
            secret_config: secretConfig,
            updated_at: new Date().toISOString()
        }, { onConflict: 'provider' })
        .select('provider, is_enabled, config');

    if (error) {
        console.error("Credentials update failed:", error);
    } else {
        console.log("Successfully configured RiskPayGo live credentials!", data);
    }
}

run();
