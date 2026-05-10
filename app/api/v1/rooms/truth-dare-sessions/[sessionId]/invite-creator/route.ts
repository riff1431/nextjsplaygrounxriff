import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/truth-dare-sessions/[sessionId]/invite-creator
 * Host creator invites another creator to the ToD session with a split percentage + optional message.
 * Body: { invited_creator_id: string, split_pct: number, message?: string }
 *
 * GET /api/v1/rooms/truth-dare-sessions/[sessionId]/invite-creator
 * List pending/active creator invites for this session.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { invited_creator_id, split_pct, message } = body;

        if (!invited_creator_id || split_pct === undefined) {
            return NextResponse.json({ error: "invited_creator_id and split_pct are required" }, { status: 400 });
        }

        if (split_pct < 1 || split_pct > 99) {
            return NextResponse.json({ error: "split_pct must be between 1 and 99" }, { status: 400 });
        }

        // Verify user is the session creator (Truth or Dare sessions table)
        const { data: session } = await admin
            .from("truth_dare_sessions")
            .select("id, creator_id, status, room_id, title")
            .eq("id", sessionId)
            .single();

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (session.creator_id !== user.id) {
            return NextResponse.json({ error: "Only the session creator can invite creators" }, { status: 403 });
        }

        if (session.status !== "active" && session.status !== "pending") {
            return NextResponse.json({ error: "Session is not active" }, { status: 400 });
        }

        if (invited_creator_id === user.id) {
            return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
        }

        // Check for existing invite
        const { data: existing } = await admin
            .from("creator_invite_splits")
            .select("id, status")
            .eq("session_id", sessionId)
            .eq("invited_creator_id", invited_creator_id)
            .single();

        if (existing && existing.status === "pending") {
            return NextResponse.json({ error: "Invite already pending" }, { status: 409 });
        }
        if (existing && existing.status === "accepted") {
            return NextResponse.json({ error: "Creator already accepted an invite" }, { status: 409 });
        }

        // Verify invited user exists and is a creator
        const { data: invitedProfile } = await admin
            .from("profiles")
            .select("id, username, full_name, avatar_url, role")
            .eq("id", invited_creator_id)
            .single();

        if (!invitedProfile) {
            return NextResponse.json({ error: "Invited creator not found" }, { status: 404 });
        }

        // Fetch inviter profile once (used by both paths)
        const { data: inviterProfile } = await admin
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", user.id)
            .single();

        const inviterName = inviterProfile?.full_name || inviterProfile?.username || "A creator";
        const sessionTitle = session.title || "Truth or Dare";

        // ─── Helper: Send DM + Notification to invited creator ───
        async function sendInviteDMAndNotification(inviteId: string) {
            try {
                // Build the unique collab link for the invited creator
                const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
                const collabLink = `/rooms/truth-or-dare-creator?collabSessionId=${sessionId}&inviteId=${inviteId}`;
                const fullCollabLink = `${origin}${collabLink}`;

                // 1. Enhanced notification with title + link
                const notifPayload: Record<string, any> = {
                    user_id: invited_creator_id,
                    actor_id: user!.id,
                    type: "creator_invite",
                    message: `${inviterName} invited you to join "${sessionTitle}" with a ${split_pct}% revenue split!`,
                };
                // Add optional fields only if they exist in the schema
                notifPayload.title = "🎭 Collab Invite";
                notifPayload.link = collabLink;
                notifPayload.metadata = {
                    session_id: sessionId,
                    split_pct,
                    room_id: session.room_id,
                    invite_id: inviteId,
                    inviter_username: inviterProfile?.username || null,
                    inviter_avatar: inviterProfile?.avatar_url || null,
                    session_title: sessionTitle,
                    collab_link: collabLink,
                };

                const { error: notifError } = await admin.from("notifications").insert(notifPayload);
                if (notifError) {
                    console.error("Notification insert error:", notifError.message);
                    // Fallback: try without the new columns
                    await admin.from("notifications").insert({
                        user_id: invited_creator_id,
                        actor_id: user!.id,
                        type: "creator_invite",
                        message: `${inviterName} invited you to join "${sessionTitle}" with a ${split_pct}% revenue split!`,
                        reference_id: inviteId,
                    });
                }

                // 2. Send DM to the invited creator
                // Find existing conversation between inviter and invitee
                const { data: inviterConvos } = await admin
                    .from("dm_participants")
                    .select("conversation_id")
                    .eq("user_id", user!.id);

                const { data: inviteeConvos } = await admin
                    .from("dm_participants")
                    .select("conversation_id")
                    .eq("user_id", invited_creator_id);

                const inviterIds = new Set(inviterConvos?.map(c => c.conversation_id) || []);
                const sharedConvId = inviteeConvos?.find(c => inviterIds.has(c.conversation_id))?.conversation_id;

                let conversationId = sharedConvId || null;

                // Create conversation if none exists
                if (!conversationId) {
                    const newConvId = crypto.randomUUID();
                    await admin.from("dm_conversations").insert({ id: newConvId });
                    await admin.from("dm_participants").insert([
                        { conversation_id: newConvId, user_id: user!.id },
                        { conversation_id: newConvId, user_id: invited_creator_id },
                    ]);
                    conversationId = newConvId;
                }

                // Build rich DM content with collab link
                const personalMsg = message?.trim() ? `\n\n💬 "${message.trim().slice(0, 200)}"` : "";

                const dmContent =
                    `🎭 You've been invited to collab!\n\n` +
                    `📌 Session: ${sessionTitle}\n` +
                    `💰 Revenue Split: You get ${split_pct}%${personalMsg}\n\n` +
                    `🔗 Join as collab creator: ${fullCollabLink}\n\n` +
                    `Tap the link above to join the session! 💖`;

                // Insert the DM
                await admin.from("dm_messages").insert({
                    conversation_id: conversationId,
                    sender_id: user!.id,
                    content: dmContent,
                    type: "text",
                });

                // Update conversation timestamp
                await admin
                    .from("dm_conversations")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", conversationId);
            } catch (err) {
                // Best-effort — don't fail the invite if notification/DM fails
                console.error("Failed to send invite notification/DM:", err);
            }
        }

        // If a declined invite exists, update it instead of inserting
        if (existing && existing.status === "declined") {
            const { data: updatedInvite, error: updateError } = await admin
                .from("creator_invite_splits")
                .update({
                    invited_split_pct: split_pct,
                    status: "pending",
                    responded_at: null,
                    invite_message: message?.trim()?.slice(0, 200) || null,
                })
                .eq("id", existing.id)
                .select()
                .single();

            if (updateError) throw updateError;

            await sendInviteDMAndNotification(existing.id);

            return NextResponse.json({ success: true, invite: updatedInvite });
        }

        // Create invite
        const insertPayload: Record<string, any> = {
            session_id: sessionId,
            inviter_creator_id: user.id,
            invited_creator_id,
            invited_split_pct: split_pct,
            status: "pending",
        };

        // Add message if provided
        if (message && message.trim()) {
            insertPayload.invite_message = message.trim().slice(0, 200);
        }

        const { data: invite, error: insertError } = await admin
            .from("creator_invite_splits")
            .insert(insertPayload)
            .select()
            .single();

        if (insertError) throw insertError;

        await sendInviteDMAndNotification(invite.id);

        return NextResponse.json({ success: true, invite });
    } catch (err: any) {
        console.error("ToD Invite creator error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    const { sessionId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: invites, error } = await admin
            .from("creator_invite_splits")
            .select("*, invited:profiles!creator_invite_splits_invited_creator_id_fkey(id, username, full_name, avatar_url)")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ invites: invites || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
