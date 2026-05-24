/**
 * PlayGroundX Branded Email Layout
 *
 * Shared wrapper for ALL transactional emails.
 * Dark neon aesthetic matching the platform brand.
 */

import React from "react";
import {
    Html,
    Head,
    Preview,
    Body,
    Container,
    Section,
    Img,
    Text,
    Hr,
    Link,
} from "react-email";

interface EmailLayoutProps {
    preview: string;
    children: React.ReactNode;
}

export default function EmailLayout({ preview, children }: EmailLayoutProps) {
    return (
        <Html lang="en">
            <Head>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                `}</style>
            </Head>
            <Preview>{preview}</Preview>
            <Body style={body}>
                <Container style={container}>
                    {/* ─── Header ─── */}
                    <Section style={header}>
                        <Text style={logoText}>
                            <span style={{ color: "#ff00c8" }}>Play</span>
                            <span style={{ color: "#ffffff" }}>Ground</span>
                            <span style={{ color: "#00e6ff" }}>X</span>
                        </Text>
                    </Section>

                    {/* ─── Accent line ─── */}
                    <Section style={accentLine} />

                    {/* ─── Content ─── */}
                    <Section style={content}>
                        {children}
                    </Section>

                    {/* ─── Footer ─── */}
                    <Section style={footer}>
                        <Hr style={divider} />
                        <Text style={footerText}>
                            PlayGroundX Digital Ltd · Ajax, ON, Canada
                        </Text>
                        <Text style={footerText}>
                            <Link href="mailto:support@playgroundx.vip" style={footerLink}>
                                support@playgroundx.vip
                            </Link>
                            {" · "}
                            <Link href="https://playgroundx.vip/terms" style={footerLink}>
                                Terms
                            </Link>
                            {" · "}
                            <Link href="https://playgroundx.vip/privacy" style={footerLink}>
                                Privacy
                            </Link>
                        </Text>
                        <Text style={copyright}>
                            © {new Date().getFullYear()} PlayGroundX. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// ─── Shared Styles ───────────────────────────────────────────

const body: React.CSSProperties = {
    backgroundColor: "#0a0a0a",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: 0,
    padding: 0,
};

const container: React.CSSProperties = {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#111111",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    marginTop: "40px",
    marginBottom: "40px",
};

const header: React.CSSProperties = {
    textAlign: "center" as const,
    padding: "32px 24px 16px",
};

const logoText: React.CSSProperties = {
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    margin: 0,
};

const accentLine: React.CSSProperties = {
    height: "2px",
    background: "linear-gradient(90deg, transparent, #ff00c8, #00e6ff, transparent)",
    margin: "0 24px",
};

const content: React.CSSProperties = {
    padding: "32px 32px 24px",
};

const footer: React.CSSProperties = {
    padding: "0 32px 32px",
};

const divider: React.CSSProperties = {
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: "20px",
};

const footerText: React.CSSProperties = {
    color: "#6b7280",
    fontSize: "12px",
    lineHeight: "20px",
    textAlign: "center" as const,
    margin: "4px 0",
};

const footerLink: React.CSSProperties = {
    color: "#9ca3af",
    textDecoration: "underline",
};

const copyright: React.CSSProperties = {
    color: "#4b5563",
    fontSize: "11px",
    textAlign: "center" as const,
    marginTop: "12px",
};

// ─── Reusable Sub-components ────────────────────────────────

export const emailStyles = {
    heading: {
        color: "#ffffff",
        fontSize: "24px",
        fontWeight: 700,
        lineHeight: "32px",
        margin: "0 0 16px",
    } as React.CSSProperties,

    subheading: {
        color: "#e5e7eb",
        fontSize: "18px",
        fontWeight: 600,
        lineHeight: "26px",
        margin: "0 0 12px",
    } as React.CSSProperties,

    paragraph: {
        color: "#d1d5db",
        fontSize: "15px",
        lineHeight: "24px",
        margin: "0 0 16px",
    } as React.CSSProperties,

    muted: {
        color: "#9ca3af",
        fontSize: "13px",
        lineHeight: "20px",
        margin: "0 0 12px",
    } as React.CSSProperties,

    ctaButton: {
        display: "inline-block",
        backgroundColor: "#ff00c8",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: 600,
        textDecoration: "none",
        padding: "12px 28px",
        borderRadius: "12px",
        textAlign: "center" as const,
    } as React.CSSProperties,

    ctaButtonCyan: {
        display: "inline-block",
        backgroundColor: "#00b8d9",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: 600,
        textDecoration: "none",
        padding: "12px 28px",
        borderRadius: "12px",
        textAlign: "center" as const,
    } as React.CSSProperties,

    infoBox: {
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "20px",
    } as React.CSSProperties,

    infoBoxLabel: {
        color: "#9ca3af",
        fontSize: "11px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px",
        margin: "0 0 4px",
    } as React.CSSProperties,

    infoBoxValue: {
        color: "#ffffff",
        fontSize: "20px",
        fontWeight: 700,
        margin: 0,
    } as React.CSSProperties,

    warningBox: {
        backgroundColor: "rgba(251, 191, 36, 0.08)",
        border: "1px solid rgba(251, 191, 36, 0.2)",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "20px",
    } as React.CSSProperties,

    errorBox: {
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "20px",
    } as React.CSSProperties,

    successBox: {
        backgroundColor: "rgba(34, 197, 94, 0.08)",
        border: "1px solid rgba(34, 197, 94, 0.2)",
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "20px",
    } as React.CSSProperties,

    badge: {
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: "999px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.3px",
    } as React.CSSProperties,
};
