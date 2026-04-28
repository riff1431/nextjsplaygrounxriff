"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Wallet, AlertTriangle, X } from "lucide-react";
import { useSessionBilling } from "@/hooks/useSessionBilling";

/* ═══════════════════════════════════════════════════════════
   BillingOverlay — Per-minute billing UI for fan watching pages
   ─────────────────────────────────────────────────────────
   • Shows a compact floating pill with minutes / total spent
   • Warns when balance is low (< 2 minutes remaining)
   • Shows full-screen eject modal when funds run out
   ═══════════════════════════════════════════════════════════ */

interface BillingOverlayProps {
    sessionId: string | null;
    /** Room accent color for theming, e.g. "280, 80%, 60%" */
    accentHsl?: string;
    /** Called when fan is auto-ejected for insufficient funds */
    onAutoEject?: () => void;
    /** Per-minute rate label to display (defaults to "€2/min") */
    rateLabel?: string;
    /** Back route when ejected */
    exitRoute?: string;
}

export default function BillingOverlay({
    sessionId,
    accentHsl = "280, 80%, 60%",
    onAutoEject,
    rateLabel,
    exitRoute = "/home",
}: BillingOverlayProps) {
    const router = useRouter();
    const billing = useSessionBilling(sessionId);
    const hasStartedRef = useRef(false);
    const [dismissed, setDismissed] = useState(false);
    const [showEjectModal, setShowEjectModal] = useState(false);
    const [ejectCountdown, setEjectCountdown] = useState(15);

    // Start billing on mount
    useEffect(() => {
        if (!sessionId || hasStartedRef.current) return;
        hasStartedRef.current = true;
        billing.startBilling();

        return () => {
            billing.stopBilling();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    // Handle auto-eject
    useEffect(() => {
        if (billing.autoEjected && !showEjectModal) {
            setShowEjectModal(true);
            setDismissed(false);
        }
    }, [billing.autoEjected, showEjectModal]);

    // Eject countdown timer
    useEffect(() => {
        if (!showEjectModal) return;
        const interval = setInterval(() => {
            setEjectCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onAutoEject?.();
                    router.push(exitRoute);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [showEjectModal, exitRoute, router, onAutoEject]);

    // Don't render if no session or billing hasn't started
    if (!sessionId || !billing.isActive && !billing.autoEjected) return null;

    const accent = `hsl(${accentHsl})`;
    const accentBg = `hsla(${accentHsl}, 0.15)`;
    const accentBorder = `hsla(${accentHsl}, 0.3)`;
    const lowBalance = billing.lastBalance !== null && billing.lastBalance < 10;

    // ── Auto-Eject Modal ──
    if (showEjectModal) {
        return (
            <div
                style={{
                    position: "fixed", inset: 0, zIndex: 99999,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.85)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    fontFamily: "'Inter', 'Montserrat', sans-serif",
                }}
            >
                <div style={{
                    background: "linear-gradient(145deg, rgba(40,10,30,0.97), rgba(20,5,25,0.98))",
                    border: `1px solid hsla(0, 70%, 50%, 0.3)`,
                    borderRadius: "20px",
                    padding: "40px",
                    maxWidth: "420px",
                    width: "90%",
                    textAlign: "center",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px hsla(0, 70%, 50%, 0.15)",
                }}>
                    {/* Warning icon */}
                    <div style={{
                        width: "64px", height: "64px", borderRadius: "50%",
                        background: "hsla(0, 70%, 50%, 0.15)",
                        border: "1px solid hsla(0, 70%, 50%, 0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 20px",
                    }}>
                        <AlertTriangle style={{ width: "32px", height: "32px", color: "hsl(0, 80%, 65%)" }} />
                    </div>

                    <h2 style={{
                        fontSize: "20px", fontWeight: 800, color: "#fff",
                        marginBottom: "8px",
                    }}>Session Ended</h2>
                    <p style={{
                        fontSize: "14px", color: "rgba(255,255,255,0.6)",
                        marginBottom: "24px", lineHeight: 1.5,
                    }}>
                        Insufficient wallet balance to continue.<br />
                        Top up your wallet to rejoin.
                    </p>

                    {/* Session summary */}
                    <div style={{
                        display: "flex", gap: "12px",
                        marginBottom: "24px",
                    }}>
                        <div style={{
                            flex: 1, padding: "12px",
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                        }}>
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                                Time Watched
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 800, color: accent }}>
                                {billing.minutesBilled} <span style={{ fontSize: "12px", fontWeight: 500 }}>min</span>
                            </div>
                        </div>
                        <div style={{
                            flex: 1, padding: "12px",
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                        }}>
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>
                                Total Spent
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 800, color: "hsl(42, 90%, 55%)" }}>
                                €{billing.totalBilled}
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <button
                            onClick={() => router.push("/settings/profile?tab=wallet")}
                            style={{
                                width: "100%", padding: "14px",
                                borderRadius: "12px", border: "none",
                                background: `linear-gradient(135deg, hsl(${accentHsl}), hsl(42, 90%, 55%))`,
                                color: "#fff", fontSize: "14px", fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: `0 4px 20px hsla(${accentHsl}, 0.4)`,
                                letterSpacing: "0.5px",
                            }}
                        >
                            💳 Top Up Wallet
                        </button>
                        <button
                            onClick={() => { onAutoEject?.(); router.push(exitRoute); }}
                            style={{
                                width: "100%", padding: "12px",
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.15)",
                                background: "rgba(255,255,255,0.05)",
                                color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Exit Room
                        </button>
                    </div>

                    {/* Countdown */}
                    <p style={{
                        fontSize: "11px", color: "rgba(255,255,255,0.3)",
                        marginTop: "16px", marginBottom: 0,
                    }}>
                        Auto-redirecting in {ejectCountdown}s...
                    </p>
                </div>
            </div>
        );
    }

    // ── Compact Billing Pill ──
    if (dismissed) return null;

    return (
        <div style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9990,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 16px",
            borderRadius: "9999px",
            background: lowBalance
                ? "hsla(0, 60%, 15%, 0.9)"
                : "hsla(270, 40%, 12%, 0.9)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: lowBalance
                ? "1px solid hsla(0, 70%, 50%, 0.4)"
                : `1px solid ${accentBorder}`,
            boxShadow: lowBalance
                ? "0 4px 20px hsla(0, 70%, 50%, 0.25)"
                : `0 4px 20px hsla(${accentHsl}, 0.2)`,
            fontFamily: "'Inter', 'Montserrat', sans-serif",
            animation: "billingPillSlideUp 0.4s ease-out",
        }}>
            <style>{`
                @keyframes billingPillSlideUp {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                @keyframes billingPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>

            {/* Timer icon */}
            <div style={{
                display: "flex", alignItems: "center", gap: "5px",
                color: lowBalance ? "hsl(0, 80%, 65%)" : accent,
            }}>
                <Clock style={{
                    width: "14px", height: "14px",
                    animation: lowBalance ? "billingPulse 1s ease-in-out infinite" : "none",
                }} />
                <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    {billing.minutesBilled} min
                </span>
            </div>

            {/* Divider */}
            <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.15)" }} />

            {/* Amount spent */}
            <div style={{
                display: "flex", alignItems: "center", gap: "4px",
                color: "hsl(42, 90%, 55%)",
            }}>
                <Wallet style={{ width: "13px", height: "13px" }} />
                <span style={{ fontSize: "12px", fontWeight: 700 }}>
                    €{billing.totalBilled}
                </span>
            </div>

            {/* Low balance warning */}
            {lowBalance && (
                <>
                    <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.15)" }} />
                    <div style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        animation: "billingPulse 1.5s ease-in-out infinite",
                    }}>
                        <AlertTriangle style={{ width: "12px", height: "12px", color: "hsl(45, 100%, 55%)" }} />
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "hsl(45, 100%, 55%)" }}>
                            LOW
                        </span>
                    </div>
                </>
            )}

            {/* Rate label */}
            {rateLabel && (
                <>
                    <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.15)" }} />
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                        {rateLabel}
                    </span>
                </>
            )}

            {/* Close button */}
            <button
                onClick={() => setDismissed(true)}
                style={{
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "rgba(255,255,255,0.4)",
                    padding: 0, marginLeft: "4px",
                }}
            >
                <X style={{ width: "10px", height: "10px" }} />
            </button>
        </div>
    );
}
