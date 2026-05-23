/**
 * KYC Rejected Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface KycRejectedProps {
    firstName: string;
    reason: string;
    appUrl?: string;
}

export default function KycRejectedEmail({
    firstName = "there",
    reason = "Documents could not be verified",
    appUrl = "https://playgroundx.vip",
}: KycRejectedProps) {
    return (
        <EmailLayout preview="KYC verification update — resubmission needed">
            <Text style={s.heading}>KYC Verification Update</Text>
            <Text style={s.paragraph}>
                Hey {firstName}, unfortunately your identity verification was not approved at this time.
            </Text>
            <Section style={s.errorBox}>
                <Text style={{ ...s.muted, margin: "0 0 4px" }}>Reason</Text>
                <Text style={{ color: "#fca5a5", fontSize: "14px", margin: 0 }}>{reason}</Text>
            </Section>
            <Text style={s.paragraph}>
                Don't worry — you can resubmit your documents. Common issues include blurry photos, expired IDs, or mismatched selfies.
            </Text>
            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/onboarding`} style={s.ctaButton}>Resubmit Documents →</Link>
            </Section>
            <Text style={s.muted}>
                Need help? Contact{" "}
                <Link href="mailto:support@playgroundx.vip" style={{ color: "#00e6ff" }}>support@playgroundx.vip</Link>
            </Text>
        </EmailLayout>
    );
}
