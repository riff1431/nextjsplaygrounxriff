/**
 * Wallet Deposit Success Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface WalletDepositSuccessProps {
    firstName: string;
    amount: number;
    newBalance: number;
    paymentMethod: string;
    transactionId?: string;
    appUrl?: string;
}

export default function WalletDepositSuccessEmail({
    firstName = "there",
    amount = 0,
    newBalance = 0,
    paymentMethod = "Stripe",
    transactionId,
    appUrl = "https://playgroundx.vip",
}: WalletDepositSuccessProps) {
    return (
        <EmailLayout preview={`Deposit of $${amount.toFixed(2)} confirmed ✅`}>
            <Text style={s.heading}>Deposit Confirmed ✅</Text>

            <Text style={s.paragraph}>
                Hey {firstName}, your wallet has been topped up successfully.
            </Text>

            <Section style={s.successBox}>
                <table width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                        <tr>
                            <td style={{ padding: "8px 0" }}>
                                <Text style={s.infoBoxLabel}>Amount Deposited</Text>
                                <Text style={{ ...s.infoBoxValue, color: "#22c55e" }}>
                                    +${amount.toFixed(2)}
                                </Text>
                            </td>
                            <td style={{ padding: "8px 0", textAlign: "right" as const }}>
                                <Text style={s.infoBoxLabel}>New Balance</Text>
                                <Text style={s.infoBoxValue}>
                                    ${newBalance.toFixed(2)}
                                </Text>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Section>

            <Section style={s.infoBox}>
                <table width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                        <tr>
                            <td>
                                <Text style={{ ...s.muted, margin: 0 }}>Payment Method</Text>
                            </td>
                            <td style={{ textAlign: "right" as const }}>
                                <Text style={{ color: "#ffffff", fontSize: "14px", margin: 0 }}>
                                    {paymentMethod}
                                </Text>
                            </td>
                        </tr>
                        {transactionId && (
                            <tr>
                                <td style={{ paddingTop: "8px" }}>
                                    <Text style={{ ...s.muted, margin: 0 }}>Reference</Text>
                                </td>
                                <td style={{ textAlign: "right" as const, paddingTop: "8px" }}>
                                    <Text style={{ color: "#9ca3af", fontSize: "12px", fontFamily: "monospace", margin: 0 }}>
                                        {transactionId.slice(0, 16)}...
                                    </Text>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Section>

            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/home`} style={s.ctaButton}>
                    Start Exploring →
                </Link>
            </Section>

            <Text style={{ ...s.muted, marginTop: "20px" }}>
                You can view your full transaction history in your{" "}
                <Link href={`${appUrl}/account/wallet`} style={{ color: "#00e6ff" }}>
                    Wallet Dashboard
                </Link>
                .
            </Text>
        </EmailLayout>
    );
}
