/**
 * Activity Notification Email — sent for platform notifications
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface ActivityNotificationEmailProps {
    title: string;
    message: string;
    type: string;
    linkUrl?: string;
    appUrl?: string;
}

export default function ActivityNotificationEmail({
    title = "New Notification",
    message = "You have a new activity on PlayGroundX.",
    type = "system",
    linkUrl = "https://playgroundx.vip/account/notifications",
    appUrl = "https://playgroundx.vip",
}: ActivityNotificationEmailProps) {
    // Curated dynamic theme color matching standard system notification types
    const typeColors: Record<string, string> = {
        like: "#ff00c8",       // pink
        follow: "#00e6ff",     // cyan
        tip: "#22c55e",        // green
        subscribe: "#a855f7",  // purple
        topup: "#eab308",      // yellow
        approve: "#10b981",    // emerald
        system: "#6b7280",     // gray
        room_invitation: "#ff00c8", // pink
        creator_invite: "#a855f7",  // purple
    };

    const typeEmoji: Record<string, string> = {
        like: "❤️",
        follow: "👤",
        tip: "💰",
        subscribe: "⭐",
        topup: "💳",
        approve: "✅",
        system: "🔔",
        room_invitation: "💖",
        creator_invite: "🎭",
    };

    const borderStyle = {
        borderLeft: `4px solid ${typeColors[type] || "#ff00c8"}`,
        paddingLeft: "16px",
        marginLeft: "0px",
        marginTop: "16px",
        marginBottom: "16px",
    };

    return (
        <EmailLayout preview={title}>
            <Text style={s.heading}>
                {typeEmoji[type] || "🔔"} {title}
            </Text>

            <Section style={{ ...s.infoBox, ...borderStyle }}>
                <Text style={{ ...s.paragraph, margin: 0 }}>
                    {message}
                </Text>
            </Section>

            {linkUrl && (
                <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                    <Link href={linkUrl} style={s.ctaButton}>
                        View Details →
                    </Link>
                </Section>
            )}

            <Text style={{ ...s.muted, marginTop: "28px", fontSize: "12px", textAlign: "center" as const }}>
                You are receiving this because you enabled email notifications on PlayGroundX.
                <br />
                Manage your settings at{" "}
                <Link href={`${appUrl}/settings`} style={{ color: "#00e6ff", textDecoration: "none" }}>
                    Account Settings
                </Link>
            </Text>
        </EmailLayout>
    );
}
