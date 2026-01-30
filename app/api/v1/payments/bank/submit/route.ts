import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { roomId, amount, referenceId } = body;

        if (!roomId || !amount || !referenceId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Insert pending transaction
        const { data, error } = await supabase
            .from('payment_transactions')
            .insert({
                user_id: user.id,
                room_id: roomId,
                amount: amount,
                provider: 'bank',
                status: 'pending',
                reference_id: referenceId
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating transaction:", error);
            return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 });
        }

        return NextResponse.json({ success: true, transaction: data });

    } catch (err: any) {
        console.error("Bank submit error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
