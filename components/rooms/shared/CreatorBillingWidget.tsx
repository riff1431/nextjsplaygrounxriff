"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { TrendingUp, Users, Timer, Zap } from "lucide-react";
import { cs } from "@/utils/currency";
import { createClient } from "@/utils/supabase/client";

/* ═══════════════════════════════════════════════════════════
   CreatorBillingWidget  — fully responsive
   ─────────────────────────────────────────────────────────
   Breakpoints:
     < 480px  : hidden (parent hides via .slc-billing)
     480–639px: EARNED + FANS only (compact labels)
     640–1023px: EARNED + FANS + RATE
     ≥ 1024px : EARNED + FANS + RATE (full labels)

   Always shows shimmer skeleton while loading.
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

    useEffect(() => {
        if (!isValidSession) return;
        fetchSummary();
        intervalRef.current = setInterval(fetchSummary, pollMs);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchSummary, pollMs, isValidSession]);

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

    /* ── Skeleton (visible loading state) ── */
    if (loading || !summary) {
        return (
            <>
                <style>{`
                    @keyframes cbw-shimmer{0%,100%{opacity:.6}50%{opacity:1}}
                `}</style>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {[{ w: 72, label: "Earned" }, { w: 60, label: "Fans" }, { w: 68, label: "Per Min" }].map(({ w, label }) => (
                        <div key={label} style={{
                            width: w, height: 36, borderRadius: 9,
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            backdropFilter: "blur(8px)",
                            animation: "cbw-shimmer 1.2s ease-in-out infinite",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</span>
                        </div>
                    ))}
                </div>
            </>
        );
    }

    const earned = summary.total_earned % 1 === 0
        ? `${C}${summary.total_earned}`
        : `${C}${summary.total_earned.toFixed(2)}`;

    return (
        <>
            <style>{`
                @keyframes cbw-glow{0%,100%{box-shadow:0 0 8px ${accentA(0.25)}}50%{box-shadow:0 0 22px ${accentA(0.7)},0 0 40px ${accentA(0.3)}}}
                @keyframes cbw-bump{0%{transform:scale(1)}30%{transform:translateY(-3px) scale(1.1)}60%{transform:translateY(1px) scale(.97)}100%{transform:scale(1)}}
                @keyframes cbw-zap{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.35) rotate(12deg)}}
                @keyframes cbw-fadein{from{opacity:0;transform:translateX(6px)}to{opacity:1;transform:none}}
                @keyframes cbw-dot{0%,100%{opacity:1}50%{opacity:.25}}
                .cbw-rate { display: flex; }
                @media (max-width: 479px) { .cbw-rate { display: none; } }
            `}</style>

            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "'Inter',sans-serif" }}>

                {/* ── EARNED — always visible ── */}
                <Tile
                    label="Earned"
                    value={earned}
                    valueColor={accent}
                    bg={isCharging ? accentA(0.2) : accentA(0.09)}
                    border={accentA(isCharging ? 0.55 : 0.22)}
                    icon={<TrendingUp size={11} color={accent} />}
                    glow={isCharging}
                    bumpValue={isCharging}
                />

                {/* ── FANS — always visible ── */}
                <Tile
                    label="Fans"
                    value={String(summary.fan_count)}
                    valueColor="#fff"
                    bg="rgba(255,255,255,0.06)"
                    border="rgba(255,255,255,0.13)"
                    icon={<Users size={11} color="rgba(255,255,255,0.5)" />}
                    liveDot={summary.fan_count > 0}
                    liveDotTitle={`${summary.live_fan_count} watching`}
                />

                {/* ── RATE — hidden on very small screens ── */}
                {summary.billing_enabled && summary.rate > 0 && (
                    <div className="cbw-rate">
                        <Tile
                            label="Per Min"
                            value={`${C}${summary.rate}`}
                            valueColor="hsl(35,100%,65%)"
                            bg="rgba(251,146,60,0.08)"
                            border="rgba(251,146,60,0.2)"
                            icon={<Timer size={11} color="hsl(35,100%,65%)" />}
                        />
                    </div>
                )}

                {/* ── BILLED! flash ── */}
                {isCharging && (
                    <div style={{
                        display: "flex", alignItems: "center", gap: "3px",
                        padding: "4px 8px", borderRadius: "8px",
                        background: accentA(0.16), border: `1px solid ${accent}`,
                        animation: "cbw-fadein .2s ease-out",
                    }}>
                        <Zap size={10} color={accent} fill={accent} style={{ animation: "cbw-zap .4s ease-in-out 3" }} />
                        <span style={{ fontSize: "9px", fontWeight: 800, color: accent, letterSpacing: ".6px", textTransform: "uppercase" }}>
                            BILLED!
                        </span>
                    </div>
                )}

                {/* ── Billing off badge ── */}
                {!summary.billing_enabled && (
                    <div style={{ padding: "4px 8px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.28)", letterSpacing: ".4px", textTransform: "uppercase" }}>Off</span>
                    </div>
                )}
            </div>
        </>
    );
}

/* ── Tile ── */
function Tile({
    label, value, valueColor, bg, border, icon,
    glow, bumpValue, liveDot, liveDotTitle,
}: {
    label: string; value: string; valueColor: string;
    bg: string; border: string; icon?: React.ReactNode;
    glow?: boolean; bumpValue?: boolean;
    liveDot?: boolean; liveDotTitle?: string;
}) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "4px 9px", borderRadius: "9px",
            background: bg, border: `1px solid ${border}`,
            backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            transition: "background .25s, border-color .25s, box-shadow .25s",
            flexShrink: 0, cursor: "default",
            animation: glow ? "cbw-glow .7s ease-in-out 2" : undefined,
        }}>
            {icon}
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <span style={{ fontSize: "8px", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: ".6px" }}>
                    {label}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    <span style={{
                        fontSize: "12px", fontWeight: 800, color: valueColor,
                        transition: "color .2s",
                        animation: bumpValue ? "cbw-bump .5s ease-in-out" : undefined,
                    }}>
                        {value}
                    </span>
                    {liveDot && (
                        <span
                            title={liveDotTitle}
                            style={{ fontSize: "7px", color: "#4ade80", lineHeight: 1, animation: "cbw-dot 2s ease-in-out infinite" }}
                        >●</span>
                    )}
                </div>
            </div>
        </div>
    );
}
