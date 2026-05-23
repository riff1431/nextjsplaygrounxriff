/**
 * PlayGroundX Email Service — powered by Resend
 *
 * Central email client singleton + helpers.
 * All platform emails flow through sendEmail() which:
 *   1. Renders the React Email template to HTML
 *   2. Sends via Resend API
 *   3. Logs to `email_logs` table
 */

import { Resend } from "resend";
import { render } from "react-email";
import { createAdminClient } from "@/utils/supabase/admin";

// ─── Singleton ───────────────────────────────────────────────
let _resend: Resend | null = null;

function getResend(): Resend {
    if (!_resend) {
        const key = process.env.RESEND_API_KEY;
        if (!key || key === "re_REPLACE_WITH_YOUR_KEY") {
            throw new Error("RESEND_API_KEY is not configured in .env.local");
        }
        _resend = new Resend(key);
    }
    return _resend;
}

// ─── Types ───────────────────────────────────────────────────
export interface SendEmailParams {
    to: string;
    subject: string;
    react: React.ReactElement;
    /** Template ID for logging (e.g. 'welcome', 'wallet-deposit-success') */
    templateId: string;
    /** User ID for logging — nullable for pre-registration emails */
    userId?: string;
    /** Extra metadata to store in email_logs */
    metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
    success: boolean;
    resendId?: string;
    error?: string;
}

// ─── Config ──────────────────────────────────────────────────
// NOTE: Using Resend test sender until playgroundx.vip domain is verified.
// Once verified, switch to: "PlayGroundX <noreply@playgroundx.vip>"
const FROM_ADDRESS = "PlayGroundX <onboarding@resend.dev>";
const REPLY_TO = "support@playgroundx.vip";

// ─── Core Send Function ─────────────────────────────────────
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { to, subject, react, templateId, userId, metadata } = params;

    try {
        const resend = getResend();

        // Render React component to HTML
        const html = await render(react);

        // Send via Resend
        const { data, error } = await resend.emails.send({
            from: FROM_ADDRESS,
            to: [to],
            replyTo: REPLY_TO,
            subject,
            html,
        });

        if (error) {
            console.error(`[Email] Failed to send "${templateId}" to ${to}:`, error);
            await logEmail({ userId, templateId, to, subject, status: "failed", metadata });
            return { success: false, error: error.message };
        }

        const resendId = data?.id || undefined;

        // Log success
        await logEmail({
            userId,
            templateId,
            to,
            subject,
            status: "sent",
            resendId,
            metadata,
        });

        console.log(`[Email] ✅ Sent "${templateId}" to ${to} (resend:${resendId})`);
        return { success: true, resendId };
    } catch (err: any) {
        console.error(`[Email] Exception sending "${templateId}" to ${to}:`, err);
        await logEmail({ userId, templateId, to, subject, status: "failed", metadata });
        return { success: false, error: err.message || "Unknown error" };
    }
}

// ─── Logging Helper ──────────────────────────────────────────
interface LogParams {
    userId?: string;
    templateId: string;
    to: string;
    subject: string;
    status: "sent" | "failed";
    resendId?: string;
    metadata?: Record<string, unknown>;
}

async function logEmail(params: LogParams) {
    try {
        const supabase = createAdminClient();
        await supabase.from("email_logs").insert({
            user_id: params.userId || null,
            template_id: params.templateId,
            to_email: params.to,
            subject: params.subject,
            status: params.status,
            resend_id: params.resendId || null,
            metadata: params.metadata || {},
        });
    } catch (err) {
        // Never let logging failures break the email flow
        console.error("[Email] Failed to log email:", err);
    }
}

// ─── User Email Lookup ───────────────────────────────────────
/**
 * Fetch a user's email from Supabase Auth (not the profiles table).
 * Uses the service role admin client.
 */
export async function getUserEmail(userId: string): Promise<{ email: string; name: string } | null> {
    try {
        const supabase = createAdminClient();

        // First try profiles for the display name
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", userId)
            .single();

        // Get email from auth.users via admin API
        const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);

        if (error || !user?.email) {
            console.error("[Email] Could not fetch user email for", userId, error);
            return null;
        }

        return {
            email: user.email,
            name: profile?.full_name || profile?.username || "there",
        };
    } catch (err) {
        console.error("[Email] getUserEmail error:", err);
        return null;
    }
}
