/**
 * Withdrawal Approved Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface WithdrawalApprovedProps {
    firstName: string;
    amount: number;
    method: string;
    remainingBalance?: number;
    appUrl?: string;
}

export default function WithdrawalApprovedEmail({
    firstName = "there",
    amount = 0,
    method = "PayPal",
    remainingBalance,
    appUrl = "https://playgroundx.vip",
}: WithdrawalApprovedProps) {
    return (
        <EmailLayout preview={`Your $${amount.toFixed(2)} withdrawal has been approved ✅`}>
            <Text style={s.heading}>Withdrawal Approved ✅</Text>

            <Text style={s.paragraph}>
                Great news, {firstName}! Your withdrawal has been approved and processed.
            </Text>

            <Section style={s.successBox}>
                <table width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                        <tr>
                            <td style={{ padding: "6px 0" }}>
                                <Text style={{ ...s.muted, margin: 0 }}>Amount Sent</Text>
                            </td>
                            <td style={{ textAlign: "right" as const }}>
                                <Text style={{ color: "#22c55e", fontSize: "20px", fontWeight: 700, margin: 0 }}>
                                    ${amount.toFixed(2)}
                                </Text>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 0" }}>
                                <Text style={{ ...s.muted, margin: 0 }}>Destination</Text>
                            </td>
                            <td style={{ textAlign: "right" as const }}>
                                <Text style={{ color: "#d1d5db", fontSize: "14px", margin: 0 }}>
                                    {method === "bank_transfer" ? "Bank Transfer" : "PayPal"}
                                </Text>
                            </td>
                        </tr>
                        {remainingBalance !== undefined && (
                            <tr>
                                <td style={{ padding: "6px 0" }}>
                                    <Text style={{ ...s.muted, margin: 0 }}>Remaining Balance</Text>
                                </td>
                                <td style={{ textAlign: "right" as const }}>
                                    <Text style={{ color: "#ffffff", fontSize: "14px", fontWeight: 600, margin: 0 }}>
                                        ${remainingBalance.toFixed(2)}
                                    </Text>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Section>

            <Text style={s.muted}>
                Funds may take 1–3 business days to appear in your account depending on your bank or payment provider.
            </Text>
        </EmailLayout>
    );
}
