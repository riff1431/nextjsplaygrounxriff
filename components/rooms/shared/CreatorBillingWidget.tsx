"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { TrendingUp, Users, Timer, Zap } from "lucide-react";
import { cs } from "@/utils/currency";
import { createClient } from "@/utils/supabase/client";

/* ═══════════════════════════════════════════════════════════
   CreatorBillingWidget  — Premium Unified Pill
   ─────────────────────────────────────────────────────────
   Single glassmorphic pill with 3 stat sections:
     EARNED  │  LIVE FANS  │  PER MIN

   Responsive:
     < 480px  : hidden (parent .slc-billing controls this)
     480–639px: EARNED + FANS (no rate)
     ≥ 640px  : All 3 stats

   Real-time via Supabase + 30s poll fallback.
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
    const [loading, setLoading] = useState(true);
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
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/billing-summary`);
            if (!res.ok) { setLoading(false); return; }
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
        finally { setLoading(false); }
    }, [sessionId, isValidSession]);

    // ── Polling fallback ──
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

    const accent = `hsl(${accentHsl})`;
    const accentA = (a: number) => `hsla(${accentHsl}, ${a})`;
    const C = cs();

    // ── Skeleton pill ──
    if (loading || !summary) {
        return (
            <>
                <style>{`
                    @keyframes cbw-sweep {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                    }
                `}</style>
                <div style={{
                    display: "flex", alignItems: "center",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    overflow: "hidden",
                    position: "relative",
                }}>
                    {/* Shimmer sweep */}
                    <div style={{
                        position: "absolute", inset: 0,
                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
                        animation: "cbw-sweep 1.5s ease-in-out infinite",
                        zIndex: 1,
                    }} />
                    {[
                        { label: "Earned", w: 78 },
                        { label: "Live Fans", w: 72 },
                        { label: "Per Min", w: 70 },
                    ].map(({ label, w }, i) => (
                        <React.Fragment key={label}>
                            {i > 0 && <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />}
                            <div style={{
                                width: w, padding: "6px 14px", display: "flex",
                                flexDirection: "column", alignItems: "center", gap: 3,
                            }}>
                                <div style={{ height: 8, width: "60%", borderRadius: 4, background: "rgba(255,255,255,0.08)" }} />
                                <div style={{ height: 13, width: "80%", borderRadius: 4, background: "rgba(255,255,255,0.12)" }} />
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </>
        );
    }

    const earnedInt = summary.total_earned % 1 === 0;
    const earned = earnedInt
        ? `${C}${summary.total_earned}`
        : `${C}${summary.total_earned.toFixed(2)}`;

    const showRate = summary.billing_enabled && summary.rate > 0;

    // Pill glow on charge
    const pillGlow = isCharging
        ? `0 0 0 1px ${accentA(0.5)}, 0 0 20px ${accentA(0.35)}, 0 4px 20px rgba(0,0,0,0.4)`
        : `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)`;

    return (
        <>
            <style>{`
                @keyframes cbw-glow {
                    0%,100% { box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06); }
                    50% { box-shadow: 0 0 0 1px ${accentA(0.6)}, 0 0 28px ${accentA(0.4)}, 0 4px 24px rgba(0,0,0,0.4); }
                }
                @keyframes cbw-bump {
                    0% { transform: scale(1) translateY(0); }
                    30% { transform: scale(1.12) translateY(-2px); }
                    60% { transform: scale(0.97) translateY(1px); }
                    100% { transform: scale(1) translateY(0); }
                }
                @keyframes cbw-zap {
                    0%,100% { opacity:1; transform:scale(1); }
                    50% { opacity:.3; transform:scale(1.4) rotate(15deg); }
                }
                @keyframes cbw-fadein {
                    from { opacity:0; transform:scale(.9) translateY(-4px); }
                    to { opacity:1; transform:scale(1) translateY(0); }
                }
                @keyframes cbw-dot {
                    0%,100% { opacity:1; transform:scale(1); }
                    50% { opacity:.4; transform:scale(.7); }
                }
                @keyframes cbw-mount {
                    from { opacity:0; transform:translateX(8px); }
                    to { opacity:1; transform:translateX(0); }
                }
                .cbw-rate { display: flex; align-items: stretch; }
                @media (max-width: 599px) { .cbw-rate { display: none !important; } }
            `}</style>

            {/* ── Unified pill ── */}
            <div
                style={{
                    display: "flex",
                    alignItems: "stretch",
                    background: isCharging
                        ? `linear-gradient(135deg, rgba(0,0,0,0.4), ${accentA(0.08)})`
                        : "rgba(0,0,0,0.35)",
                    border: `1px solid ${isCharging ? accentA(0.35) : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 12,
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                    boxShadow: pillGlow,
                    overflow: "hidden",
                    transition: "background .4s, border-color .4s, box-shadow .4s",
                    animation: isCharging
                        ? "cbw-glow .8s ease-in-out 2, cbw-mount .3s ease-out"
                        : "cbw-mount .3s ease-out",
                    fontFamily: "'Inter', sans-serif",
                    flexShrink: 0,
                }}
            >
                {/* ── Accent left stripe ── */}
                <div style={{
                    width: 3,
                    background: `linear-gradient(to bottom, ${accentA(0.9)}, ${accentA(0.3)})`,
                    flexShrink: 0,
                }} />

                {/* ── EARNED ── */}
                <StatSection
                    label="Earned"
                    icon={<TrendingUp size={12} color={accent} />}
                    value={earned}
                    valueColor={accent}
                    bump={isCharging}
                />

                {/* Divider */}
                <Divider />

                {/* ── LIVE FANS ── */}
                <StatSection
                    label="Live Fans"
                    icon={<Users size={12} color="rgba(255,255,255,0.55)" />}
                    value={String(summary.fan_count)}
                    valueColor="#fff"
                    suffix={summary.fan_count > 0 ? (
                        <span
                            title={`${summary.live_fan_count} watching now`}
                            style={{
                                fontSize: 9,
                                color: "#4ade80",
                                animation: "cbw-dot 2s ease-in-out infinite",
                                lineHeight: 1,
                            }}
                        >●</span>
                    ) : undefined}
                />

                {/* ── PER MIN — hidden on narrow screens ── */}
                {showRate && (
                    <div className="cbw-rate">
                        <Divider />
                        <StatSection
                            label="Per Min"
                            icon={<Timer size={12} color="hsl(35,100%,65%)" />}
                            value={`${C}${summary.rate}`}
                            valueColor="hsl(35,100%,65%)"
                            suffix={
                                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>/min</span>
                            }
                        />
                    </div>
                )}

                {/* ── Billing OFF indicator ── */}
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

            {/* ── BILLED! flash badge ── */}
            {isCharging && (
                <div style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "5px 10px", borderRadius: 8,
                    background: accentA(0.18),
                    border: `1px solid ${accent}`,
                    animation: "cbw-fadein .25s ease-out",
                    flexShrink: 0,
                }}>
                    <Zap
                        size={11}
                        color={accent}
                        fill={accent}
                        style={{ animation: "cbw-zap .35s ease-in-out 4" }}
                    />
                    <span style={{
                        fontSize: 10, fontWeight: 800,
                        color: accent,
                        letterSpacing: ".7px",
                        textTransform: "uppercase",
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
            background: "rgba(255,255,255,0.08)",
            margin: "6px 0",
            flexShrink: 0,
        }} />
    );
}

/* ── Stat Section ── */
function StatSection({
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
            padding: "5px 13px",
            gap: 1,
            cursor: "default",
            userSelect: "none",
        }}>
            {/* Label row */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                {icon}
                <span style={{
                    fontSize: 8,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: ".65px",
                    whiteSpace: "nowrap",
                }}>
                    {label}
                </span>
            </div>
            {/* Value row */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: valueColor,
                    letterSpacing: "-.3px",
                    lineHeight: 1,
                    transition: "color .25s",
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
