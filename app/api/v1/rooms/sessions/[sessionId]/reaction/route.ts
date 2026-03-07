import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions/[sessionId]/reaction
// Fan sends a paid reaction during session
// Body: { reaction_id, emoji, amount }
// ──────────────────────────────────────────────────
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { reaction_id, emoji } = body;

        if (!reaction_id) {
            return NextResponse.json({ error: "reaction_id required" }, { status: 400 });
        }

        // Get reaction price from catalog
        const { data: reaction, error: rxError } = await supabase
            .from("room_reaction_catalog")
            .select("id, name, emoji, price")
            .eq("id", reaction_id)
            .eq("is_active", true)
            .single();

        if (rxError || !reaction) {
            return NextResponse.json({ error: "Reaction not found or disabled" }, { status: 404 });
        }

        const amount = Number(reaction.price);

        // Get session
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, creator_id, room_id, title, status")
            .eq("id", sessionId)
            .single();

        if (!session || session.status !== "active") {
            return NextResponse.json({ error: "Session is not active" }, { status: 400 });
        }

        if (session.creator_id === user.id) {
            return NextResponse.json({ error: "Cannot react to your own session" }, { status: 400 });
        }

        // Payment
        if (amount > 0) {
            const { data: payResult, error: payError } = await supabase.rpc("transfer_funds", {
                p_from_user_id: user.id,
                p_to_user_id: session.creator_id,
                p_amount: amount,
                p_description: `Reaction ${reaction.emoji} in "${session.title}"`,
                p_room_id: session.room_id,
                p_related_type: "session_reaction",
                p_related_id: sessionId,
            });

            if (payError) throw payError;
            const result = payResult as any;
            if (!result?.success) {
                return NextResponse.json({ error: result?.error || "Insufficient balance" }, { status: 402 });
            }
        }

        // Get fan profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single();

        // Record reaction
        const { error: insertError } = await supabase.from("room_session_reactions").insert({
            session_id: sessionId,
            fan_id: user.id,
            fan_name: profile?.username || "Anonymous",
            reaction_id: reaction.id,
            emoji: reaction.emoji,
            amount,
        });

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            emoji: reaction.emoji,
            amount,
        });
    } catch (err: any) {
        console.error("Reaction error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
