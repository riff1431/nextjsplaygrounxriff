"use client";

import React, { useEffect, useState } from "react";
import { Timer, Gift, CheckCircle2, Clock, Wallet } from "lucide-react";
import { cs } from "@/utils/currency";

interface HeaderBillingWidgetProps {
    sessionId: string | null;
    /** Room accent color, e.g. "280, 80%, 60%" */
    accentHsl?: string;
}

interface BillingState {
    isActive: boolean;
    minutesBilled: number;
    totalBilled: number;
    rate: number | null;
    billingEnabled: boolean;
    secondsUntilNextCharge: number;
    lastBalance: number | null;
    freeMinutes: number;
}

export default function HeaderBillingWidget({
    sessionId,
    accentHsl = "280, 80%, 60%",
}: HeaderBillingWidgetProps) {
    const [billingData, setBillingData] = useState<BillingState | null>(null);

    const isValidSession = !!(
        sessionId &&
        sessionId !== "undefined" &&
        sessionId !== "null" &&
        sessionId.length > 10
    );

    // ── Fallback Hydration ──
    useEffect(() => {
        if (!isValidSession) return;

        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/billing`);
                if (res.ok) {
                    const data = await res.json();
                    setBillingData({
                        isActive: false,
                        minutesBilled: data.total_minutes || 0,
                        totalBilled: data.total_billed || 0,
                        rate: data.rate ?? 0,
                        billingEnabled: data.billing_enabled !== false,
                        secondsUntilNextCharge: 60,
                        lastBalance: data.new_balance,
                        freeMinutes: data.free_minutes ?? 1,
                    });
                }
            } catch (err) {
                console.warn("[HeaderBillingWidget] initial fetch failed", err);
            }
        };

        fetchStatus();
    }, [sessionId, isValidSession]);

    // ── Sync with Live Events ──
    useEffect(() => {
        const handleUpdate = (e: Event) => {
            const ev = e as CustomEvent;
            setBillingData(ev.detail);
        };
        window.addEventListener("session-billing-update", handleUpdate);
        return () => window.removeEventListener("session-billing-update", handleUpdate);
    }, []);

    if (!isValidSession || !billingData) return null;

    const accent = `hsl(${accentHsl})`;
    const accentA = (opacity: number) => `hsla(${accentHsl}, ${opacity})`;
    const isFreeNow = billingData.billingEnabled && (billingData.minutesBilled < billingData.freeMinutes);

    const seconds = billingData.secondsUntilNextCharge;
    const countdownLabel = seconds <= 0 ? "0s" : `${seconds}s`;

    return (
        <>
            <style>{`
                @keyframes hbw-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.03); }
                }
                @keyframes hbw-glow {
                    0%, 100% { box-shadow: 0 2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05); }
                    50% { box-shadow: 0 0 14px ${accentA(0.4)}, 0 2px 10px rgba(0,0,0,0.3); }
                }
                .hbw-pulsing {
                    animation: hbw-pulse 1.8s ease-in-out infinite;
                }
                .hbw-glow-pulsing {
                    animation: hbw-glow 2.5s ease-in-out infinite;
                }
                
                .hbw-container {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 5px 14px;
                    border-radius: 9999px;
                    font-family: 'Inter', 'Montserrat', sans-serif;
                    font-size: 11.5px;
                    font-weight: 700;
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    user-select: none;
                    transition: all 0.3s ease;
                }

                .hbw-divider {
                    color: rgba(255, 255, 255, 0.15);
                    font-weight: 300;
                }

                /* Responsive design specifications */
                @media (max-width: 767px) {
                    .hbw-countdown-label {
                        display: none !important;
                    }
                }
                @media (max-width: 479px) {
                    .hbw-container {
                        padding: 4px 10px !important;
                        font-size: 10px !important;
                        gap: 6px !important;
                    }
                    .hbw-rate-text {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Render Billing Status */}
            {!billingData.billingEnabled ? (
                <div
                    className="hbw-container"
                    style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "rgba(255, 255, 255, 0.45)",
                    }}
                >
                    <CheckCircle2 size={12} color="rgba(255, 255, 255, 0.3)" />
                    <span>Free to watch</span>
                </div>
            ) : (
                <div
                    className="hbw-container hbw-glow-pulsing"
                    style={{
                        background: isFreeNow
                            ? "rgba(74, 222, 128, 0.06)"
                            : `linear-gradient(135deg, rgba(8, 4, 20, 0.85) 0%, ${accentA(0.08)} 100%)`,
                        border: isFreeNow
                            ? "1px solid rgba(74, 222, 128, 0.3)"
                            : `1px solid ${accentA(0.35)}`,
                        color: "#ffffff",
                    }}
                >
                    {/* 1. Timer / Minutes Billed */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: isFreeNow ? "#4ade80" : accent }}>
                        <Clock size={12} className={billingData.isActive ? "hbw-pulsing" : ""} />
                        <span>{billingData.minutesBilled} min</span>
                    </div>

                    <span className="hbw-divider">|</span>

                    {/* 2. Amount Spent */}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "hsl(42, 90%, 55%)" }}>
                        <Wallet size={12} />
                        <span>{cs()}{billingData.totalBilled}</span>
                    </div>

                    <span className="hbw-divider">|</span>

                    {/* 3. Rate Status & Countdown */}
                    {isFreeNow ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#4ade80" }}>
                            <Gift size={12} className="hbw-pulsing" />
                            <span className="hbw-rate-text">Free Trial</span>
                            <span className="hbw-countdown-label text-white/50" style={{ fontSize: "9.5px", fontWeight: 500, marginLeft: 2 }}>({countdownLabel})</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: accent }}>
                            <Timer size={12} />
                            <span className="hbw-rate-text">{cs()}{billingData.rate}/min</span>
                            <span className="hbw-countdown-label text-white/50" style={{ fontSize: "9.5px", fontWeight: 500, marginLeft: 2 }}>({countdownLabel})</span>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
