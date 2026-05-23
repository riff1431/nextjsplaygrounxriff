/**
 * Withdrawal Rejected Email
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface WithdrawalRejectedProps {
    firstName: string;
    amount: number;
    reason?: string;
    appUrl?: string;
}

export default function WithdrawalRejectedEmail({
    firstName = "there",
    amount = 0,
    reason,
    appUrl = "https://playgroundx.vip",
}: WithdrawalRejectedProps) {
    return (
        <EmailLayout preview={`Withdrawal request update — action required`}>
            <Text style={s.heading}>Withdrawal Request Update</Text>

            <Text style={s.paragraph}>
                Hey {firstName}, we were unable to process your withdrawal request of <strong>${amount.toFixed(2)}</strong>.
            </Text>

            {reason && (
                <Section style={s.errorBox}>
                    <Text style={{ ...s.muted, margin: "0 0 4px" }}>Reason</Text>
                    <Text style={{ color: "#fca5a5", fontSize: "14px", margin: 0 }}>
                        {reason}
                    </Text>
                </Section>
            )}

            <Section style={s.infoBox}>
                <Text style={{ color: "#d1d5db", fontSize: "14px", margin: 0 }}>
                    💰 The funds (<strong>${amount.toFixed(2)}</strong>) have been returned to your wallet and are available immediately.
                </Text>
            </Section>

            <Text style={s.paragraph}>
                Please review the reason above and try again, or contact our support team for assistance.
            </Text>

            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href="mailto:support@playgroundx.vip" style={s.ctaButtonCyan}>
                    Contact Support
                </Link>
            </Section>
        </EmailLayout>
    );
}
