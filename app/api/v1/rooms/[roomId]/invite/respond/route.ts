import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/[roomId]/invite/respond
 * Invitee accepts or declines a room invitation.
 * Body: { invitation_id: string, response: 'accepted' | 'declined' }
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ roomId: string }> }
) {
    const params = await props.params;
    const { roomId } = params;
    const supabase = await createClient();
    const body = await request.json();
    const { invitation_id, response } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!invitation_id || !response) {
        return NextResponse.json({ error: "invitation_id and response are required" }, { status: 400 });
    }
    if (!["accepted", "declined"].includes(response)) {
        return NextResponse.json({ error: "response must be 'accepted' or 'declined'" }, { status: 400 });
    }

    // Verify the invitation belongs to the current user
    const { data: invitation } = await supabase
        .from("room_invitations")
        .select("*")
        .eq("id", invitation_id)
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .single();

    if (!invitation) {
        return NextResponse.json({ error: "Invitation not found or already responded" }, { status: 404 });
    }

    // Update the invitation status
    const { error: updateErr } = await supabase
        .from("room_invitations")
        .update({ status: response, updated_at: new Date().toISOString() })
        .eq("id", invitation_id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Build dynamic redirect URL based on room type
    let redirectUrl: string | null = null;
    if (response === "accepted") {
        const { data: room } = await supabase.from("rooms").select("type").eq("id", roomId).single();
        const roomTypeRoutes: Record<string, string> = {
            "suga4u": "suga4u",
            "suga-4-u": "suga4u",
            "truth-or-dare": "truth-or-dare",
            "confessions": "confessions",
            "bar-lounge": "bar-lounge",
            "flash-drop": "flash-drop",
            "x-chat": "x-chat",
        };
        const routeSlug = roomTypeRoutes[room?.type || ""] || room?.type || "suga4u";
        redirectUrl = `/rooms/${routeSlug}?roomId=${roomId}`;
    }

    return NextResponse.json({ success: true, redirect_url: redirectUrl });
}
