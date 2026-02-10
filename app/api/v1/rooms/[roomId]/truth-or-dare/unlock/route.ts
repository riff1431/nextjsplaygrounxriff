
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    const supabase = await createClient();
    const { roomId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Get Game State to check price
        const { data: game } = await supabase
            .from('truth_dare_games')
            .select('unlock_price, is_private, status')
            .eq('room_id', roomId)
            .single();

        if (!game || game.status !== 'active') {
            return NextResponse.json({ error: "Session not active" }, { status: 404 });
        }

        // Public sessions can now be paid, so we proceed to payment check.

        const price = Number(game.unlock_price);
        console.log(`[Unlock Debug] Room: ${roomId}, Price: ${price}`);

        // 2. Check if already unlocked
        const { data: existing } = await supabase
            .from('truth_dare_unlocks')
            .select('id')
            .eq('room_id', roomId)
            .eq('fan_id', user.id)
            .single();

        if (existing) {
            console.log(`[Unlock Debug] Already unlocked for user ${user.id}`);
            return NextResponse.json({ success: true, message: "Already unlocked" });
        }

        // 3. Process Payment (Real System uses 'wallets' table)
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance, id') // Get ID for logging/future use
            .eq('user_id', user.id)
            .single();

        const balance = Number(wallet?.balance || 0);
        console.log(`[Unlock Debug] User: ${user.id}, Balance: ${balance}, Price: ${price} (Source: wallets table)`);

        if (balance < price) {
            console.warn(`[Unlock Debug] Insufficient Balance. Need ${price}, has ${balance}`);
            return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
        }

        // Deduct using direct update (ensure RLS allows this or use service role if needed, currently acting as user)
        const newBalance = balance - price;
        const { error: updateError } = await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('user_id', user.id);

        if (updateError) throw updateError;

        // 4. Record Unlock
        const { error: unlockError } = await supabase
            .from('truth_dare_unlocks')
            .insert({
                room_id: roomId,
                fan_id: user.id,
                amount_paid: price
            });

        if (unlockError) throw unlockError;

        return NextResponse.json({ success: true, message: "Unlocked successfully" });

    } catch (error: any) {
        console.error("Unlock Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
