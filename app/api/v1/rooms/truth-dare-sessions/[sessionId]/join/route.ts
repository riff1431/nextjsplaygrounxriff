import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const PLATFORM_ACCOUNT_ID = process.env.PLATFORM_ACCOUNT_ID || "00000000-0000-0000-0000-000000000001";

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/truth-dare-sessions/[sessionId]/join
// Fan joins a session (public: instant, private: request)
// Body: { }  (session price is taken from session record)
// ──────────────────────────────────────────────────
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const supabase = await createClient();
    const { sessionId } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Fetch session
        const { data: session, error: sessionErr } = await supabase
            .from("truth_dare_sessions")
            .select("*, room:rooms(id, host_id)")
            .eq("id", sessionId)
            .single();

        if (sessionErr || !session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (session.status !== "active") {
            return NextResponse.json({ error: "Session is no longer active" }, { status: 400 });
        }

        // 2. Check if already a participant
        const { data: existing } = await supabase
            .from("truth_dare_session_participants")
            .select("id")
            .eq("session_id", sessionId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: "Already joined this session", already_joined: true }, { status: 409 });
        }

        // 3. Handle based on session type
        const isPrivate = session.is_private || session.session_type === "private";

        if (isPrivate) {
            // Check for existing request (using room_join_requests table)
            const { data: existingReq } = await supabase
                .from("room_join_requests")
                .select("id, status")
                .eq("session_id", sessionId)
                .eq("user_id", user.id)
                .maybeSingle();

            if (existingReq) {
                if (existingReq.status === "pending") {
                    return NextResponse.json({ error: "Request already pending", request_status: "pending" }, { status: 409 });
                }
                if (existingReq.status === "rejected") {
                    return NextResponse.json({ error: "Your request was declined", request_status: "rejected" }, { status: 403 });
                }
                if (existingReq.status === "approved") {
                    // Approved — proceed to payment and add participant
                    return await addParticipantWithPayment(supabase, session, user, sessionId);
                }
            }

            // Create join request
            const { error: reqError } = await supabase
                .from("room_join_requests")
                .insert({
                    session_id: sessionId,
                    user_id: user.id,
                    status: "pending",
                });

            if (reqError) {
                if (reqError.code === "23505") {
                    return NextResponse.json({ error: "Request already exists" }, { status: 409 });
                }
                throw reqError;
            }

            // Notify creator
            const { data: fanProfile } = await supabase
                .from("profiles")
                .select("full_name, username, avatar_url")
                .eq("id", user.id)
                .single();

            await supabase.from("notifications").insert({
                user_id: session.creator_id || session.room?.host_id,
                actor_id: user.id,
                type: "truth_dare_join_request",
                message: `${fanProfile?.full_name || fanProfile?.username || "A fan"} wants to join "${session.title}"`,
                reference_id: sessionId,
            });

            return NextResponse.json({ success: true, status: "pending", message: "Join request sent! Awaiting creator approval." });
        } else {
            // Public session — instant join with payment
            return await addParticipantWithPayment(supabase, session, user, sessionId);
        }
    } catch (err: any) {
        console.error("Join session error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function addParticipantWithPayment(
    supabase: any,
    session: any,
    user: any,
    sessionId: string
) {
    const price = Number(session.price) || 0;
    const creatorId = session.creator_id || session.room?.host_id;

    // Charge fan if price > 0
    if (price > 0 && creatorId) {
        const { data: result, error: payError } = await supabase.rpc("transfer_funds", {
            p_from_user_id: user.id,
            p_to_user_id: creatorId,
            p_amount: price,
            p_description: `Truth or Dare session entry: "${session.title}"`,
            p_room_id: session.room_id,
            p_related_type: "truth_dare_session_entry",
            p_related_id: sessionId,
        });

        if (payError) {
            return NextResponse.json({ error: "Payment failed: " + payError.message }, { status: 500 });
        }

        if (!result?.success) {
            return NextResponse.json({
                error: result?.error || "Insufficient wallet balance",
                required: price,
            }, { status: 400 });
        }

        // Record transaction
        await supabase.from("truth_dare_session_transactions").insert({
            session_id: sessionId,
            user_id: user.id,
            transaction_type: "fan_join_fee",
            amount: price,
            currency: "EUR",
            status: "completed",
            payment_reference: result.debit_tx_id,
        });
    }

    // Add as participant
    const { error: partError } = await supabase
        .from("truth_dare_session_participants")
        .insert({
            session_id: sessionId,
            user_id: user.id,
            role: "fan",
        });

    if (partError && partError.code !== "23505") {
        throw partError;
    }

    // Also add unlock record for compatibility with existing fan page
    await supabase.from("truth_dare_unlocks").upsert({
        room_id: session.room_id,
        fan_id: user.id,
    }, { onConflict: "room_id,fan_id" }).select();

    return NextResponse.json({
        success: true,
        status: "joined",
        message: price > 0 ? `Joined! €${price} charged.` : "Joined successfully!",
        room_id: session.room_id,
    });
}
