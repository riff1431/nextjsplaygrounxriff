import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { PaymentSetting } from '@/types/payment';

export async function GET() {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('payment_settings')
            .select('id, provider, is_enabled, config, created_at, updated_at'); // Exclude secret_config

        if (error) {
            // Table likely doesn't exist or RLS issue. Return defaults for dev.
            console.warn("Error fetching payment settings (using defaults):", error.message);
            return NextResponse.json(getDefaultSettings());
        }

        if (!data || data.length === 0) {
            return NextResponse.json(getDefaultSettings());
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("Internal error fetching payment settings:", err);
        return NextResponse.json(getDefaultSettings(), { status: 500 });
    }
}

function getDefaultSettings(): PaymentSetting[] {
    // Fallback defaults if DB is not ready
    const now = new Date().toISOString();
    return [
        {
            id: 'default-stripe',
            provider: 'stripe',
            is_enabled: false,
            config: { public_key: '' },
            created_at: now,
            updated_at: now
        },
        {
            id: 'default-paypal',
            provider: 'paypal',
            is_enabled: true,
            config: { client_id: '' },
            created_at: now,
            updated_at: now
        },
        {
            id: 'default-bank',
            provider: 'bank',
            // Enable Bank by default for demo as requested by user plan (sort of)
            is_enabled: true,
            config: {
                bank_name: 'Demo Bank',
                account_name: 'PlaygroundX',
                account_number: '****',
                swift: 'DEMO'
            },
            created_at: now,
            updated_at: now
        }
    ];
}
