
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

        if (!game.is_private) {
            return NextResponse.json({ error: "Session is free" }, { status: 400 });
        }

        const price = Number(game.unlock_price);

        // 2. Check if already unlocked
        const { data: existing } = await supabase
            .from('truth_dare_unlocks')
            .select('id')
            .eq('room_id', roomId)
            .eq('fan_id', user.id)
            .single();

        if (existing) {
            return NextResponse.json({ success: true, message: "Already unlocked" });
        }

        // 3. Process Payment (Mock Wallet Deduction)
        // In real app, check 'profiles' wallet_balance > price -> decrement -> transaction log
        const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.wallet_balance || 0) < price) {
            return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
        }

        // Deduct using ad-hoc update if RPC fails or not present, but try safe way
        const newBalance = (profile.wallet_balance || 0) - price;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBalance })
            .eq('id', user.id);

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
