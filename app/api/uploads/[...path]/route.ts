import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mime from "mime";

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ path: string[] }> }
) {
    try {
        const params = await props.params;
        const filePathParam = params.path;

        if (!filePathParam || filePathParam.length === 0) {
            return new NextResponse("File not found", { status: 404 });
        }

        const fileName = filePathParam.join("/");

        // Security: Prevent directory traversal
        // Ensure the resolved path is within the uploads directory
        const uploadsDir = path.join(process.cwd(), "uploads");
        const fullPath = path.resolve(uploadsDir, fileName);

        if (!fullPath.startsWith(uploadsDir)) {
            return new NextResponse("Access denied", { status: 403 });
        }

        if (!fs.existsSync(fullPath)) {
            return new NextResponse("File not found", { status: 404 });
        }

        const fileBuffer = fs.readFileSync(fullPath);
        const mimeType = mime.getType(fullPath) || "application/octet-stream";

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Error serving file:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
