/**
 * Welcome Email — sent after sign-up
 */
import React from "react";
import { Text, Link, Section } from "react-email";
import EmailLayout, { emailStyles as s } from "./layout";

interface WelcomeEmailProps {
    firstName: string;
    role: "fan" | "creator";
    appUrl?: string;
}

export default function WelcomeEmail({
    firstName = "there",
    role = "fan",
    appUrl = "https://playgroundx.vip",
}: WelcomeEmailProps) {
    const isCreator = role === "creator";

    return (
        <EmailLayout preview={`Welcome to PlayGroundX, ${firstName}!`}>
            <Text style={s.heading}>
                Welcome to PlayGroundX, {firstName}! 🎉
            </Text>

            <Text style={s.paragraph}>
                {isCreator
                    ? "You're now part of the most electrifying creator platform on the internet. Your audience is waiting — let's get you set up."
                    : "You've just stepped into the neon playground. Live rooms, exclusive drops, private interactions — it's all here."}
            </Text>

            <Section style={s.infoBox}>
                <Text style={{ ...s.muted, margin: "0 0 8px" }}>
                    Your account type
                </Text>
                <Text style={{ ...s.infoBoxValue, fontSize: "16px" }}>
                    {isCreator ? "🎤 Creator Account" : "⚡ Fan Account"}
                </Text>
            </Section>

            {isCreator ? (
                <>
                    <Text style={s.subheading}>Next steps:</Text>
                    <Text style={s.paragraph}>
                        <strong style={{ color: "#ff00c8" }}>1.</strong> Complete your profile — add a bio, avatar, and banner
                        <br />
                        <strong style={{ color: "#ff00c8" }}>2.</strong> Verify your identity (KYC) to unlock all features
                        <br />
                        <strong style={{ color: "#ff00c8" }}>3.</strong> Set up your first room and go live!
                    </Text>
                </>
            ) : (
                <>
                    <Text style={s.subheading}>Here's what you can do:</Text>
                    <Text style={s.paragraph}>
                        <strong style={{ color: "#00e6ff" }}>💎</strong> Discover creators across 6 unique room types
                        <br />
                        <strong style={{ color: "#00e6ff" }}>🎮</strong> Join live sessions — Suga4U, Flash Drops, Truth or Dare & more
                        <br />
                        <strong style={{ color: "#00e6ff" }}>💰</strong> Top up your wallet and unlock premium content
                    </Text>
                </>
            )}

            <Section style={{ textAlign: "center" as const, marginTop: "24px" }}>
                <Link href={`${appUrl}/home`} style={s.ctaButton}>
                    {isCreator ? "Set Up Your Profile →" : "Start Exploring →"}
                </Link>
            </Section>

            <Text style={{ ...s.muted, marginTop: "24px" }}>
                Questions? Reply to this email or reach us at{" "}
                <Link href="mailto:support@playgroundx.vip" style={{ color: "#00e6ff" }}>
                    support@playgroundx.vip
                </Link>
            </Text>
        </EmailLayout>
    );
}
