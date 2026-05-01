/**
 * Uploads a file to Supabase Storage via the server-side admin API.
 * This bypasses RLS policies by routing through /api/v1/storage/upload.
 * (Name kept as uploadToLocalServer for backward compatibility with imports)
 * 
 * @param file The file object to upload
 * @param folder Optional folder name within the media bucket (default: "uploads")
 * @returns Promise resolving to the public URL of the uploaded file
 */
export async function uploadToLocalServer(file: File, folder: string = "uploads"): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/v1/storage/upload", {
        method: "POST",
        body: formData,
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
        console.error("Upload error:", json.error);
        throw new Error(json.error || "Failed to upload file");
    }

    return json.publicUrl;
}
