import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/sessions/[sessionId]/invite-creator
 * Host creator invites another creator to the session with a split percentage.
 * Body: { invited_creator_id: string, split_pct: number }
 *
 * GET /api/v1/rooms/sessions/[sessionId]/invite-creator
 * List pending/active creator invites for this session.
 */
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
        const { invited_creator_id, split_pct } = body;

        if (!invited_creator_id || split_pct === undefined) {
            return NextResponse.json({ error: "invited_creator_id and split_pct are required" }, { status: 400 });
        }

        if (split_pct < 1 || split_pct > 99) {
            return NextResponse.json({ error: "split_pct must be between 1 and 99" }, { status: 400 });
        }

        // Verify user is the session creator
        const { data: session } = await supabase
            .from("room_sessions")
            .select("id, creator_id, status")
            .eq("id", sessionId)
            .single();

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (session.creator_id !== user.id) {
            return NextResponse.json({ error: "Only the session creator can invite creators" }, { status: 403 });
        }

        if (session.status !== "active") {
            return NextResponse.json({ error: "Session is not active" }, { status: 400 });
        }

        if (invited_creator_id === user.id) {
            return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
        }

        // Check for existing invite
        const { data: existing } = await supabase
            .from("creator_invite_splits")
            .select("id, status")
            .eq("session_id", sessionId)
            .eq("invited_creator_id", invited_creator_id)
            .single();

        if (existing && existing.status === 'pending') {
            return NextResponse.json({ error: "Invite already pending" }, { status: 409 });
        }
        if (existing && existing.status === 'accepted') {
            return NextResponse.json({ error: "Creator already accepted an invite" }, { status: 409 });
        }

        // Verify invited user exists and is a creator
        const { data: invitedProfile } = await supabase
            .from("profiles")
            .select("id, username, role")
            .eq("id", invited_creator_id)
            .single();

        if (!invitedProfile) {
            return NextResponse.json({ error: "Invited creator not found" }, { status: 404 });
        }

        // Create invite
        const { data: invite, error: insertError } = await supabase
            .from("creator_invite_splits")
            .insert({
                session_id: sessionId,
                inviter_creator_id: user.id,
                invited_creator_id,
                invited_split_pct: split_pct,
                status: "pending",
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Notify invited creator
        await supabase.from("notifications").insert({
            user_id: invited_creator_id,
            actor_id: user.id,
            type: "creator_invite",
            message: `You've been invited to join a session with a ${split_pct}% revenue split!`,
            metadata: { session_id: sessionId, split_pct },
        });

        return NextResponse.json({ success: true, invite });
    } catch (err: any) {
        console.error("Invite creator error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(
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
        const { data: invites, error } = await supabase
            .from("creator_invite_splits")
            .select("*, invited:profiles!creator_invite_splits_invited_creator_id_fkey(id, username, avatar_url)")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ invites: invites || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
