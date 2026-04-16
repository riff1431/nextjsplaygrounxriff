import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/sessions?room_type=truth-or-dare&status=active
// List sessions, optionally filtered by room_type and status
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const roomType = searchParams.get("room_type");
    const status = searchParams.get("status") || "active";

    try {
        let query = supabase
            .from("room_sessions")
            .select(`
                *,
                creator:profiles!room_sessions_creator_id_fkey(id, username, avatar_url, full_name),
                participant_count:room_session_participants(count)
            `)
            .order("started_at", { ascending: false });

        if (roomType) {
            query = query.eq("room_type", roomType);
        }
        if (status) {
            query = query.eq("status", status);
        }

        const { data: sessions, error } = await query;

        if (error) throw error;

        // Flatten participant count
        const enriched = (sessions || []).map((s: any) => ({
            ...s,
            participant_count: s.participant_count?.[0]?.count || 0,
        }));

        return NextResponse.json({ sessions: enriched });
    } catch (err: any) {
        console.error("List sessions error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────
// POST /api/v1/rooms/sessions
// Create a new session
// Body: { room_type, title, description?, session_type, price? }
// ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { room_type, title, description, session_type, price, cost_per_min } = body;

        if (!room_type || !title) {
            return NextResponse.json({ error: "room_type and title are required" }, { status: 400 });
        }

        // 1. Get room settings for this room type
        const { data: settings, error: settingsError } = await supabase
            .from("room_settings")
            .select("*")
            .eq("room_type", room_type)
            .single();

        if (settingsError || !settings) {
            return NextResponse.json({ error: "Invalid room type" }, { status: 400 });
        }

        if (!settings.is_active) {
            return NextResponse.json({ error: "This room is currently disabled" }, { status: 403 });
        }

        // 2. Validate session type
        const sType = session_type || "public";
        if (sType === "public" && !settings.public_sessions_enabled) {
            return NextResponse.json({ error: "Public sessions are disabled for this room" }, { status: 403 });
        }
        if (sType === "private" && !settings.private_sessions_enabled) {
            return NextResponse.json({ error: "Private sessions are disabled for this room" }, { status: 403 });
        }

        // 3. Determine entry fee
        let entryFee: number;
        if (sType === "public") {
            // Public fee is set by admin, not creator
            entryFee = Number(settings.public_entry_fee) || 10;
        } else {
            // Private fee is set by creator, must meet minimum
            entryFee = Number(price) || 0;
            if (entryFee < Number(settings.min_private_entry_fee)) {
                return NextResponse.json({
                    error: `Private session fee must be at least €${settings.min_private_entry_fee}`,
                }, { status: 400 });
            }
        }

        // 3b. Validate cost per minute for private sessions
        let costPerMin = 0;
        if (sType === "private" && cost_per_min !== undefined) {
            costPerMin = Number(cost_per_min) || 0;
            if (costPerMin < 4) {
                return NextResponse.json({
                    error: "Cost per minute must be at least €4 for private sessions",
                }, { status: 400 });
            }
        }

        // 4. Get or create room for this creator + room_type
        let roomId: string;
        const { data: existingRooms } = await supabase
            .from("rooms")
            .select("id")
            .eq("host_id", user.id)
            .eq("type", room_type)
            .order("created_at", { ascending: true })
            .limit(1);

        if (existingRooms && existingRooms.length > 0) {
            roomId = existingRooms[0].id;
        } else {
            const { data: newRoom, error: roomError } = await supabase
                .from("rooms")
                .insert({
                    host_id: user.id,
                    type: room_type,
                    title: `${settings.display_name} Room`,
                    slug: `${room_type}-${user.id.substring(0, 8)}`,
                    status: "offline",
                })
                .select()
                .single();

            if (roomError) throw roomError;
            roomId = newRoom.id;
        }

        // 5. Create session
        const agoraChannel = `room-session-${Date.now()}-${user.id.substring(0, 8)}`;
        const { data: session, error: sessionError } = await supabase
            .from("room_sessions")
            .insert({
                room_id: roomId,
                room_type,
                creator_id: user.id,
                title,
                description: description || null,
                session_type: sType,
                entry_fee: entryFee,
                cost_per_min: sType === "private" ? costPerMin : 0,
                status: "active",
                agora_channel: agoraChannel,
            })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // 6. Add creator as participant
        await supabase.from("room_session_participants").insert({
            session_id: session.id,
            user_id: user.id,
            role: "creator",
        });

        // 7. Set room status to live
        await supabase.from("rooms").update({ status: "live" }).eq("id", roomId);

        // 8. Create notification
        await supabase.from("notifications").insert({
            user_id: user.id,
            type: "session_created",
            message: `Your "${title}" session is now live!`,
            metadata: { session_id: session.id, room_type },
        });

        return NextResponse.json({
            success: true,
            session,
            agora_channel: agoraChannel,
        });
    } catch (err: any) {
        console.error("Create session error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
