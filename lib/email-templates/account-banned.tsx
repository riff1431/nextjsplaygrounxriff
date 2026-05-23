/**
 * Account Banned / Terminated Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface AccountBannedProps {
    firstName: string;
    reason?: string;
}

export default function AccountBannedEmail({
    firstName = "there",
    reason,
}: AccountBannedProps) {
    return (
        <EmailLayout preview="Your PlayGroundX account has been terminated">
            <Text style={s.heading}>Account Terminated</Text>
            <Text style={s.paragraph}>
                {firstName}, your PlayGroundX account has been permanently terminated due to a violation of our platform policies.
            </Text>
            {reason && (
                <Section style={s.errorBox}>
                    <Text style={{ ...s.muted, margin: "0 0 4px" }}>Reason</Text>
                    <Text style={{ color: "#fca5a5", fontSize: "14px", margin: 0 }}>{reason}</Text>
                </Section>
            )}
            <Section style={s.infoBox}>
                <Text style={{ ...s.paragraph, marginBottom: 0 }}>
                    Your account has been disabled. Any remaining wallet balance will be processed per our terms. Data retained as required by law.
                </Text>
            </Section>
            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href="mailto:support@playgroundx.vip" style={s.ctaButtonCyan}>Contact Support</Link>
            </Section>
        </EmailLayout>
    );
}
