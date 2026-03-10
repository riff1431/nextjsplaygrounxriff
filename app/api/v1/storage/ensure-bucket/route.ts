import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

// POST: Ensure the "media" storage bucket exists (creates it if missing)
// Uses admin client (service role) since bucket creation requires elevated permissions
export async function POST() {
    const supabase = createAdminClient();

    // Try to get the bucket first
    const { data: existing } = await supabase.storage.getBucket("media");
    if (existing) {
        return NextResponse.json({ success: true, message: "Bucket already exists" });
    }

    // Create public bucket
    const { error } = await supabase.storage.createBucket("media", {
        public: true,
        fileSizeLimit: 104857600, // 100MB
        allowedMimeTypes: ["image/*", "video/*"],
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Bucket created" });
}
