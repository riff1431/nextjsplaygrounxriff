import { createClient } from '@/utils/supabase/server';

const DIDIT_API_URL = "https://verification.didit.me/v1"; // Based on research, verifying base URL
// Note: If authentication uses a different URL, we will adjust.
// The user provided API Key. We will use Basic Auth or Bearer Token depending on docs.
// Usually Didit uses Header: 'Authorization': 'Basic <base64(key)>' or 'x-api-key'

export class DiditClient {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.DIDIT_API_KEY || "";
        this.baseUrl = "https://verification.didit.me/v3";
    }

    async createSession(userId: string, callbackUrl: string) {
        const url = `${this.baseUrl}/session/`;
        const workflowId = process.env.DIDIT_API_ID; // Using API_ID as workflow_id for now, but it might need to be changed by user

        console.log(`Creating Didit session at ${url} for user ${userId}`);

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey
                },
                body: JSON.stringify({
                    workflow_id: workflowId,
                    vendor_data: userId,
                    callback: callbackUrl,
                    vendor_internal_id: userId
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Didit Session Error Status:", response.status);
                console.error("Didit Session Error Body:", errorText);
                throw new Error(`Failed to create Didit session: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Didit Client Exception:", error);
            throw error;
        }
    }
}
