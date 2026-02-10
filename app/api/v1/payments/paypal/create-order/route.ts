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

        const { amount, roomId } = await req.json();

        // Validate amount/room basically
        if (!amount || !roomId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const accessToken = await generatePayPalAccessToken();
        const base = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

        const response = await fetch(`${base}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        reference_id: roomId, // Store roomId as reference
                        custom_id: user.id,   // Store userId as custom_id
                        amount: {
                            currency_code: "USD",
                            value: amount.toString(),
                        },
                    },
                ],
            }),
        });

        const order = await response.json();

        if (!response.ok) {
            throw new Error(order.error_description || "Failed to create PayPal order");
        }

        return NextResponse.json({ id: order.id });
    } catch (error: any) {
        console.error("PayPal Create Order Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
