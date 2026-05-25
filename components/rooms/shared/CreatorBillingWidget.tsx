"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { TrendingUp, Users, Timer, Zap } from "lucide-react";
import { cs } from "@/utils/currency";
import { createClient } from "@/utils/supabase/client";

/* ═══════════════════════════════════════════════════════════
   CreatorBillingWidget — Premium Live Stats Pill
   Always renders with real (or zero) values immediately.
   Updates in real-time via Supabase + 30s poll fallback.
   ═══════════════════════════════════════════════════════════ */

interface BillingSummary {
    total_earned: number;
    gross_collected: number;
    fan_count: number;
    live_fan_count: number;
    billed_fan_count: number;
    total_minutes_billed: number;
    rate: number;
    billing_enabled: boolean;
    last_charge_at: string | null;
}

interface CreatorBillingWidgetProps {
    sessionId: string;
    accentHsl?: string;
    pollMs?: number;
}

// Default summary shown immediately (zeros) before API responds
const DEFAULT_SUMMARY: BillingSummary = {
    total_earned: 0,
    gross_collected: 0,
    fan_count: 0,
    live_fan_count: 0,
    billed_fan_count: 0,
    total_minutes_billed: 0,
    rate: 0,
    billing_enabled: true,
    last_charge_at: null,
};

export default function CreatorBillingWidget({
    sessionId,
    accentHsl = "150, 80%, 50%",
    pollMs = 30_000,
}: CreatorBillingWidgetProps) {
    // Start with defaults so widget is always visible
    const [summary, setSummary] = useState<BillingSummary>(DEFAULT_SUMMARY);
    const [isCharging, setIsCharging] = useState(false);
    const [fetched, setFetched] = useState(false);
    const prevChargeAt = useRef<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const supabase = createClient();

    const isValidSession = !!(
        sessionId &&
        sessionId !== "undefined" &&
        sessionId !== "null" &&
        sessionId.length > 10
    );

    const fetchSummary = useCallback(async () => {
        if (!isValidSession) return;
        try {
            const res = await fetch(
                `/api/v1/rooms/sessions/${sessionId}/billing-summary`,
                { cache: "no-store" }
            );
            if (!res.ok) {
                console.warn("[BillingWidget] API returned", res.status, "for session", sessionId);
                return;
            }
            const data: BillingSummary = await res.json();

            if (
                data.last_charge_at &&
                prevChargeAt.current !== null &&
                data.last_charge_at !== prevChargeAt.current
            ) {
                setIsCharging(true);
                setTimeout(() => setIsCharging(false), 2500);
            }
            prevChargeAt.current = data.last_charge_at;
            setSummary(data);
            setFetched(true);
        } catch (e) {
            console.error("[BillingWidget] fetch error:", e);
        }
    }, [sessionId, isValidSession]);

    // ── Polling + immediate fetch ──
    useEffect(() => {
        if (!isValidSession) return;
        fetchSummary();
        intervalRef.current = setInterval(fetchSummary, pollMs);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchSummary, pollMs, isValidSession]);

    // ── Supabase real-time ──
    useEffect(() => {
        if (!isValidSession) return;
        const ch = supabase
            .channel(`cbw_${sessionId}_${Date.now()}`)
            .on("postgres_changes", {
                event: "INSERT", schema: "public",
                table: "session_billing_records",
                filter: `session_id=eq.${sessionId}`,
            }, () => fetchSummary())
            .on("postgres_changes", {
                event: "*", schema: "public",
                table: "room_session_participants",
                filter: `session_id=eq.${sessionId}`,
            }, () => fetchSummary())
            .subscribe((s: string) => { if (s === "SUBSCRIBED") fetchSummary(); });
        return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, isValidSession]);

    if (!isValidSession) return null;

    const C = cs();
    const accent = `hsl(${accentHsl})`;
    const accentA = (a: number) => `hsla(${accentHsl}, ${a})`;

    const earned = summary.total_earned % 1 === 0
        ? `${C}${summary.total_earned}`
        : `${C}${summary.total_earned.toFixed(2)}`;

    const showRate = summary.billing_enabled && summary.rate > 0;
    const isFetching = !fetched;    // True before first successful API response

    return (
        <>
            <style>{`
                @keyframes cbw-glow {
                    0%,100% { box-shadow: 0 2px 16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07); }
                    50%     { box-shadow: 0 0 0 2px ${accentA(0.55)}, 0 0 32px ${accentA(0.45)}, 0 2px 16px rgba(0,0,0,0.5); }
                }
                @keyframes cbw-bump {
                    0%   { transform: scale(1) translateY(0); }
                    30%  { transform: scale(1.18) translateY(-3px); }
                    65%  { transform: scale(0.95) translateY(1px); }
                    100% { transform: scale(1) translateY(0); }
                }
                @keyframes cbw-zap {
                    0%,100% { opacity:1; transform:scale(1) rotate(0deg); }
                    50%     { opacity:.25; transform:scale(1.6) rotate(22deg); }
                }
                @keyframes cbw-fadein {
                    from { opacity:0; transform:scale(.9) translateY(-4px); }
                    to   { opacity:1; transform:scale(1) translateY(0); }
                }
                @keyframes cbw-dot {
                    0%,100% { opacity:1; transform:scale(1); }
                    50%     { opacity:.3; transform:scale(.55); }
                }
                @keyframes cbw-mount {
                    from { opacity:0; transform:translateX(10px); }
                    to   { opacity:1; transform:translateX(0); }
                }
                @keyframes cbw-shimmer {
                    0%  { opacity:.5; }
                    50% { opacity:.9; }
                    100%{ opacity:.5; }
                }
                .cbw-rate { display:flex; align-items:stretch; }
                @media (max-width:599px) { .cbw-rate { display:none !important; } }
            `}</style>

            {/* ── Main pill ── */}
            <div
                style={{
                    display: "flex",
                    alignItems: "stretch",
                    background: isCharging
                        ? `linear-gradient(120deg, rgba(8,4,20,0.92) 0%, ${accentA(0.16)} 100%)`
                        : "rgba(8, 4, 20, 0.85)",
                    border: `1px solid ${isCharging ? accentA(0.55) : "rgba(255,255,255,0.16)"}`,
                    borderRadius: 12,
                    backdropFilter: "blur(18px)",
                    WebkitBackdropFilter: "blur(18px)",
                    boxShadow: "0 2px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
                    overflow: "hidden",
                    transition: "background .4s, border-color .4s, box-shadow .4s",
                    animation: isCharging
                        ? "cbw-glow .9s ease-in-out 2, cbw-mount .3s ease-out both"
                        : "cbw-mount .3s ease-out both",
                    fontFamily: "'Inter', sans-serif",
                    flexShrink: 0,
                    userSelect: "none",
                }}
            >
                {/* Accent stripe */}
                <div style={{
                    width: 3,
                    flexShrink: 0,
                    background: `linear-gradient(180deg, ${accent} 0%, ${accentA(0.35)} 100%)`,
                }} />

                {/* ── EARNED ── */}
                <Stat
                    label="Earned"
                    icon={<TrendingUp size={11} color={accent} />}
                    value={earned}
                    valueColor={isCharging ? "#ffffff" : accent}
                    bump={isCharging}
                    faint={isFetching}
                />

                <Divider />

                {/* ── LIVE FANS ── */}
                <Stat
                    label="Live Fans"
                    icon={<Users size={11} color="rgba(255,255,255,0.55)" />}
                    value={String(summary.fan_count)}
                    valueColor="#ffffff"
                    faint={isFetching}
                    suffix={summary.fan_count > 0
                        ? <span style={{
                            fontSize: 9, color: "#4ade80",
                            animation: "cbw-dot 2s ease-in-out infinite",
                            lineHeight: 1,
                        }} title="Live now">●</span>
                        : undefined
                    }
                />

                {/* ── PER MIN ── */}
                {showRate && (
                    <div className="cbw-rate">
                        <Divider />
                        <Stat
                            label="Per Min"
                            icon={<Timer size={11} color="hsl(35,100%,65%)" />}
                            value={`${C}${summary.rate}`}
                            valueColor="hsl(35,100%,65%)"
                            faint={isFetching}
                            suffix={
                                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", fontWeight: 400, marginLeft: 1 }}>/min</span>
                            }
                        />
                    </div>
                )}

                {/* Billing OFF */}
                {!summary.billing_enabled && (
                    <>
                        <Divider />
                        <div style={{ padding: "6px 12px", display: "flex", alignItems: "center" }}>
                            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: ".5px" }}>
                                Billing Off
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* ── BILLED! flash ── */}
            {isCharging && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "5px 10px", borderRadius: 9,
                    background: accentA(0.2),
                    border: `1px solid ${accent}`,
                    animation: "cbw-fadein .2s ease-out both",
                    flexShrink: 0,
                    boxShadow: `0 0 18px ${accentA(0.3)}`,
                }}>
                    <Zap size={11} color={accent} fill={accent} style={{ animation: "cbw-zap .35s ease-in-out 4" }} />
                    <span style={{
                        fontSize: 10, fontWeight: 800, color: accent,
                        letterSpacing: ".7px", textTransform: "uppercase",
                    }}>BILLED!</span>
                </div>
            )}
        </>
    );
}

