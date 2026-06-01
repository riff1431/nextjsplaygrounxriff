import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getUserEmail } from "@/lib/email";
import ActivityNotificationEmail from "@/lib/email-templates/activity-notification";

export async function POST(request: NextRequest) {
    // 1. Secure webhook validation
    const signature = request.headers.get("x-webhook-secret");
    const expectedSecret = "super-secret-webhook-token";

    if (!signature || signature !== expectedSecret) {
        return NextResponse.json({ error: "Unauthorized webhook caller" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { type, record } = body;

        // We only care about INSERT events on the notifications table
        if (type !== "INSERT" || !record) {
            return NextResponse.json({ message: "Ignored event type" });
        }

        const { id: notifId, user_id: userId, type: notifType, title, message, link } = record;

        if (!userId || !title || !message) {
            return NextResponse.json({ error: "Missing required notification fields in payload" }, { status: 400 });
        }

        // 2. Fetch recipient email and profile details
        const recipient = await getUserEmail(userId);
        if (!recipient || !recipient.email) {
            console.log(`[Notification Webhook] No email or recipient invalid for user: ${userId}`);
            return NextResponse.json({ message: "No recipient email found, skipping" });
        }

        // 3. Resolve app & link URLs
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        // Avoid double slashes in paths
        const cleanAppUrl = appUrl.replace(/\/$/, "");
        const linkUrl = link ? `${cleanAppUrl}${link.startsWith("/") ? "" : "/"}${link}` : undefined;

        console.log(`[Notification Webhook] Sending email notification of type "${notifType}" to ${recipient.email}`);

        // 4. Dispatch the email using our email service
        const emailResult = await sendEmail({
            to: recipient.email,
            subject: title,
            react: ActivityNotificationEmail({
                title,
                message,
                type: notifType,
                linkUrl,
                appUrl: cleanAppUrl,
            }),
            templateId: `activity-${notifType}`,
            userId,
            metadata: {
                notification_id: notifId,
                notification_type: notifType,
            }
        });

        if (!emailResult.success) {
            return NextResponse.json({ error: emailResult.error }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Email notification dispatched successfully" });
    } catch (err: any) {
        console.error("[Notification Webhook] Error processing event:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
