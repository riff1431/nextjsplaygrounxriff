import { createAdminClient } from "@/utils/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// POST: Upload a file to "media" bucket using admin privileges
export async function POST(request: NextRequest) {
    const supabase = createAdminClient();

    // Ensure the bucket exists — try create, ignore "already exists" errors
    const { error: bucketErr } = await supabase.storage.createBucket("media", {
        public: true,
        fileSizeLimit: 104857600,
        allowedMimeTypes: ["image/*", "video/*"],
    });

    // Only fail if it's not an "already exists" error
    if (bucketErr && !bucketErr.message.includes("already exists")) {
        console.error("[upload] Bucket creation error:", bucketErr.message);
    }

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string || "uploads";

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // Convert File to ArrayBuffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const { error: uploadErr } = await supabase.storage
        .from("media")
        .upload(filePath, uint8, {
            contentType: file.type,
            upsert: true,
        });

    if (uploadErr) {
        console.error("[upload] Upload error:", uploadErr.message);
        return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);

    return NextResponse.json({ success: true, publicUrl: urlData.publicUrl });
}
