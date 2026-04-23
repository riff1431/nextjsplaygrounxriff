import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * GET /api/admin/messages/[conversationId]
 * Fetch all messages in a conversation.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const { conversationId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminDb = createAdminClient();
        const { data: profile } = await adminDb
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Verify admin is a participant
        const { data: participant } = await adminDb
            .from("dm_participants")
            .select("user_id")
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id)
            .single();

        if (!participant) {
            return NextResponse.json({ error: "Not a participant" }, { status: 403 });
        }

        // Fetch messages
        const { data: messages, error: msgErr } = await adminDb
            .from("dm_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        if (msgErr) {
            return NextResponse.json({ error: msgErr.message }, { status: 500 });
        }

        return NextResponse.json({ messages: messages || [] });
    } catch (error: any) {
        console.error("Admin messages thread error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/messages/[conversationId]
 * Admin sends a reply in a conversation.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const { conversationId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminDb = createAdminClient();
        const { data: profile } = await adminDb
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { content } = await req.json();
        if (!content?.trim()) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        // Insert message using admin client to bypass RLS
        const { data: message, error: insertErr } = await adminDb
            .from("dm_messages")
            .insert({
                conversation_id: conversationId,
                sender_id: user.id,
                content: content.trim(),
                type: "text",
                is_read: false,
            })
            .select()
            .single();

        if (insertErr) {
            return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }

        // Update conversation timestamp
        await adminDb
            .from("dm_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);

        return NextResponse.json({ message });
    } catch (error: any) {
        console.error("Admin reply error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/messages/[conversationId]
 * Mark all messages in a conversation as read (messages not sent by admin).
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const { conversationId } = await params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminDb = createAdminClient();
        const { data: profile } = await adminDb
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Mark all non-admin messages as read
        const { error: updateErr } = await adminDb
            .from("dm_messages")
            .update({ is_read: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", user.id)
            .eq("is_read", false);

        if (updateErr) {
            return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Admin mark read error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
