/**
 * Uploads a file to the local server storage API.
 * Replaces Supabase Storage upload functionality.
 * 
 * @param file The file object to upload
 * @returns Promise resolving to the public URL of the uploaded file
 */
export async function uploadToLocalServer(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
    }

    const data = await response.json();
    return data.url;
}
