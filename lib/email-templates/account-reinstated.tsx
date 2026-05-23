/**
 * Account Reinstated Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface AccountReinstatedProps {
    firstName: string;
    appUrl?: string;
}

export default function AccountReinstatedEmail({
    firstName = "there",
    appUrl = "https://playgroundx.vip",
}: AccountReinstatedProps) {
    return (
        <EmailLayout preview={`Your PlayGroundX account has been reinstated ✅`}>
            <Text style={s.heading}>Account Reinstated ✅</Text>

            <Text style={s.paragraph}>
                Hey {firstName}, your PlayGroundX account has been fully reinstated. All restrictions have been lifted and you now have full access to the platform again.
            </Text>

            <Section style={s.successBox}>
                <Text style={{ color: "#86efac", fontSize: "15px", margin: 0 }}>
                    ✅ Full access restored — rooms, wallet, and all features are available
                </Text>
            </Section>

            <Text style={s.paragraph}>
                Thank you for your patience while our team reviewed your account. We appreciate your understanding.
            </Text>

            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/home`} style={s.ctaButton}>
                    Continue on PlayGroundX →
                </Link>
            </Section>
        </EmailLayout>
    );
}
