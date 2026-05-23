/**
 * New Subscriber Email — sent to creator when a fan subscribes
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface NewSubscriberProps {
    creatorName: string;
    fanName: string;
    fanUsername: string;
    tier?: string;
    appUrl?: string;
}

export default function NewSubscriberEmail({
    creatorName = "there",
    fanName = "Someone",
    fanUsername = "fan",
    tier = "Standard",
    appUrl = "https://playgroundx.vip",
}: NewSubscriberProps) {
    return (
        <EmailLayout preview={`${fanName} just subscribed to you! 🎉`}>
            <Text style={s.heading}>New Subscriber! 🎉</Text>
            <Text style={s.paragraph}>
                Hey {creatorName}, <strong>{fanName}</strong> (@{fanUsername}) just subscribed to your profile!
            </Text>
            <Section style={s.successBox}>
                <Text style={{ color: "#86efac", fontSize: "15px", margin: 0 }}>
                    🎉 +1 subscriber — {tier} tier
                </Text>
            </Section>
            <Text style={s.paragraph}>
                Keep creating amazing content. Your fans love what you do!
            </Text>
            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/home`} style={s.ctaButton}>View Your Profile →</Link>
            </Section>
        </EmailLayout>
    );
}
