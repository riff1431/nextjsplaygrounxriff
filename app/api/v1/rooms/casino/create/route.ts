import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            tableName,
            gameType,
            casinoGameId,
            minBet,
            maxBet,
            startTime,
            durationMinutes,
            coverImageUrl,
            description,
            vipOnly
        } = body;

        if (!tableName || !gameType || !casinoGameId) {
            return NextResponse.json({ error: "tableName, gameType, and casinoGameId are required" }, { status: 400 });
        }

        // 1. Get room settings for 'casino' type
        const { data: settings, error: settingsError } = await supabase
            .from("room_settings")
            .select("*")
            .eq("room_type", "casino")
            .single();

        if (settingsError || !settings) {
            return NextResponse.json({ error: "Casino room type is not configured in settings" }, { status: 500 });
        }

        if (!settings.is_active) {
            return NextResponse.json({ error: "Casino rooms are currently disabled" }, { status: 403 });
        }

        // 2. Get or create creator room of type 'casino'
        let roomId: string;
        const { data: existingRooms } = await supabase
            .from("rooms")
            .select("id")
            .eq("host_id", user.id)
            .eq("type", "casino")
            .order("created_at", { ascending: true })
            .limit(1);

        if (existingRooms && existingRooms.length > 0) {
            roomId = existingRooms[0].id;
        } else {
            const { data: newRoom, error: roomError } = await supabase
                .from("rooms")
                .insert({
                    host_id: user.id,
                    type: "casino",
                    title: `${user.user_metadata?.full_name || user.email?.split('@')[0]}'s Casino Lounge`,
                    slug: `casino-${user.id.substring(0, 8)}`,
                    status: "offline",
                })
                .select()
                .single();

            if (roomError) throw roomError;
            roomId = newRoom.id;
        }

        // 3. Create room session
        const agoraChannel = `room-session-${Date.now()}-${user.id.substring(0, 8)}`;
        const { data: session, error: sessionError } = await supabase
            .from("room_sessions")
            .insert({
                room_id: roomId,
                room_type: "casino",
                creator_id: user.id,
                title: tableName,
                description: description || null,
                session_type: vipOnly ? "private" : "public",
                entry_fee: 0,
                cost_per_min: 0,
                status: "active",
                agora_channel: agoraChannel,
            })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // 4. Get creator profile details
        const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", user.id)
            .single();

        const creatorName = profile?.full_name || profile?.username || "Creator";
        const creatorAvatarUrl = profile?.avatar_url || "";

        // 5. Save lounge metadata
        const { data: lounge, error: loungeError } = await supabase
            .from("casino_lounges")
            .insert({
                room_id: roomId,
                creator_id: user.id,
                creator_name: creatorName,
                table_name: tableName,
                game_type: gameType,
                casino_game_id: casinoGameId,
                min_bet: Number(minBet) || 0,
                max_bet: Number(maxBet) || 0,
                start_time: startTime || new Date().toISOString(),
                duration_minutes: Number(durationMinutes) || 60,
                cover_image_url: coverImageUrl || null,
                creator_avatar_url: creatorAvatarUrl || null,
                description: description || null,
                vip_only: !!vipOnly,
                status: "live",
            })
            .select()
            .single();

        if (loungeError) throw loungeError;

        // 6. Add creator as participant
        await supabase.from("room_session_participants").insert({
            session_id: session.id,
            user_id: user.id,
            role: "creator",
        });

        // 7. Update room status to live
        await supabase.from("rooms").update({ status: "live" }).eq("id", roomId);

        // 8. Create notification
        await supabase.from("notifications").insert({
            user_id: user.id,
            type: "session_created",
            message: `Your casino table "${tableName}" is now live!`,
            metadata: { session_id: session.id, room_type: "casino" },
        });

        // 9. Sync payload mock-post (simulation)
        // Here we simulate the external POST sync to pgxcasino.com.
        // Since we are running locally, both share the database 'casino_lounges',
        // so inserting above is already syncing!
        try {
            console.log("Simulating Sync Payload to PGX Casino...");
            // mock endpoint log or sync if external route exists
        } catch (syncErr) {
            console.error("Mock sync warning:", syncErr);
        }

        return NextResponse.json({
            success: true,
            room: { id: roomId },
            session,
            lounge,
        });

    } catch (err: any) {
        console.error("Create casino lounge error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
