/**
 * Account Reported Email — sent to the reported user
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface AccountReportedProps {
    firstName: string;
    appUrl?: string;
}

export default function AccountReportedEmail({
    firstName = "there",
    appUrl = "https://playgroundx.vip",
}: AccountReportedProps) {
    return (
        <EmailLayout preview="Content review notice — PlayGroundX">
            <Text style={s.heading}>Content Review Notice</Text>
            <Text style={s.paragraph}>
                Hey {firstName}, we want to let you know that some of your content or activity is currently under review by our moderation team.
            </Text>
            <Section style={s.warningBox}>
                <Text style={{ color: "#fde68a", fontSize: "14px", margin: 0 }}>
                    This is a routine review. No action has been taken on your account at this time.
                </Text>
            </Section>
            <Text style={s.paragraph}>
                Please take a moment to review our community guidelines to ensure your content remains compliant. Our team typically completes reviews within 24–72 hours.
            </Text>
            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/content-moderation`} style={s.ctaButtonCyan}>Review Guidelines</Link>
            </Section>
        </EmailLayout>
    );
}
