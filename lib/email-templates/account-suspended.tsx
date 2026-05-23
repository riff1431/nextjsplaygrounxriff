/**
 * Account Suspended Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface AccountSuspendedProps {
    firstName: string;
    reason?: string;
    appUrl?: string;
}

export default function AccountSuspendedEmail({
    firstName = "there",
    reason,
    appUrl = "https://playgroundx.vip",
}: AccountSuspendedProps) {
    return (
        <EmailLayout preview={`Important: Your PlayGroundX account has been restricted`}>
            <Text style={s.heading}>⚠️ Account Restricted</Text>

            <Text style={s.paragraph}>
                Hey {firstName}, your PlayGroundX account has been temporarily restricted by our moderation team.
            </Text>

            {reason && (
                <Section style={s.warningBox}>
                    <Text style={{ ...s.muted, margin: "0 0 4px" }}>Reason</Text>
                    <Text style={{ color: "#fde68a", fontSize: "14px", margin: 0 }}>
                        {reason}
                    </Text>
                </Section>
            )}

            <Section style={s.infoBox}>
                <Text style={s.subheading}>What this means:</Text>
                <Text style={s.paragraph}>
                    • You won't be able to access live rooms or create sessions
                    <br />
                    • Your wallet funds remain safe and untouched
                    <br />
                    • Your profile and content are preserved
                </Text>
            </Section>

            <Text style={s.paragraph}>
                If you believe this is a mistake, you can submit an appeal and our team will review your case within 24–72 hours.
            </Text>

            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/appeals`} style={s.ctaButtonCyan}>
                    Submit an Appeal →
                </Link>
            </Section>

            <Text style={s.muted}>
                For more information, review our{" "}
                <Link href={`${appUrl}/content-moderation`} style={{ color: "#00e6ff" }}>
                    Content Moderation Policy
                </Link>
                {" "}or contact{" "}
                <Link href="mailto:support@playgroundx.vip" style={{ color: "#00e6ff" }}>
                    support@playgroundx.vip
                </Link>
            </Text>
        </EmailLayout>
    );
}
