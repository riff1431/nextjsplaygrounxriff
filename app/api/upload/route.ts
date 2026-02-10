import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure unique filename
        const originalName = file.name;
        const ext = path.extname(originalName);
        const uniqueName = `${uuidv4()}${ext}`;

        const uploadsDir = path.join(process.cwd(), "uploads");

        // Ensure directory exists (redundant safety)
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fullPath = path.join(uploadsDir, uniqueName);

        fs.writeFileSync(fullPath, buffer);

        // Return the public URL
        const publicUrl = `/api/uploads/${uniqueName}`;

        return NextResponse.json({
            url: publicUrl,
            filename: uniqueName
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Upload failed" },
            { status: 500 }
        );
    }
}
