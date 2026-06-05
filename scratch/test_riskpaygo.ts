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
    console.log("Fetching RiskPayGo settings...");
    const { data: settings, error: settingsError } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('provider', 'riskpaygo')
        .single();

    if (settingsError || !settings) {
        console.error("Failed to load settings from DB:", settingsError);
        return;
    }

    const apiUrl = settings.config.api_url;
    const merchantId = settings.secret_config.merchant_id;
    const apiToken = settings.secret_config.api_token;

    if (!apiUrl || !merchantId || !apiToken) {
        console.error("Missing required API URL, merchant ID or token");
        return;
    }

    const endpointUrl = `${apiUrl.replace(/\/$/, "")}/payments/create`;
    const testOrderId = `CONN-${Date.now().toString().slice(-6)}`;
    
    // US Customer (requires state and post_code)
    const payloadUS = {
        merchant_order_id: testOrderId,
        order_id: parseInt(testOrderId.split('-')[1]) || 9999,
        order_key: `key_${testOrderId}`,
        amount: "0.01",
        currency: "EUR",
        customer_details: {
            first_name: "TestUS",
            last_name: "Admin",
            email: "admin.test@example.com",
            country_of_residence: "US",
            state_of_residence: "FL",
            post_code: "33101",
            phone: "+13465550123",
            date_of_birth: "1990-05-20"
        },
        site: {
            url: "http://localhost:3000/",
            name: "PlaygroundX Connection Test",
            platform: "custom",
            plugin: "integracion-propia"
        },
        notify_url: "http://localhost:3000/api/v1/payments/riskpaygo/webhook",
        return_url: "http://localhost:3000/account/wallet?status=success",
        cancel_url: "http://localhost:3000/account/wallet?status=cancelled"
    };

    console.log("Sending US Customer request to:", endpointUrl);
    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
                'X-RPG-Merchant': merchantId
            },
            body: JSON.stringify(payloadUS)
        });

        const data = await response.json();
        console.log("US customer creation response status:", response.status);
        console.log("Response data:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error making US request:", err);
    }

    // Non-US Customer (no state or post_code)
    const testOrderIdGB = `CONN-GB-${Date.now().toString().slice(-6)}`;
    const payloadGB = {
        merchant_order_id: testOrderIdGB,
        order_id: 9998,
        order_key: `key_${testOrderIdGB}`,
        amount: "0.01",
        currency: "EUR",
        customer_details: {
            first_name: "TestGB",
            last_name: "Admin",
            email: "admin.test@example.com",
            country_of_residence: "GB",
            phone: "+442002001234",
            date_of_birth: "1990-01-15"
        },
        site: {
            url: "http://localhost:3000/",
            name: "PlaygroundX Connection Test",
            platform: "custom",
            plugin: "integracion-propia"
        },
        notify_url: "http://localhost:3000/api/v1/payments/riskpaygo/webhook",
        return_url: "http://localhost:3000/account/wallet?status=success",
        cancel_url: "http://localhost:3000/account/wallet?status=cancelled"
    };

    console.log("\nSending GB Customer request to:", endpointUrl);
    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiToken}`,
                'X-RPG-Merchant': merchantId
            },
            body: JSON.stringify(payloadGB)
        });

        const data = await response.json();
        console.log("GB customer creation response status:", response.status);
        console.log("Response data:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error making GB request:", err);
    }
}

run();
