import { createClient } from "@/utils/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Uploads a file to Supabase Storage.
 * (Name kept as uploadToLocalServer for backward compatibility with imports)
 * 
 * @param file The file object to upload
 * @returns Promise resolving to the public URL of the uploaded file
 */
export async function uploadToLocalServer(file: File): Promise<string> {
    const supabase = createClient();
    
    // Create a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${uuidv4()}.${fileExt}`;
    
    // We use the 'avatars' bucket as it is configured for public access.
    // This will work for logos, covers, and general image uploads too.
    const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error("Supabase upload error:", error);
        throw new Error(error.message || 'Failed to upload file');
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}
