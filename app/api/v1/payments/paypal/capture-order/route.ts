import { NextResponse } from 'next/server';
import { generatePayPalAccessToken } from '@/lib/paypal';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderID } = await req.json();

        const accessToken = await generatePayPalAccessToken();
        const base = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

        const response = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const capturedData = await response.json();

        if (!response.ok) {
            throw new Error(capturedData.error_description || "Failed to capture PayPal order");
        }

        // Verify Status
        if (capturedData.status === "COMPLETED") {
            const purchaseUnit = capturedData.purchase_units[0];
            const roomId = purchaseUnit.reference_id; // We stored roomId here
            const amount = purchaseUnit.payments.captures[0].amount.value;

            // 1. Record Transaction (if we had a transactions table, otherwise just create unlock)
            // For MVP: Insert directly into truth_dare_unlocks

            // Check if already unlocked to avoid duplicates
            const { data: existing } = await supabase
                .from('truth_dare_unlocks')
                .select('id')
                .eq('room_id', roomId)
                .eq('fan_id', user.id)
                .maybeSingle();

            if (!existing) {
                const { error: unlockError } = await supabase
                    .from('truth_dare_unlocks')
                    .insert({
                        room_id: roomId,
                        fan_id: user.id,
                        amount_paid: parseFloat(amount),
                        // method: 'paypal' // If we add a method column later
                    });

                if (unlockError) throw unlockError;
            }

            return NextResponse.json({ success: true, status: 'COMPLETED' });
        } else {
            return NextResponse.json({ success: false, status: capturedData.status });
        }

    } catch (error: any) {
        console.error("PayPal Capture Order Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
