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

        // Fetch all active users
        const { data: users, error: usersError } = await adminDb
            .from("profiles")
            .select("id");

        if (usersError || !users) {
            throw new Error(usersError?.message || "Failed to fetch users");
        }

        // Prepare notifications payload
        const fullMessage = `[Admin Broadcast: ${subject}]\n${body}`;
        const notifications = users.map((u: any) => ({
            user_id: u.id,
            type: "system",
            message: fullMessage,
            is_read: false,
            actor_id: user.id
        }));

        // Insert in batches of 1000 to prevent payload too large errors
        const BATCH_SIZE = 1000;
        for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
            const batch = notifications.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await adminDb.from("notifications").insert(batch);
            if (insertError) {
                console.error("Batch insert error:", insertError);
            }
        }

        return NextResponse.json({ success: true, count: notifications.length });
    } catch (error: any) {
        console.error("Broadcast Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
