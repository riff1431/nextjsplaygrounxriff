import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getServerCurrencySymbol } from "@/utils/serverCurrency";

// ──────────────────────────────────────────────────
// GET /api/v1/rooms/sessions?room_type=truth-or-dare&status=active
// List sessions, optionally filtered by room_type and status
// ──────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const SYM = await getServerCurrencySymbol();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const roomType = searchParams.get("room_type");
    const status = searchParams.get("status") || "active";
    const creatorId = searchParams.get("creator_id");

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
        if (creatorId) {
            query = query.eq("creator_id", creatorId);
        }
        if (status && status !== "all") {
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
    const SYM = await getServerCurrencySymbol();
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
                    error: `Private session fee must be at least ${SYM}${settings.min_private_entry_fee}`,
                }, { status: 400 });
            }
        }

        // 3b. Validate cost per minute for private sessions
        let costPerMin = 0;
        if (sType === "private" && cost_per_min !== undefined) {
            costPerMin = Number(cost_per_min) || 0;
            if (costPerMin < 4) {
                return NextResponse.json({
                    error: "Cost per minute must be at least ${SYM}4 for private sessions",
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

        // 5b. For suga-4-u, keep (clone) favorites and secrets from the creator's last suga-4-u session
        if (room_type === "suga-4-u") {
            try {
                const { data: lastSession } = await supabase
                    .from("room_sessions")
                    .select("id")
                    .eq("creator_id", user.id)
                    .eq("room_type", "suga-4-u")
                    .neq("id", session.id)
                    .order("started_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (lastSession) {
                    // Fetch and clone favorites
                    const { data: lastFavorites } = await supabase
                        .from("suga_creator_favorites")
                        .select("*")
                        .eq("session_id", lastSession.id);

                    if (lastFavorites && lastFavorites.length > 0) {
                        const favoritesToInsert = lastFavorites.map((fav: any) => ({
                            creator_id: user.id,
                            room_id: roomId,
                            session_id: session.id,
                            category: fav.category,
                            emoji: fav.emoji,
                            name: fav.name,
                            description: fav.description,
                            buy_price: fav.buy_price,
                            reveal_price: fav.reveal_price,
                            link: fav.link
                        }));
                        const { error: favError } = await supabase
                            .from("suga_creator_favorites")
                            .insert(favoritesToInsert);
                        if (favError) {
                            console.error("Error cloning favorites from last session:", favError);
                        }
                    }

                    // Fetch and clone secrets
                    const { data: lastSecrets } = await supabase
                        .from("suga_creator_secrets")
                        .select("*")
                        .eq("session_id", lastSession.id);

                    if (lastSecrets && lastSecrets.length > 0) {
                        const secretsToInsert = lastSecrets.map((sec: any) => ({
                            creator_id: user.id,
                            room_id: roomId,
                            session_id: session.id,
                            name: sec.name,
                            description: sec.description,
                            unlock_price: sec.unlock_price,
                            category: sec.category,
                            media_url: sec.media_url,
                            media_type: sec.media_type
                        }));
                        const { error: secError } = await supabase
                            .from("suga_creator_secrets")
                            .insert(secretsToInsert);
                        if (secError) {
                            console.error("Error cloning secrets from last session:", secError);
                        }
                    }
                }
            } catch (cloneErr) {
                console.error("Failed to clone suga creator items from last session:", cloneErr);
            }
        }

        // 5c. For confessions, keep (clone) confessions from the creator's last confessions session
        if (room_type === "confessions") {
            try {
                const { data: lastSession } = await supabase
                    .from("room_sessions")
                    .select("id")
                    .eq("creator_id", user.id)
                    .eq("room_type", "confessions")
                    .neq("id", session.id)
                    .order("started_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (lastSession) {
                    // Fetch and clone confessions
                    const { data: lastConfessions } = await supabase
                        .from("confessions")
                        .select("*")
                        .eq("session_id", lastSession.id);

                    if (lastConfessions && lastConfessions.length > 0) {
                        const confessionsToInsert = lastConfessions.map((c: any) => ({
                            room_id: roomId,
                            session_id: session.id,
                            title: c.title,
                            teaser: c.teaser,
                            content: c.content,
                            media_url: c.media_url,
                            type: c.type,
                            tier: c.tier,
                            price: c.price,
                            status: c.status || 'Published',
                        }));
                        const { error: confError } = await supabase
                            .from("confessions")
                            .insert(confessionsToInsert);
                        if (confError) {
                            console.error("Error cloning confessions from last session:", confError);
                        }
                    }
                }
            } catch (cloneErr) {
                console.error("Failed to clone confessions from last session:", cloneErr);
            }
        }

        // 5d. For flash-drop, keep (clone) drops and roller packs from the creator's last session or offline setup
        if (room_type === "flash-drop") {
            try {
                const { data: lastSession } = await supabase
                    .from("room_sessions")
                    .select("id")
                    .eq("creator_id", user.id)
                    .eq("room_type", "flash-drop")
                    .neq("id", session.id)
                    .order("started_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                // Fetch drops to clone
                let dropsToClone: any[] = [];
                if (lastSession) {
                    const { data: lastDrops } = await supabase
                        .from("flash_drops")
                        .select("*")
                        .eq("session_id", lastSession.id)
                        .neq("status", "Ended");
                    if (lastDrops) dropsToClone.push(...lastDrops);
                }
                const { data: offlineDrops } = await supabase
                    .from("flash_drops")
                    .select("*")
                    .eq("room_id", roomId)
                    .is("session_id", null)
                    .neq("status", "Ended");
                if (offlineDrops) dropsToClone.push(...offlineDrops);

                if (dropsToClone.length > 0) {
                    const now = Date.now();
                    const dropsPayload = dropsToClone.map((d: any) => {
                        let durationMs = 15 * 60 * 1000; // 15 mins default
                        if (d.ends_at && d.created_at) {
                            const diff = new Date(d.ends_at).getTime() - new Date(d.created_at).getTime();
                            if (diff > 0) durationMs = diff;
                        }
                        const newEndsAt = new Date(now + durationMs);

                        return {
                            room_id: roomId,
                            session_id: session.id,
                            title: d.title,
                            kind: d.kind,
                            rarity: d.rarity,
                            price: d.price,
                            ends_at: newEndsAt.toISOString(),
                            status: d.status === 'Ended' ? 'Live' : d.status,
                            inventory_total: d.inventory_total,
                            inventory_remaining: d.inventory_total, // Reset stock to total
                            gross_preview: 0,
                            unlocks_preview: 0,
                            media_url: d.media_url || null
                        };
                    });

                    const { error: dropErr } = await supabase
                        .from("flash_drops")
                        .insert(dropsPayload);
                    if (dropErr) {
                        console.error("Error cloning flash drops:", dropErr);
                    } else {
                        // Delete offline drops so they don't linger
                        await supabase
                            .from("flash_drops")
                            .delete()
                            .eq("room_id", roomId)
                            .is("session_id", null);
                    }
                }

                // Fetch roller packs to clone
                let packsToClone: any[] = [];
                if (lastSession) {
                    const { data: lastPacks } = await supabase
                        .from("flash_drop_roller_packs")
                        .select("*")
                        .eq("session_id", lastSession.id);
                    if (lastPacks) packsToClone.push(...lastPacks);
                }
                const { data: offlinePacks } = await supabase
                    .from("flash_drop_roller_packs")
                    .select("*")
                    .eq("room_id", roomId)
                    .is("session_id", null);
                if (offlinePacks) packsToClone.push(...offlinePacks);

                if (packsToClone.length > 0) {
                    const packsPayload = packsToClone.map((p: any) => ({
                        room_id: roomId,
                        creator_id: user.id,
                        session_id: session.id,
                        name: p.name,
                        price: p.price,
                        description: p.description || null,
                        media_urls: p.media_urls || []
                    }));

                    const { error: packErr } = await supabase
                        .from("flash_drop_roller_packs")
                        .insert(packsPayload);
                    if (packErr) {
                        console.error("Error cloning roller packs:", packErr);
                    } else {
                        // Delete offline packs so they don't linger
                        await supabase
                            .from("flash_drop_roller_packs")
                            .delete()
                            .eq("room_id", roomId)
                            .is("session_id", null);
                    }
                }
            } catch (cloneErr) {
                console.error("Failed to clone flash drop items from last session:", cloneErr);
            }
        }

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
