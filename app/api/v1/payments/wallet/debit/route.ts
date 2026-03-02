import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/payments/wallet/debit
 * Atomically debit fan wallet + credit creator wallet + log transaction.
 * This is a generic endpoint — room-specific endpoints should use this pattern
 * but call transfer_funds RPC directly.
 *
 * Body: { toUserId, amount, description, roomId?, relatedType?, relatedId? }
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { toUserId, amount, description, roomId, relatedType, relatedId } = body;

    if (!toUserId || !amount || amount <= 0 || !description) {
        return NextResponse.json({ error: "Missing required fields: toUserId, amount, description" }, { status: 400 });
    }

    // Use the atomic transfer_funds RPC
    const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
        p_from_user_id: user.id,
        p_to_user_id: toUserId,
        p_amount: amount,
        p_description: description,
        p_room_id: roomId || null,
        p_related_type: relatedType || null,
        p_related_id: relatedId || null,
    });

    if (rpcError) {
        return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    if (!result?.success) {
        return NextResponse.json(
            { error: result?.error || "Transfer failed", balance: result?.balance },
            { status: 400 }
        );
    }

    return NextResponse.json({
        success: true,
        debit_tx_id: result.debit_tx_id,
        credit_tx_id: result.credit_tx_id,
        amount: result.amount,
        new_balance: result.new_balance,
    });
}
