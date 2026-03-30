"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, CheckSquare, Square, Loader2 } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Room Entry Info Modal
   ─────────────────────────────────────────────────────────
   Pops up before a fan enters a room. Shows 3 editable info
   sections themed to the room's visual identity.
   ═══════════════════════════════════════════════════════════ */

interface InfoItem {
    emoji: string;
    text: string;
}

interface InfoSection {
    title: string;
    items: InfoItem[];
}

interface RoomEntryInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEnter: () => void;
    roomType: string;
    roomLabel: string;
    roomEmoji?: string;
    accentHsl: string;           // e.g. "330, 85%, 55%"
    accentHslSecondary?: string;
    /* ── Dynamic session props ── */
    sessionTitle?: string;
    sessionDescription?: string;
    sessionType?: string;        // "public" | "private"
}

/* ── Room theme presets ───────────────────────────────── */
const ROOM_THEMES: Record<string, {
    bgGradient: string;
    cardBg: string;
    borderColor: string;
    glowColor: string;
    sectionBorder: string;
    heartEmoji: string;
    buttonGradient: string;
}> = {
    confessions: {
        bgGradient: "linear-gradient(145deg, rgba(80,10,50,0.97), rgba(30,5,40,0.98), rgba(50,5,30,0.99))",
        cardBg: "rgba(60,10,40,0.4)",
        borderColor: "rgba(236,72,153,0.3)",
        glowColor: "rgba(236,72,153,0.15)",
        sectionBorder: "rgba(236,72,153,0.25)",
        heartEmoji: "💜",
        buttonGradient: "linear-gradient(135deg, hsl(330,85%,45%), hsl(280,80%,50%))",
    },
    "x-chat": {
        bgGradient: "linear-gradient(145deg, rgba(40,30,10,0.97), rgba(30,20,5,0.98), rgba(50,35,5,0.99))",
        cardBg: "rgba(50,40,10,0.4)",
        borderColor: "rgba(234,179,8,0.3)",
        glowColor: "rgba(234,179,8,0.15)",
        sectionBorder: "rgba(234,179,8,0.25)",
        heartEmoji: "💛",
        buttonGradient: "linear-gradient(135deg, hsl(45,100%,45%), hsl(35,100%,40%))",
    },
    "bar-lounge": {
        bgGradient: "linear-gradient(145deg, rgba(30,10,60,0.97), rgba(20,5,50,0.98), rgba(40,10,70,0.99))",
        cardBg: "rgba(40,15,60,0.4)",
        borderColor: "rgba(168,85,247,0.3)",
        glowColor: "rgba(168,85,247,0.15)",
        sectionBorder: "rgba(168,85,247,0.25)",
        heartEmoji: "💜",
        buttonGradient: "linear-gradient(135deg, hsl(270,80%,50%), hsl(290,80%,45%))",
    },
    "truth-or-dare": {
        bgGradient: "linear-gradient(145deg, rgba(5,40,30,0.97), rgba(5,30,25,0.98), rgba(10,50,35,0.99))",
        cardBg: "rgba(10,40,30,0.4)",
        borderColor: "rgba(52,211,153,0.3)",
        glowColor: "rgba(52,211,153,0.15)",
        sectionBorder: "rgba(52,211,153,0.25)",
        heartEmoji: "💚",
        buttonGradient: "linear-gradient(135deg, hsl(150,80%,40%), hsl(170,80%,35%))",
    },
    suga4u: {
        bgGradient: "linear-gradient(145deg, rgba(60,5,40,0.97), rgba(40,5,30,0.98), rgba(70,10,50,0.99))",
        cardBg: "rgba(60,10,45,0.4)",
        borderColor: "rgba(244,114,182,0.3)",
        glowColor: "rgba(244,114,182,0.15)",
        sectionBorder: "rgba(244,114,182,0.25)",
        heartEmoji: "💖",
        buttonGradient: "linear-gradient(135deg, hsl(330,80%,55%), hsl(350,85%,50%))",
    },
    "flash-drops": {
        bgGradient: "linear-gradient(145deg, rgba(5,25,50,0.97), rgba(5,15,40,0.98), rgba(10,30,60,0.99))",
        cardBg: "rgba(10,25,50,0.4)",
        borderColor: "rgba(56,189,248,0.3)",
        glowColor: "rgba(56,189,248,0.15)",
        sectionBorder: "rgba(56,189,248,0.25)",
        heartEmoji: "💙",
        buttonGradient: "linear-gradient(135deg, hsl(200,90%,45%), hsl(220,85%,50%))",
    },
};

