/**
 * Session Earnings Summary Email — sent to creator after ending a session
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface SessionEarningsProps {
    firstName: string;
    roomType: string;
    duration: string;
    totalRevenue: number;
    platformFee: number;
    netEarnings: number;
    interactionCount?: number;
    appUrl?: string;
}

export default function SessionEarningsEmail({
    firstName = "there",
    roomType = "Live Room",
    duration = "0m",
    totalRevenue = 0,
    platformFee = 0,
    netEarnings = 0,
    interactionCount = 0,
    appUrl = "https://playgroundx.vip",
}: SessionEarningsProps) {
    return (
        <EmailLayout preview={`Session complete — you earned $${netEarnings.toFixed(2)}`}>
            <Text style={s.heading}>Session Complete 📊</Text>
            <Text style={s.paragraph}>
                Great session, {firstName}! Here's your earnings breakdown for your <strong>{roomType}</strong> session.
            </Text>
            <Section style={s.infoBox}>
                <table width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                        <tr>
                            <td style={{ padding: "6px 0" }}><Text style={{ ...s.muted, margin: 0 }}>Room</Text></td>
                            <td style={{ textAlign: "right" as const }}><Text style={{ color: "#fff", fontSize: "14px", margin: 0 }}>{roomType}</Text></td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 0" }}><Text style={{ ...s.muted, margin: 0 }}>Duration</Text></td>
                            <td style={{ textAlign: "right" as const }}><Text style={{ color: "#d1d5db", fontSize: "14px", margin: 0 }}>{duration}</Text></td>
                        </tr>
                        <tr>
                            <td style={{ padding: "6px 0" }}><Text style={{ ...s.muted, margin: 0 }}>Interactions</Text></td>
                            <td style={{ textAlign: "right" as const }}><Text style={{ color: "#d1d5db", fontSize: "14px", margin: 0 }}>{interactionCount}</Text></td>
                        </tr>
                    </tbody>
                </table>
            </Section>
            <Section style={s.successBox}>
                <table width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                        <tr>
                            <td><Text style={{ ...s.muted, margin: 0 }}>Gross Revenue</Text></td>
                            <td style={{ textAlign: "right" as const }}><Text style={{ color: "#d1d5db", fontSize: "14px", margin: 0 }}>${totalRevenue.toFixed(2)}</Text></td>
                        </tr>
                        <tr>
                            <td><Text style={{ ...s.muted, margin: 0 }}>Platform Fee</Text></td>
                            <td style={{ textAlign: "right" as const }}><Text style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>-${platformFee.toFixed(2)}</Text></td>
                        </tr>
                        <tr>
                            <td style={{ paddingTop: "8px" }}><Text style={{ color: "#22c55e", fontSize: "13px", fontWeight: 600, margin: 0 }}>Net Earnings</Text></td>
                            <td style={{ textAlign: "right" as const, paddingTop: "8px" }}><Text style={{ color: "#22c55e", fontSize: "20px", fontWeight: 700, margin: 0 }}>${netEarnings.toFixed(2)}</Text></td>
                        </tr>
                    </tbody>
                </table>
            </Section>
            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/creator/dashboard`} style={s.ctaButton}>View Dashboard →</Link>
            </Section>
        </EmailLayout>
    );
}
