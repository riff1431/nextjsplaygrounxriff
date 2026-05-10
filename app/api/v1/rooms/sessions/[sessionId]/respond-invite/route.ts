import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/rooms/sessions/[sessionId]/respond-invite
 * Invited creator accepts or declines the invite.
 * Body: { accept: boolean }
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
        const { accept } = body;

        if (accept === undefined) {
            return NextResponse.json({ error: "accept field is required" }, { status: 400 });
        }

        // Find the pending invite for this creator (use admin to bypass RLS)
        const { data: invite, error: fetchError } = await admin
            .from("creator_invite_splits")
            .select("*")
            .eq("session_id", sessionId)
            .eq("invited_creator_id", user.id)
            .eq("status", "pending")
            .single();

        if (fetchError || !invite) {
            return NextResponse.json({ error: "No pending invite found" }, { status: 404 });
        }

        // Update invite status
        const newStatus = accept ? "accepted" : "declined";
        const { data: updated, error: updateError } = await admin
            .from("creator_invite_splits")
            .update({
                status: newStatus,
                responded_at: new Date().toISOString(),
            })
            .eq("id", invite.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // If accepted, add as session participant with role 'invited_creator'
        if (accept) {
            await admin.from("room_session_participants").upsert({
                session_id: sessionId,
                user_id: user.id,
                role: "invited_creator",
            }, { onConflict: "session_id,user_id" }).select();
        }

        // Notify the inviter
        const { data: profile } = await admin
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single();

        await admin.from("notifications").insert({
            user_id: invite.inviter_creator_id,
            actor_id: user.id,
            type: "creator_invite_response",
            message: `${profile?.username || "Creator"} ${accept ? "accepted" : "declined"} your invite (${invite.invited_split_pct}% split)`,
            metadata: { session_id: sessionId, accepted: accept },
        });

        return NextResponse.json({ success: true, invite: updated });
    } catch (err: any) {
        console.error("Respond invite error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