const DEFAULT_THEME = ROOM_THEMES.confessions;

/* ── Local storage key ────────────────────────────────── */
function getDismissKey(roomType: string) {
    return `room_entry_dismissed_v2_${roomType}`;
}

export function isRoomEntryDismissed(roomType: string): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(getDismissKey(roomType)) === "true";
}

/* ═══════════════════════════════════════════════════════ */
export default function RoomEntryInfoModal({
    isOpen,
    onClose,
    onEnter,
    roomType,
    roomLabel,
    roomEmoji,
    accentHsl,
    accentHslSecondary,
    sessionTitle,
    sessionDescription,
    sessionType,
}: RoomEntryInfoModalProps) {
    const [section1, setSection1] = useState<InfoSection | null>(null);
    const [section2, setSection2] = useState<InfoSection | null>(null);
    const [section3, setSection3] = useState<InfoSection | null>(null);
    const [proTip, setProTip] = useState("");
    const [loading, setLoading] = useState(true);
    const [acknowledged, setAcknowledged] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const theme = ROOM_THEMES[roomType] || DEFAULT_THEME;
    const accent = accentHsl;
    const accent2 = accentHslSecondary || accentHsl;

    /* ── Fetch content ── */
    const fetchEntryInfo = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/rooms/entry-info?room_type=${roomType}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setSection1(data.section1);
            setSection2(data.section2);
            setSection3(data.section3);
            setProTip(data.pro_tip || "");
        } catch {
            // Fallback — show generic content
            setSection1({ title: "What Happens Here", items: [{ emoji: "✨", text: "Interactive live sessions with creators" }] });
            setSection2({ title: "How to Participate", items: [{ emoji: "1️⃣", text: "Enter and enjoy the experience!" }] });
            setSection3({ title: "Ways to Spend", items: [{ emoji: "💰", text: "Various ways to interact and support" }] });
        } finally {
            setLoading(false);
        }
    }, [roomType]);

    useEffect(() => {
        if (isOpen) {
            fetchEntryInfo();
            setAcknowledged(false);
            setDontShowAgain(false);
        }
    }, [isOpen, fetchEntryInfo]);

    const handleEnter = () => {
        if (dontShowAgain) {
            localStorage.setItem(getDismissKey(roomType), "true");
        }
        onEnter();
    };

    if (!isOpen) return null;

    const accentColor = `hsl(${accent})`;
    const accentLight = `hsla(${accent}, 0.6)`;

    /* ── Section renderer (compact) ── */
    const renderSection = (section: InfoSection | null, isNumbered = false) => {
        if (!section || !section.items?.length) return null;
        return (
            <fieldset
                style={{
                    border: `1px dashed ${theme.sectionBorder}`,
                    borderRadius: "10px",
                    padding: "8px 12px",
                    margin: "0 0 6px",
                    background: theme.cardBg,
                    position: "relative",
                }}
            >
                <legend
                    style={{
                        padding: "0 8px",
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                    }}
                >
                    {section.title}
                    <span style={{ fontSize: "12px", filter: `drop-shadow(0 0 4px ${accentLight})` }}>
                        {theme.heartEmoji}
                    </span>
                </legend>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    {section.items.map((item, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "6px",
                                fontSize: "11px",
                                color: "rgba(255,255,255,0.85)",
                                lineHeight: 1.35,
                            }}
                        >
                            <span style={{ fontSize: "11px", flexShrink: 0, width: "16px", textAlign: "center" }}>
                                {isNumbered ? `${i + 1}.` : item.emoji}
                            </span>
                            <span>{item.text}</span>
                        </div>
                    ))}
                </div>
            </fieldset>
        );
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
                background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                padding: "10px",
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                style={{
                    background: theme.bgGradient,
                    border: `1px solid ${theme.borderColor}`,
                    borderRadius: "16px",
                    width: "100%",
                    maxWidth: "400px",
                    maxHeight: "96vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: `0 16px 60px ${theme.glowColor}, 0 0 30px ${theme.glowColor}`,
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* ── Sparkle top accent ── */}
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "2px",
                        background: `linear-gradient(90deg, transparent, hsl(${accent}), hsl(${accent2}), transparent)`,
                        borderRadius: "16px 16px 0 0",
                        zIndex: 1,
                    }}
                />

                {/* ── Close button ── */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)",
                        border: `1px solid ${theme.borderColor}`,
                        color: "rgba(255,255,255,0.6)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        zIndex: 2,
                    }}
                >
                    <X style={{ width: 13, height: 13 }} />
                </button>

                {/* ── Content ── */}
                <div style={{
                    padding: "14px 16px 14px",
                    overflowY: "auto",
                    flex: 1,
                }}>
                    {/* ── Header (compact) ── */}
                    <div style={{ textAlign: "center", marginBottom: "10px" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            marginBottom: "3px",
                            flexWrap: "wrap",
                        }}>
                            <span style={{ fontSize: "20px", filter: `drop-shadow(0 0 6px ${accentLight})` }}>
                                {theme.heartEmoji}
                            </span>
                            <h2
                                style={{
                                    fontSize: "17px",
                                    fontWeight: 900,
                                    background: `linear-gradient(135deg, #fff, hsl(${accent}))`,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    margin: 0,
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                {roomLabel}
                            </h2>
                            <span style={{ fontSize: "20px", filter: `drop-shadow(0 0 6px ${accentLight})` }}>
                                {theme.heartEmoji}
                            </span>
                            {/* LIVE badge */}
                            <span
                                style={{
                                    padding: "2px 7px",
                                    borderRadius: "5px",
                                    background: `hsla(${accent}, 0.2)`,
                                    border: `1px solid hsla(${accent}, 0.4)`,
                                    fontSize: "8px",
                                    fontWeight: 800,
                                    color: accentColor,
                                    letterSpacing: "1.2px",
                                    textTransform: "uppercase",
                                    animation: "entryModalPulse 2s ease-in-out infinite",
                                }}
                            >
                                LIVE NOW!
                            </span>
                        </div>

                        {/* ── Dynamic Session Details ── */}
                        {sessionTitle && (
                            <div style={{
                                marginTop: "6px",
                                padding: "7px 10px",
                                borderRadius: "8px",
                                background: `hsla(${accent}, 0.08)`,
                                border: `1px solid hsla(${accent}, 0.15)`,
                                textAlign: "left",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: sessionDescription ? "3px" : "0" }}>
                                    <span style={{
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: "#fff",
                                        flex: 1,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap" as const,
                                    }}>
                                        {sessionTitle}
                                    </span>
                                    {sessionType && (
                                        <span style={{
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            background: sessionType === "private"
                                                ? "rgba(168,85,247,0.2)"
                                                : `hsla(${accent}, 0.15)`,
                                            border: `1px solid ${sessionType === "private"
                                                ? "rgba(168,85,247,0.35)"
                                                : `hsla(${accent}, 0.25)`}`,
                                            fontSize: "8px",
                                            fontWeight: 700,
                                            color: sessionType === "private" ? "#c084fc" : accentColor,
                                            textTransform: "uppercase" as const,
                                            letterSpacing: "0.5px",
                                            flexShrink: 0,
                                        }}>
                                            {sessionType === "private" ? "🔒 Private" : "🌐 Public"}
                                        </span>
                                    )}
                                </div>
                                {sessionDescription && (
                                    <p style={{
                                        fontSize: "10px",
                                        color: "rgba(255,255,255,0.5)",
                                        margin: 0,
                                        lineHeight: 1.3,
                                        overflow: "hidden",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical" as const,
                                    }}>
                                        {sessionDescription}
                                    </p>
                                )}
                            </div>
                        )}

                        {!sessionTitle && (
                            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: "2px 0 0" }}>
                                Share and unlock secrets anonymously!
                            </p>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 0", gap: "8px", color: accentLight }}>
                            <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                            <span style={{ fontSize: "12px" }}>Loading room info...</span>
                        </div>
                    ) : (
                        <>
                            {/* ── Sections (no dividers — compact) ── */}
                            {renderSection(section1)}
                            {renderSection(section2, true)}
                            {renderSection(section3)}

                            {/* ── Pro Tip (compact) ── */}
                            {proTip && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        gap: "5px",
                                        padding: "6px 10px",
                                        borderRadius: "8px",
                                        background: `hsla(${accent}, 0.08)`,
                                        border: `1px solid hsla(${accent}, 0.15)`,
                                        marginBottom: "8px",
                                        fontSize: "10px",
                                        color: "rgba(255,255,255,0.7)",
                                        lineHeight: 1.35,
                                    }}
                                >
                                    <span style={{ fontSize: "11px", flexShrink: 0 }}>🧠</span>
                                    <span>
                                        <strong style={{ color: "#fff" }}>Pro Tip:</strong> {proTip}
                                    </span>
                                </div>
                            )}

                            {/* ── Checkboxes (side by side) ── */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginBottom: "10px" }}>
                                <label
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        cursor: "pointer",
                                        fontSize: "11px",
                                        color: "rgba(255,255,255,0.8)",
                                        userSelect: "none",
                                    }}
                                    onClick={() => setAcknowledged(!acknowledged)}
                                >
                                    {acknowledged ? (
                                        <CheckSquare style={{ width: 15, height: 15, color: accentColor, flexShrink: 0 }} />
                                    ) : (
                                        <Square style={{ width: 15, height: 15, color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                                    )}
                                    I have read and understand
                                </label>
                                <label
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        cursor: "pointer",
                                        fontSize: "11px",
                                        color: "rgba(255,255,255,0.8)",
                                        userSelect: "none",
                                    }}
                                    onClick={() => setDontShowAgain(!dontShowAgain)}
                                >
                                    {dontShowAgain ? (
                                        <CheckSquare style={{ width: 15, height: 15, color: accentColor, flexShrink: 0 }} />
                                    ) : (
                                        <Square style={{ width: 15, height: 15, color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                                    )}
                                    Don&apos;t show this again
                                </label>
                            </div>

                            {/* ── Enter Room button (compact) ── */}
                            <button
                                onClick={handleEnter}
                                disabled={!acknowledged}
                                style={{
                                    width: "100%",
                                    padding: "10px 18px",
                                    borderRadius: "10px",
                                    border: `1px solid ${theme.borderColor}`,
                                    background: acknowledged ? theme.buttonGradient : "rgba(255,255,255,0.06)",
                                    color: acknowledged ? "#fff" : "rgba(255,255,255,0.3)",
                                    fontSize: "13px",
                                    fontWeight: 800,
                                    cursor: acknowledged ? "pointer" : "not-allowed",
                                    transition: "all 0.3s ease",
                                    boxShadow: acknowledged ? `0 4px 16px ${theme.glowColor}` : "none",
                                    letterSpacing: "0.5px",
                                    textTransform: "uppercase",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    opacity: acknowledged ? 1 : 0.6,
                                    flexShrink: 0,
                                }}
                            >
                                Enter Room
                            </button>
                            {!acknowledged && (
                                <p style={{ textAlign: "center", fontSize: "9px", color: "rgba(255,255,255,0.35)", marginTop: "3px", marginBottom: 0 }}>
                                    Please confirm you understand before entering
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* ── Keyframe animations ── */}
                <style jsx global>{`
                    @keyframes entryModalPulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.6; }
                    }
                `}</style>
            </div>
        </div>
    );
}
