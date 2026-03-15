import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/[roomId]/invite
 * Fan sends a room invitation to another user.
 * Body: { invitee_id: string }
 *
 * Side-effects:
 *  1. Creates a room_invitations row
 *  2. Creates a notification for the invitee
 *  3. Sends a DM to the invitee with the session join link
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { invitee_id } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!invitee_id) return NextResponse.json({ error: "invitee_id is required" }, { status: 400 });
    if (invitee_id === user.id) return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });

    // Verify room exists
    const { data: room } = await supabase.from("rooms").select("id, type, host_id, title").eq("id", roomId).single();
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    // Check for existing pending invitation
    const { data: existing } = await supabase
        .from("room_invitations")
        .select("id")
        .eq("room_id", roomId)
        .eq("inviter_id", user.id)
        .eq("invitee_id", invitee_id)
        .eq("status", "pending")
        .maybeSingle();

    if (existing) return NextResponse.json({ error: "Invitation already sent" }, { status: 409 });

    // Create the invitation
    const { data: invitation, error: insertErr } = await supabase
        .from("room_invitations")
        .insert({
            room_id: roomId,
            inviter_id: user.id,
            invitee_id,
        })
        .select()
        .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // Get inviter profile for notification
    const { data: profile } = await supabase.from("profiles").select("username, full_name").eq("id", user.id).single();
    const inviterName = profile?.full_name || profile?.username || "Someone";

    // Build the dynamic room link based on room type
    const roomTypeRoutes: Record<string, string> = {
        "suga4u": "suga4u",
        "suga-4-u": "suga4u",          // legacy name
        "truth-or-dare": "truth-or-dare",
        "confessions": "confessions",
        "bar-lounge": "bar-lounge",
        "flash-drop": "flash-drop",
        "x-chat": "x-chat",
    };
    const routeSlug = roomTypeRoutes[room.type] || room.type;
    const roomLink = `/rooms/${routeSlug}?roomId=${roomId}`;
    const roomLabel = (room.type || "session").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Create notification for the invitee
    await supabase.from("notifications").insert({
        user_id: invitee_id,
        actor_id: user.id,
        type: "room_invitation",
        title: "Room Invitation 💖",
        message: `${inviterName} invited you to join a ${roomLabel} session!`,
        link: roomLink,
        reference_id: invitation.id,
        metadata: {
            room_id: roomId,
            room_type: room.type,
            invitation_id: invitation.id,
            inviter_name: inviterName,
        },
    });

    // ─── Send DM to the invitee with session details ───
    try {
        // 1. Find existing conversation between inviter and invitee
        const { data: inviterConvos } = await supabase
            .from("dm_participants")
            .select("conversation_id")
            .eq("user_id", user.id);

        const { data: inviteeConvos } = await supabase
            .from("dm_participants")
            .select("conversation_id")
            .eq("user_id", invitee_id);

        const inviterIds = new Set(inviterConvos?.map(c => c.conversation_id) || []);
        const sharedConvId = inviteeConvos?.find(c => inviterIds.has(c.conversation_id))?.conversation_id;

        let conversationId = sharedConvId || null;

        // 2. If no existing conversation, create one
        if (!conversationId) {
            const newConvId = crypto.randomUUID();
            await supabase.from("dm_conversations").insert({ id: newConvId });
            await supabase.from("dm_participants").insert([
                { conversation_id: newConvId, user_id: user.id },
                { conversation_id: newConvId, user_id: invitee_id },
            ]);
            conversationId = newConvId;
        }

        // 3. Build the invitation message content
        const sessionTitle = room.title || roomLabel;
        const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
        const fullLink = `${origin}${roomLink}`;

        const messageContent =
            `🎉 You're invited to a ${roomLabel} session!\n\n` +
            `📌 Session: ${sessionTitle}\n` +
            `🔗 Join here: ${fullLink}\n\n` +
            `Tap the link to join now! 💖`;

        // 4. Insert the DM
        await supabase.from("dm_messages").insert({
            conversation_id: conversationId,
            sender_id: user.id,
            content: messageContent,
            type: "text",
        });

        // 5. Update conversation timestamp
        await supabase
            .from("dm_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
    } catch (dmError) {
        // DM is best-effort — don't fail the invite if DM fails
        console.error("Failed to send invitation DM:", dmError);
    }

    return NextResponse.json({ success: true, invitation });
}