/* ── Divider ── */
function Divider() {
    return (
        <div style={{
            width: 1,
            background: "rgba(255,255,255,0.09)",
            margin: "6px 0",
            flexShrink: 0,
        }} />
    );
}

/* ── Stat section ── */
function Stat({
    label, icon, value, valueColor, bump, suffix, faint,
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    valueColor: string;
    bump?: boolean;
    suffix?: React.ReactNode;
    faint?: boolean;
}) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px 13px",
            gap: 2,
            cursor: "default",
            minWidth: 58,
        }}>
            {/* Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                {icon}
                <span style={{
                    fontSize: 8.5, fontWeight: 600,
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase", letterSpacing: ".7px",
                    whiteSpace: "nowrap",
                }}>
                    {label}
                </span>
            </div>
            {/* Value */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{
                    fontSize: 16, fontWeight: 800,
                    color: faint ? "rgba(255,255,255,0.3)" : valueColor,
                    letterSpacing: "-.2px", lineHeight: 1,
                    transition: "color .3s",
                    animation: bump ? "cbw-bump .5s cubic-bezier(.34,1.56,.64,1)" : faint ? "cbw-shimmer 1.5s ease-in-out infinite" : undefined,
                    whiteSpace: "nowrap",
                }}>
                    {value}
                </span>
                {!faint && suffix}
            </div>
        </div>
    );
}
