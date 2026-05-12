import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { requestId, earnedAmount, creatorResponse } = body;
    console.log("Answer API received:", { requestId, earnedAmount, creatorResponse });

    if (!requestId) {
        return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    try {
        // 1. Update the request status to 'answered'
        const { data: updatedRequest, error: updateError } = await supabase
            .from("truth_dare_requests")
            .update({
                status: 'answered',
                answered_at: new Date().toISOString(),
                creator_response: creatorResponse // Allow empty string
            })
            .eq("id", requestId)
            .select()
            .single();

        if (updateError) {
            console.error("Failed to update request:", updateError);
            return NextResponse.json({ error: "Failed to mark as answered" }, { status: 500 });
        }

        // 2. Get the creator's user ID from the room
        const { data: room } = await supabase
            .from("rooms")
            .select("creator_id")
            .eq("id", roomId)
            .single();

        if (room?.creator_id && earnedAmount > 0) {
            // 3. Update creator's wallet balance
            const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
                user_id: room.creator_id,
                amount: earnedAmount
            });

            if (walletError) {
                console.error("Failed to update wallet:", walletError);
                // Non-fatal - continue anyway
            }
        }

        // Note: Broadcast for question_revealed is now handled client-side
        // in CreatorCountdown.tsx immediately after this API returns success.

        return NextResponse.json({
            success: true,
            request: updatedRequest,
            earnedAmount: earnedAmount || updatedRequest?.amount || 0
        });

    } catch (error) {
        console.error("Answer API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
