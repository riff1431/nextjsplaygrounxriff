import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const { subject, body } = await req.json();

        if (!subject || !body) {
            return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
        }

        const adminDb = createAdminClient();

        // Fetch all active users (exclude the admin sender)
        const { data: users, error: usersError } = await adminDb
            .from("profiles")
            .select("id")
            .neq("id", user.id);

        if (usersError || !users) {
            throw new Error(usersError?.message || "Failed to fetch users");
        }

        // ─── 1. Notifications (existing behavior) ───
        const fullMessage = `[Admin Broadcast: ${subject}]\n${body}`;
        const notifications = users.map((u: any) => ({
            user_id: u.id,
            type: "system",
            message: fullMessage,
            is_read: false,
            actor_id: user.id
        }));

        const BATCH_SIZE = 1000;
        for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
            const batch = notifications.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await adminDb.from("notifications").insert(batch);
            if (insertError) {
                console.error("Notification batch insert error:", insertError);
            }
        }

        // ─── 2. Send as DM inbox message to every user ───
        // For each user, find or create a 1-on-1 DM conversation with admin,
        // then insert the broadcast as a message in that conversation.

        // 2a. Get all conversations the admin is part of
        const { data: adminParticipations } = await adminDb
            .from("dm_participants")
            .select("conversation_id, user_id")
            .eq("user_id", user.id);

        const adminConvIds = adminParticipations?.map(p => p.conversation_id) || [];

        // 2b. Get all participants in those conversations to find existing 1-on-1 DMs
        let existingPairMap = new Map<string, string>(); // user_id -> conversation_id
        if (adminConvIds.length > 0) {
            const { data: otherParticipants } = await adminDb
                .from("dm_participants")
                .select("conversation_id, user_id")
                .in("conversation_id", adminConvIds)
                .neq("user_id", user.id);

            // Build a map: for each other user, find the conversation they share with admin
            // (pick the first if multiple exist)
            for (const p of otherParticipants || []) {
                if (!existingPairMap.has(p.user_id)) {
                    existingPairMap.set(p.user_id, p.conversation_id);
                }
            }
        }

        // 2c. For users without existing conversations, create new ones in batches
        const usersNeedingNewConv = users.filter(u => !existingPairMap.has(u.id));

        const newConversations: { id: string }[] = [];
        const newParticipants: { conversation_id: string; user_id: string }[] = [];

        for (const u of usersNeedingNewConv) {
            const newConvId = crypto.randomUUID();
            existingPairMap.set(u.id, newConvId);
            newConversations.push({ id: newConvId });
            newParticipants.push(
                { conversation_id: newConvId, user_id: user.id },
                { conversation_id: newConvId, user_id: u.id }
            );
        }

        // Insert new conversations in batches
        for (let i = 0; i < newConversations.length; i += BATCH_SIZE) {
            const batch = newConversations.slice(i, i + BATCH_SIZE);
            const { error } = await adminDb.from("dm_conversations").insert(batch);
            if (error) console.error("Conv batch insert error:", error);
        }

        // Insert new participants in batches
        for (let i = 0; i < newParticipants.length; i += BATCH_SIZE) {
            const batch = newParticipants.slice(i, i + BATCH_SIZE);
            const { error } = await adminDb.from("dm_participants").insert(batch);
            if (error) console.error("Participant batch insert error:", error);
        }

        // 2d. Insert DM messages for ALL users (existing + new conversations)
        const broadcastContent = `📢 ${subject}\n\n${body}`;
        const now = new Date().toISOString();

        const dmMessages = users.map((u: any) => ({
            conversation_id: existingPairMap.get(u.id)!,
            sender_id: user.id,
            content: broadcastContent,
            type: "text",
            is_read: false,
        }));

        for (let i = 0; i < dmMessages.length; i += BATCH_SIZE) {
            const batch = dmMessages.slice(i, i + BATCH_SIZE);
            const { error } = await adminDb.from("dm_messages").insert(batch);
            if (error) console.error("DM message batch insert error:", error);
        }

        // 2e. Update conversation timestamps for all affected conversations
        const allConvIds = Array.from(new Set(existingPairMap.values()));
        for (let i = 0; i < allConvIds.length; i += BATCH_SIZE) {
            const batch = allConvIds.slice(i, i + BATCH_SIZE);
            const { error } = await adminDb
                .from("dm_conversations")
                .update({ updated_at: now })
                .in("id", batch);
            if (error) console.error("Conv timestamp update error:", error);
        }

        return NextResponse.json({ success: true, count: users.length });
    } catch (error: any) {
        console.error("Broadcast Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
