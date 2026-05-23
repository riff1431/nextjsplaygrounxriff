/**
 * Password Changed Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface PasswordChangedProps {
    firstName: string;
    changedAt: string;
}

export default function PasswordChangedEmail({
    firstName = "there",
    changedAt = new Date().toISOString(),
}: PasswordChangedProps) {
    const dateStr = new Date(changedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });

    return (
        <EmailLayout preview="Your PlayGroundX password was changed">
            <Text style={s.heading}>Password Changed 🔒</Text>
            <Text style={s.paragraph}>
                Hey {firstName}, your PlayGroundX password was successfully changed on <strong>{dateStr}</strong>.
            </Text>
            <Section style={s.warningBox}>
                <Text style={{ color: "#fde68a", fontSize: "14px", margin: 0 }}>
                    ⚠️ If you did not make this change, please secure your account immediately by resetting your password and contacting support.
                </Text>
            </Section>
            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href="mailto:support@playgroundx.vip" style={s.ctaButtonCyan}>Contact Support</Link>
            </Section>
        </EmailLayout>
    );
}
