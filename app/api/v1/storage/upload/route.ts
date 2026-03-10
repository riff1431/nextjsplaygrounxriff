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
    const start = Date.now();
    let formData;
    try {
        formData = await request.formData();
    } catch (err: any) {
        console.error("[upload] Failed to parse form data:", err.message);
        return NextResponse.json({ error: "Failed to parse form data: " + err.message }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string || "uploads";

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`[upload] Processing file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) to folder: ${folder}`);

    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    // Convert File to Uint8Array for server-side upload
    const bytes = await file.arrayBuffer();
    const uint8 = new Uint8Array(bytes);
    console.log(`[upload] Converted to Uint8Array in ${Date.now() - start}ms`);

    const uploadStart = Date.now();
    const { error: uploadErr } = await supabase.storage
        .from("media")
        .upload(filePath, uint8, {
            contentType: file.type,
            upsert: true,
        });

    if (uploadErr) {
        console.error("[upload] Supabase upload error:", uploadErr.message);
        return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    console.log(`[upload] Supabase upload completed in ${Date.now() - uploadStart}ms`);

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);

    return NextResponse.json({ success: true, publicUrl: urlData.publicUrl });
}
