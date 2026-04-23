import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * GET /api/admin/messages
 * Returns all DM conversations where the admin user is a participant,
 * enriched with last message, other user profile, and unread count.
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify admin role
        const adminDb = createAdminClient();
        const { data: profile } = await adminDb
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        // 1. Get all conversation IDs where admin is a participant
        const { data: participations, error: partErr } = await adminDb
            .from("dm_participants")
            .select("conversation_id")
            .eq("user_id", user.id);

        if (partErr) {
            return NextResponse.json({ error: partErr.message }, { status: 500 });
        }

        const conversationIds = participations?.map(p => p.conversation_id) || [];

        if (conversationIds.length === 0) {
            return NextResponse.json({ conversations: [], unreadTotal: 0 });
        }

        // 2. Get all participants for these conversations
        const { data: allParticipants } = await adminDb
            .from("dm_participants")
            .select("conversation_id, user_id")
            .in("conversation_id", conversationIds);

        // 3. Fetch profiles for all participants (except admin)
        const otherUserIds = Array.from(
            new Set(allParticipants?.filter(p => p.user_id !== user.id).map(p => p.user_id) || [])
        );

        const { data: profiles } = await adminDb
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", otherUserIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        // 4. Build conversation objects with last message + unread count
        const conversations = await Promise.all(
            conversationIds.map(async (cId) => {
                // Last message
                const { data: msgs } = await adminDb
                    .from("dm_messages")
                    .select("*")
                    .eq("conversation_id", cId)
                    .order("created_at", { ascending: false })
                    .limit(1);

                // Unread count (messages NOT sent by admin that are unread)
                const { count: unreadCount } = await adminDb
                    .from("dm_messages")
                    .select("*", { count: "exact", head: true })
                    .eq("conversation_id", cId)
                    .neq("sender_id", user.id)
                    .eq("is_read", false);

                // Find the other user
                const otherParticipant = allParticipants?.find(
                    p => p.conversation_id === cId && p.user_id !== user.id
                );
                const otherProfile = otherParticipant
                    ? profileMap.get(otherParticipant.user_id)
                    : null;

                return {
                    id: cId,
                    other_user: otherProfile || { id: otherParticipant?.user_id, username: "Unknown", full_name: null, avatar_url: null },
                    last_message: msgs?.[0] || null,
                    unread_count: unreadCount || 0,
                    updated_at: msgs?.[0]?.created_at || new Date().toISOString(),
                };
            })
        );

        // Sort by most recent message first
        conversations.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

        // Total unread across all conversations
        const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);

        return NextResponse.json({ conversations, unreadTotal });
    } catch (error: any) {
        console.error("Admin messages error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
