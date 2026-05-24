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
                    vendor_internal_id: userId,
                    callback_method: "both"
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

    /**
     * Fetch the decision/status for a verification session from Didit.
     * This is the polling/fallback approach — actively queries Didit's API
     * instead of waiting for the webhook.
     * 
     * Endpoint: GET /v3/session/{session_id}/decision/
     * Returns: { status: "Approved" | "Declined" | "In Review" | "In Progress" | ... }
     */
    async getSessionDecision(sessionId: string) {
        const url = `${this.baseUrl}/session/${sessionId}/decision/`;

        console.log(`Fetching Didit session decision at ${url}`);

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "x-api-key": this.apiKey
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Didit Decision Error Status:", response.status);
                console.error("Didit Decision Error Body:", errorText);
                throw new Error(`Failed to get Didit session decision: ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Didit Decision Exception:", error);
            throw error;
        }
    }
}
