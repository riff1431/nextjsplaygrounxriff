/**
 * KYC Approved Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface KycApprovedProps {
    firstName: string;
    appUrl?: string;
}

export default function KycApprovedEmail({
    firstName = "there",
    appUrl = "https://playgroundx.vip",
}: KycApprovedProps) {
    return (
        <EmailLayout preview="Your identity has been verified! 🎉">
            <Text style={s.heading}>Identity Verified! 🎉</Text>
            <Text style={s.paragraph}>
                Congratulations {firstName}! Your KYC verification has been approved. You now have full access to all creator features on PlayGroundX.
            </Text>
            <Section style={s.successBox}>
                <Text style={{ color: "#86efac", fontSize: "15px", margin: 0 }}>
                    ✅ Verified Creator — all features unlocked
                </Text>
            </Section>
            <Text style={s.subheading}>What's next:</Text>
            <Text style={s.paragraph}>
                <strong style={{ color: "#ff00c8" }}>1.</strong> Set up your first room and configure pricing
                <br />
                <strong style={{ color: "#ff00c8" }}>2.</strong> Go live and start connecting with fans
                <br />
                <strong style={{ color: "#ff00c8" }}>3.</strong> Earn revenue from tips, rooms, and premium content
            </Text>
            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/home`} style={s.ctaButton}>Start Creating →</Link>
            </Section>
        </EmailLayout>
    );
}
