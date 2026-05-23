/**
 * Withdrawal Requested Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface WithdrawalRequestedProps {
    firstName: string;
    amount: number;
    method: string;
    appUrl?: string;
}

export default function WithdrawalRequestedEmail({
    firstName = "there",
    amount = 0,
    method = "PayPal",
    appUrl = "https://playgroundx.vip",
}: WithdrawalRequestedProps) {
    return (
        <EmailLayout preview={`Withdrawal request of $${amount.toFixed(2)} received`}>
            <Text style={s.heading}>Withdrawal Request Received 📤</Text>

            <Text style={s.paragraph}>
                Hey {firstName}, we've received your withdrawal request. Our team will review it shortly.
            </Text>

            <Section style={s.infoBox}>
                <table width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                        <tr>
                            <td style={{ padding: "6px 0" }}>
                                <Text style={{ ...s.muted, margin: 0 }}>Amount</Text>
                            </td>
                            <td style={{ textAlign: "right" as const }}>
                                <Text style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700, margin: 0 }}>
                                    ${amount.toFixed(2)}
                                </Text>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 0" }}>
                                <Text style={{ ...s.muted, margin: 0 }}>Method</Text>
                            </td>
                            <td style={{ textAlign: "right" as const }}>
                                <Text style={{ color: "#d1d5db", fontSize: "14px", margin: 0 }}>
                                    {method === "bank_transfer" ? "Bank Transfer" : "PayPal"}
                                </Text>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 0" }}>
                                <Text style={{ ...s.muted, margin: 0 }}>Status</Text>
                            </td>
                            <td style={{ textAlign: "right" as const }}>
                                <Text style={{
                                    ...s.badge,
                                    backgroundColor: "rgba(251, 191, 36, 0.15)",
                                    color: "#fbbf24",
                                    margin: 0,
                                }}>
                                    Under Review
                                </Text>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 0" }}>
                                <Text style={{ ...s.muted, margin: 0 }}>Processing Time</Text>
                            </td>
                            <td style={{ textAlign: "right" as const }}>
                                <Text style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                                    1–2 business days
                                </Text>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Section>

            <Text style={s.muted}>
                You'll receive another email once your withdrawal has been processed. If you have any questions, contact{" "}
                <Link href="mailto:support@playgroundx.vip" style={{ color: "#00e6ff" }}>
                    support@playgroundx.vip
                </Link>
            </Text>
        </EmailLayout>
    );
}
