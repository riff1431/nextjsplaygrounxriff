
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function enableStripe() {
    console.log('Enabling Stripe...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase Service Key');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('payment_settings')
        .update({ is_enabled: true })
        .eq('provider', 'stripe')
        .select();

    if (error) {
        console.error('Error enabling Stripe:', error);
    } else {
        console.log('Stripe enabled:', data);
    }
}

enableStripe();
