import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/v1/rooms/truth-dare-sessions/[sessionId]/collab-join
 * Returns the session data for a collab creator joining via invite link.
 * Bypasses RLS so the invited creator can read the session.
 *
 * POST /api/v1/rooms/truth-dare-sessions/[sessionId]/collab-join
 * Accepts the invite and returns session data in one call.
 * Body: { inviteId?: string }
 */
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
        // Fetch session — use select('*') to avoid column-name mismatches
        const { data: session, error: sessError } = await admin
            .from("truth_dare_sessions")
            .select("*")
            .eq("id", sessionId)
            .maybeSingle();

        if (sessError) {
            console.error("[collab-join GET] Session query error:", sessError.message);
            return NextResponse.json({ error: "Failed to look up session" }, { status: 500 });
        }

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (session.status !== "active" && session.status !== "pending") {
            return NextResponse.json({ error: "Session has ended", sessionStatus: session.status }, { status: 410 });
        }

        // Verify user has an invite for this session
        const { data: invite } = await admin
            .from("creator_invite_splits")
            .select("id, status, invited_split_pct")
            .eq("session_id", sessionId)
            .eq("invited_creator_id", user.id)
            .in("status", ["pending", "accepted"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!invite) {
            return NextResponse.json({ error: "No invite found for this session" }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                room_id: session.room_id,
                status: session.status,
                title: session.title,
                started_at: session.started_at,
                created_at: session.created_at,
                is_private: session.is_private ?? session.session_type === "private",
                price: session.price ?? session.unlock_price ?? 0,
                creator_id: session.creator_id,
            },
            invite: {
                id: invite.id,
                status: invite.status,
                split_pct: invite.invited_split_pct,
            },
        });
    } catch (err: any) {
        console.error("Collab join GET error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

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
        const body = await request.json().catch(() => ({}));
        const inviteId = body.inviteId;

        console.log("[collab-join POST] sessionId:", sessionId, "inviteId:", inviteId, "userId:", user.id);

        // Fetch session — use select('*') to avoid column-name mismatches
        const { data: session, error: sessError } = await admin
            .from("truth_dare_sessions")
            .select("*")
            .eq("id", sessionId)
            .maybeSingle();

        if (sessError) {
            console.error("[collab-join POST] Session query error:", sessError.message);
            return NextResponse.json({ error: "Failed to look up session: " + sessError.message }, { status: 500 });
        }

        if (!session) {
            console.error("[collab-join POST] No session found for ID:", sessionId);
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        console.log("[collab-join POST] Session found:", session.id, "status:", session.status);

        if (session.status !== "active" && session.status !== "pending") {
            return NextResponse.json({
                error: `Session has ended (status: ${session.status})`,
                sessionStatus: session.status
            }, { status: 410 });
        }

        // Find invite — prefer specific inviteId, fallback to any pending/accepted invite for this user
        let invite: any = null;

        if (inviteId) {
            const { data, error: inviteError } = await admin
                .from("creator_invite_splits")
                .select("id, status, invited_split_pct")
                .eq("id", inviteId)
                .eq("invited_creator_id", user.id)
                .maybeSingle();
            if (inviteError) console.error("[collab-join POST] Invite lookup by ID error:", inviteError.message);
            invite = data;
        }

        if (!invite) {
            const { data, error: inviteError } = await admin
                .from("creator_invite_splits")
                .select("id, status, invited_split_pct")
                .eq("session_id", sessionId)
                .eq("invited_creator_id", user.id)
                .in("status", ["pending", "accepted"])
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (inviteError) console.error("[collab-join POST] Invite fallback lookup error:", inviteError.message);
            invite = data;
        }

        if (!invite) {
            console.error("[collab-join POST] No invite found. sessionId:", sessionId, "userId:", user.id);
            return NextResponse.json({ error: "No invite found for this session" }, { status: 403 });
        }

        console.log("[collab-join POST] Invite found:", invite.id, "status:", invite.status);

        // Auto-accept if still pending
        if (invite.status === "pending") {
            const { error: updateErr } = await admin
                .from("creator_invite_splits")
                .update({ status: "accepted", responded_at: new Date().toISOString() })
                .eq("id", invite.id);

            if (updateErr) console.error("[collab-join POST] Invite accept error:", updateErr.message);

            // Add as participant
            await admin.from("room_session_participants").upsert({
                session_id: sessionId,
                user_id: user.id,
                role: "invited_creator",
            }, { onConflict: "session_id,user_id" });

            // Notify the host
            const { data: profile } = await admin
                .from("profiles")
                .select("username, full_name")
                .eq("id", user.id)
                .maybeSingle();

            const displayName = profile?.full_name || profile?.username || "A creator";

            await admin.from("notifications").insert({
                user_id: session.creator_id,
                actor_id: user.id,
                type: "creator_invite_response",
                message: `${displayName} accepted your collab invite for "${session.title || "Truth or Dare"}"! 🎉`,
                metadata: { session_id: sessionId, accepted: true },
            });

            invite.status = "accepted";
        }

        return NextResponse.json({
            success: true,
            session: {
                id: session.id,
                room_id: session.room_id,
                status: session.status,
                title: session.title,
                started_at: session.started_at,
                created_at: session.created_at,
                is_private: session.is_private ?? session.session_type === "private",
                price: session.price ?? session.unlock_price ?? 0,
                creator_id: session.creator_id,
            },
            invite: {
                id: invite.id,
                status: invite.status,
                split_pct: invite.invited_split_pct,
            },
        });
    } catch (err: any) {
        console.error("Collab join POST error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
