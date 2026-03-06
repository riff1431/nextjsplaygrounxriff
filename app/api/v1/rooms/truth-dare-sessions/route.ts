import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** Platform fee charged to creator per session (USD). */
const DEFAULT_CREATOR_FEE = 10;

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

            // Fetch join request counts for private sessions (via room_requests)
            const privateSessions = (sessions || []).filter((s: any) => s.session_type === "private" || s.is_private);
            const privateRoomIds = privateSessions.map((s: any) => s.room_id);

            if (privateRoomIds.length > 0) {
                const { data: requests } = await supabase
                    .from("room_requests")
                    .select("room_id, status")
                    .in("room_id", privateRoomIds)
                    .eq("status", "pending");

                if (requests) {
                    // Map room_id request count to session_id
                    for (const s of privateSessions) {
                        const count = requests.filter((r: any) => r.room_id === s.room_id).length;
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
        const { title, description, session_type, price, room_id } = body;

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

        // 2. Get configurable fee from admin_settings
        let creatorFee = DEFAULT_CREATOR_FEE;
        const { data: feeSetting } = await supabase
            .from("admin_settings")
            .select("value")
            .eq("key", "truth_dare_creator_fee")
            .single();

        if (feeSetting?.value) {
            const parsed = typeof feeSetting.value === "string"
                ? Number(JSON.parse(feeSetting.value))
                : Number(feeSetting.value);
            if (!isNaN(parsed) && parsed > 0) creatorFee = parsed;
        }

        // 3. Deduct creator fee via deduct_balance RPC
        const { error: deductError } = await supabase.rpc("deduct_balance", {
            p_user_id: user.id,
            p_amount: creatorFee,
        });

        if (deductError) {
            console.error("Deduct error :", deductError);
            return NextResponse.json({
                error: deductError.message || "Insufficient wallet balance to pay session fee",
                required_fee: creatorFee,
            }, { status: 400 });
        }

        // Fetch updated balance to return
        const { data: walletData } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .single();

        const new_balance = walletData?.balance || 0;

        // 4. Create session record
        const isPrivate = session_type === "private";
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
            title: "Session Created! 🎮",
            message: `"${title}" is now live. $${creatorFee} platform fee charged.`,
            link: `/creator/rooms/truth-or-dare`,
            metadata: { session_id: session.id, fee: creatorFee },
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
