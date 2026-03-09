import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** Platform fee is no longer charged to creators. Kept for reference. */
const DEFAULT_CREATOR_FEE = 0;

/**
 * Platform account that receives the creator fee.
 * In production, replace with real platform/admin user ID.
 * Falls back to a dummy UUID that will cause `transfer_funds` to auto-create a wallet.
 */
const PLATFORM_ACCOUNT_ID = process.env.PLATFORM_ACCOUNT_ID || "00000000-0000-0000-0000-000000000001";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/truth-dare-sessions
// List creator's sessions with participant counts
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch sessions where this user is creator (via room host or creator_id)
        const { data: sessions, error } = await supabase
            .from("truth_dare_sessions")
            .select(`
                *,
                room:rooms!inner(id, host_id, title)
            `)
            .or(`creator_id.eq.${user.id},room.host_id.eq.${user.id}`)
            .order("started_at", { ascending: false });

        if (error) throw error;

        // Fetch participant counts per session
        const sessionIds = (sessions || []).map((s: any) => s.id);
        let participantCounts: Record<string, number> = {};
        let requestCounts: Record<string, number> = {};

        if (sessionIds.length > 0) {
            const { data: participants } = await supabase
                .from("truth_dare_session_participants")
                .select("session_id")
                .in("session_id", sessionIds);

            if (participants) {
                for (const p of participants) {
                    participantCounts[p.session_id] = (participantCounts[p.session_id] || 0) + 1;
                }
            }

            // Fetch join request counts for private sessions (via room_join_requests)
            const privateSessions = (sessions || []).filter((s: any) => s.session_type === "private" || s.is_private);
            const privateSessionIds = privateSessions.map((s: any) => s.id);

            if (privateSessionIds.length > 0) {
                const { data: requests } = await supabase
                    .from("room_join_requests")
                    .select("session_id, status")
                    .in("session_id", privateSessionIds)
                    .eq("status", "pending");

                if (requests) {
                    for (const s of privateSessions) {
                        const count = requests.filter((r: any) => r.session_id === s.id).length;
                        requestCounts[s.id] = count;
                    }
                }
            }
        }

        // Enrich sessions
        const enriched = (sessions || []).map((s: any) => ({
            ...s,
            participant_count: participantCounts[s.id] || 0,
            pending_request_count: requestCounts[s.id] || 0,
        }));

        return NextResponse.json({ sessions: enriched });
    } catch (err: any) {
        console.error("List sessions error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/truth-dare-sessions
// Create a new Truth or Dare session + deduct creator fee
// Body: { title, description?, session_type, price, room_id }
// ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title, description, session_type, price, room_id, cost_per_min } = body;

        if (!title || !room_id) {
            return NextResponse.json({ error: "Title and room_id are required" }, { status: 400 });
        }

        // 1. Verify room ownership
        const { data: room, error: roomError } = await supabase
            .from("rooms")
            .select("id, host_id")
            .eq("id", room_id)
            .single();

        if (roomError || !room || room.host_id !== user.id) {
            return NextResponse.json({ error: "Room not found or unauthorized" }, { status: 403 });
        }

        // Fee is no longer charged to creators — fans pay entry fee instead
        const creatorFee = 0;

        // Fetch wallet balance for response
        const { data: walletData } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();

        const new_balance = walletData?.balance || 0;

        // 4. Create session record
        const isPrivate = session_type === "private";

        // Validate cost per minute for private sessions
        let costPerMin = 0;
        if (isPrivate && cost_per_min !== undefined) {
            costPerMin = Number(cost_per_min) || 0;
            if (costPerMin < 4) {
                return NextResponse.json({ error: "Cost per minute must be at least $4 for private sessions" }, { status: 400 });
            }
        }

        const { data: session, error: sessionError } = await supabase
            .from("truth_dare_sessions")
            .insert({
                room_id,
                creator_id: user.id,
                title,
                description: description || null,
                session_type: session_type || "public",
                is_private: isPrivate,
                price: Number(price) || 0,
                cost_per_min: isPrivate ? costPerMin : 0,
                creator_start_fee: creatorFee,
                status: "active",
            })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // 5. Record transaction
        await supabase.from("truth_dare_session_transactions").insert({
            session_id: session.id,
            user_id: user.id,
            transaction_type: "creator_start_fee",
            amount: creatorFee,
            currency: "USD",
            status: "completed",
            payment_reference: null,
        });

        // 6. Add creator as participant
        await supabase.from("truth_dare_session_participants").insert({
            session_id: session.id,
            user_id: user.id,
            role: "creator",
        });

        // 7. Update/create game state row
        await supabase.from("truth_dare_games").upsert({
            room_id,
            session_title: title,
            session_description: description,
            is_private: isPrivate,
            unlock_price: Number(price) || 0,
            status: "active",
            updated_at: new Date().toISOString(),
        }, { onConflict: "room_id" });

        // 8. Ensure room status is live
        await supabase.from("rooms").update({ status: "live" }).eq("id", room_id);

        // 9. Notify creator
        await supabase.from("notifications").insert({
            user_id: user.id,
            type: "truth_dare_session_created",
            message: `"${title}" is now live!`,
            reference_id: session.id,
        });

        return NextResponse.json({
            success: true,
            session,
            fee_charged: creatorFee,
            new_balance: new_balance,
        });
    } catch (err: any) {
        console.error("Create session error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
