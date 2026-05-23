/**
 * Wallet Low Balance Warning Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface WalletLowBalanceProps {
    firstName: string;
    currentBalance: number;
    appUrl?: string;
}

export default function WalletLowBalanceEmail({
    firstName = "there",
    currentBalance = 0,
    appUrl = "https://playgroundx.vip",
}: WalletLowBalanceProps) {
    return (
        <EmailLayout preview={`⚠️ Your PlayGroundX wallet balance is running low`}>
            <Text style={s.heading}>⚠️ Balance Running Low</Text>

            <Text style={s.paragraph}>
                Hey {firstName}, your wallet balance is getting low. You might not be able to continue enjoying rooms and premium content.
            </Text>

            <Section style={s.warningBox}>
                <Text style={s.infoBoxLabel}>Current Balance</Text>
                <Text style={{ ...s.infoBoxValue, color: "#fbbf24" }}>
                    ${currentBalance.toFixed(2)}
                </Text>
                <Text style={{ ...s.muted, marginTop: "8px", marginBottom: 0 }}>
                    Room sessions may be interrupted if your balance drops to $0.
                </Text>
            </Section>

            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/account/wallet`} style={s.ctaButton}>
                    Top Up Now →
                </Link>
            </Section>

            <Text style={{ ...s.muted, marginTop: "20px" }}>
                Keep your wallet funded to enjoy uninterrupted access to live rooms, tips, and premium interactions.
            </Text>
        </EmailLayout>
    );
}
