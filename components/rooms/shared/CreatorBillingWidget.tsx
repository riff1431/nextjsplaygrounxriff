"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { TrendingUp, Users, Timer, Zap } from "lucide-react";
import { cs } from "@/utils/currency";
import { createClient } from "@/utils/supabase/client";

/* ═══════════════════════════════════════════════════════════
   CreatorBillingWidget — Premium Unified Pill
   ─────────────────────────────────────────────────────────
   Shows immediately with "—" placeholders (no invisible
   skeleton). Updates in real-time via Supabase + 30s poll.
   Visible on ALL room backgrounds (dark, medium, light).
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

export default function CreatorBillingWidget({
    sessionId,
    accentHsl = "150, 80%, 50%",
    pollMs = 30_000,
}: CreatorBillingWidgetProps) {
    const [summary, setSummary] = useState<BillingSummary | null>(null);
    const [isCharging, setIsCharging] = useState(false);
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
            if (!res.ok) return;
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
        } catch { /* silent */ }
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

    // Values — show "—" while loading, real data once available
    const earned = summary
        ? (summary.total_earned % 1 === 0
            ? `${C}${summary.total_earned}`
            : `${C}${summary.total_earned.toFixed(2)}`)
        : "—";
    const fans = summary ? String(summary.fan_count) : "—";
    const rate = summary
        ? (summary.billing_enabled && summary.rate > 0 ? `${C}${summary.rate}` : "—")
        : "—";
    const hasFans = (summary?.fan_count ?? 0) > 0;
    const showRate = !summary || (summary.billing_enabled && summary.rate > 0);

    return (
        <>
            <style>{`
                @keyframes cbw-glow {
                    0%,100% { box-shadow: 0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08); }
                    50% { box-shadow: 0 0 0 2px ${accentA(0.5)}, 0 0 28px ${accentA(0.4)}, 0 2px 16px rgba(0,0,0,0.5); }
                }
                @keyframes cbw-bump {
                    0%  { transform: scale(1)    translateY(0px); }
                    35% { transform: scale(1.15) translateY(-3px); }
                    65% { transform: scale(0.96) translateY(1px); }
                    100%{ transform: scale(1)    translateY(0px); }
                }
                @keyframes cbw-zap {
                    0%,100% { opacity:1; transform:scale(1) rotate(0deg); }
                    50%     { opacity:.3; transform:scale(1.5) rotate(20deg); }
                }
                @keyframes cbw-fadein {
                    from { opacity:0; transform:scale(.92) translateY(-3px); }
                    to   { opacity:1; transform:scale(1) translateY(0); }
                }
                @keyframes cbw-dot {
                    0%,100% { opacity:1;  transform:scale(1); }
                    50%     { opacity:.3; transform:scale(.6); }
                }
                @keyframes cbw-mount {
                    from { opacity:0; transform:translateX(10px); }
                    to   { opacity:1; transform:translateX(0); }
                }
                .cbw-rate { display:flex; align-items:stretch; }
                @media (max-width:599px) { .cbw-rate { display:none !important; } }
            `}</style>

            {/* ── Main pill ── */}
            <div
                style={{
                    display: "flex",
                    alignItems: "stretch",
                    /* Strong semi-opaque dark bg — visible on ALL room backgrounds */
                    background: isCharging
                        ? `linear-gradient(135deg, rgba(8,4,18,0.88) 0%, ${accentA(0.14)} 100%)`
                        : "rgba(8, 4, 18, 0.82)",
                    border: `1px solid ${isCharging ? accentA(0.5) : "rgba(255,255,255,0.18)"}`,
                    borderRadius: 12,
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                    overflow: "hidden",
                    transition: "background .35s, border-color .35s, box-shadow .35s",
                    animation: isCharging
                        ? "cbw-glow .8s ease-in-out 2, cbw-mount .3s ease-out both"
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
                    background: `linear-gradient(180deg, ${accent} 0%, ${accentA(0.4)} 100%)`,
                }} />

                {/* EARNED */}
                <Stat
                    label="Earned"
                    icon={<TrendingUp size={11} color={accent} />}
                    value={earned}
                    valueColor={accent}
                    bump={isCharging}
                />

                <Divider />

                {/* LIVE FANS */}
                <Stat
                    label="Live Fans"
                    icon={<Users size={11} color="rgba(255,255,255,0.6)" />}
                    value={fans}
                    valueColor="#ffffff"
                    suffix={hasFans
                        ? <span style={{ fontSize: 9, color: "#4ade80", animation: "cbw-dot 2s ease-in-out infinite", lineHeight: 1 }} title="Live now">●</span>
                        : undefined
                    }
                />

                {/* PER MIN — hidden < 600px */}
                {showRate && (
                    <div className="cbw-rate">
                        <Divider />
                        <Stat
                            label="Per Min"
                            icon={<Timer size={11} color="hsl(35,100%,65%)" />}
                            value={rate}
                            valueColor="hsl(35,100%,65%)"
                            suffix={summary
                                ? <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 400, marginLeft: 1 }}>/min</span>
                                : undefined
                            }
                        />
                    </div>
                )}
            </div>

            {/* BILLED! flash */}
            {isCharging && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "5px 10px", borderRadius: 9,
                    background: accentA(0.2),
                    border: `1px solid ${accent}`,
                    animation: "cbw-fadein .2s ease-out both",
                    flexShrink: 0,
                    boxShadow: `0 0 16px ${accentA(0.3)}`,
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
            background: "rgba(255,255,255,0.1)",
            margin: "6px 0",
            flexShrink: 0,
        }} />
    );
}

/* ── Stat section ── */
function Stat({
    label, icon, value, valueColor, bump, suffix,
}: {
    label: string;
    icon: React.ReactNode;
    value: string;
    valueColor: string;
    bump?: boolean;
    suffix?: React.ReactNode;
}) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "5px 12px",
            gap: 2,
            cursor: "default",
            minWidth: 56,
        }}>
            {/* Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                {icon}
                <span style={{
                    fontSize: 8, fontWeight: 600,
                    color: "rgba(255,255,255,0.45)",
                    textTransform: "uppercase", letterSpacing: ".65px",
                    whiteSpace: "nowrap",
                }}>
                    {label}
                </span>
            </div>
            {/* Value */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{
                    fontSize: 15, fontWeight: 800,
                    color: valueColor,
                    letterSpacing: "-.2px", lineHeight: 1,
                    transition: "color .2s",
                    animation: bump ? "cbw-bump .5s cubic-bezier(.34,1.56,.64,1)" : undefined,
                    whiteSpace: "nowrap",
                }}>
                    {value}
                </span>
                {suffix}
            </div>
        </div>
    );
}
