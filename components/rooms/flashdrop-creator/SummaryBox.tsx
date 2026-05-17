"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { cs } from "@/utils/currency";

interface SummaryStats {
    fans: number;
    drops: number;
    packs: number;
    pendingRequests: number;
    tips: number;
}

interface SummaryBoxProps {
    roomId: string | null;
    sessionId?: string | null;
}

/** A compact neon-bordered stat tile */
function StatTile({ label, value, roomId }: { label: string; value: number; roomId: string | null }) {
    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            <span
                className="text-[9px] font-bold tracking-widest uppercase truncate"
                style={{ color: "hsl(var(--primary))", textShadow: "0 0 6px hsl(var(--primary)/0.6)" }}
            >
                {label}
            </span>
            <div
                className="rounded-lg flex items-center justify-center w-full"
                style={{
                    height: "46px",
                    background: "rgba(0,0,0,0.35)",
                    border: "2px solid hsl(var(--primary)/0.85)",
                    boxShadow: "0 0 10px hsl(var(--primary)/0.4), inset 0 0 8px hsl(var(--primary)/0.07)",
                }}
            >
                <span
                    className="font-display text-xl font-black"
                    style={{
                        color: "#ffffff",
                        textShadow: "0 0 12px hsl(var(--primary)/0.7)",
                        letterSpacing: "-0.02em",
                    }}
                >
                    {roomId ? value : "—"}
                </span>
            </div>
        </div>
    );
}

/** Spacer column between stat pairs */
function StatSpacer() {
    return <div className="w-2 shrink-0" />
}

const SummaryBox = ({ roomId, sessionId }: SummaryBoxProps) => {
    const supabase = createClient();
    const [stats, setStats] = useState<SummaryStats>({
        fans: 0, drops: 0, packs: 0, pendingRequests: 0, tips: 0
    });

    const fetchStats = useCallback(async () => {
        if (!roomId) return;

        try {
            let dropsQuery = supabase
                .from("flash_drops")
                .select("*", { count: "exact", head: true })
                .eq("room_id", roomId)
                .eq("status", "Live");
            if (sessionId) dropsQuery = dropsQuery.eq("session_id", sessionId);
            let { count: dropsCount, error: dropsErr } = await dropsQuery;
            // Fallback if session_id column doesn't exist
            if (dropsErr && dropsErr.message?.includes('session_id')) {
                ({ count: dropsCount } = await supabase
                    .from("flash_drops")
                    .select("*", { count: "exact", head: true })
                    .eq("room_id", roomId)
                    .eq("status", "Live"));
            }

            let packsQuery = supabase
                .from("flash_drop_roller_packs")
                .select("*", { count: "exact", head: true })
                .eq("room_id", roomId);
            if (sessionId) packsQuery = packsQuery.eq("session_id", sessionId);
            let { count: packsCount, error: packsErr } = await packsQuery;
            if (packsErr && packsErr.message?.includes('session_id')) {
                ({ count: packsCount } = await supabase
                    .from("flash_drop_roller_packs")
                    .select("*", { count: "exact", head: true })
                    .eq("room_id", roomId));
            }

            let pendingQuery = supabase
                .from("flash_drop_requests")
                .select("*", { count: "exact", head: true })
                .eq("room_id", roomId)
                .eq("status", "pending");
            if (sessionId) pendingQuery = pendingQuery.eq("session_id", sessionId);
            let { count: pendingCount, error: pendingErr } = await pendingQuery;
            if (pendingErr && pendingErr.message?.includes('session_id')) {
                ({ count: pendingCount } = await supabase
                    .from("flash_drop_requests")
                    .select("*", { count: "exact", head: true })
                    .eq("room_id", roomId)
                    .eq("status", "pending"));
            }

            let fanQuery = supabase
                .from("flash_drop_requests")
                .select("fan_id")
                .eq("room_id", roomId);
            if (sessionId) fanQuery = fanQuery.eq("session_id", sessionId);
            let { data: fanData, error: fanErr } = await fanQuery;
            if (fanErr && fanErr.message?.includes('session_id')) {
                ({ data: fanData } = await supabase
                    .from("flash_drop_requests")
                    .select("fan_id")
                    .eq("room_id", roomId));
            }

            const uniqueFans = new Set(fanData?.map((r) => r.fan_id) ?? []).size;

            // Tips: sum from active session for this room
            let totalTips = 0;
            const targetSessionId = sessionId;
            if (targetSessionId) {
                const { data: tipRows } = await supabase
                    .from("room_session_tips")
                    .select("amount")
                    .eq("session_id", targetSessionId);
                totalTips = (tipRows ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
            } else {
                const { data: activeSession } = await supabase
                    .from("room_sessions")
                    .select("id")
                    .eq("room_id", roomId)
                    .eq("status", "active")
                    .order("started_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (activeSession) {
                    const { data: tipRows } = await supabase
                        .from("room_session_tips")
                        .select("amount")
                        .eq("session_id", activeSession.id);
                    totalTips = (tipRows ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
                }
            }

            setStats({
                fans: uniqueFans,
                drops: dropsCount || 0,
                packs: packsCount || 0,
                pendingRequests: pendingCount || 0,
                tips: totalTips,
            });
        } catch (err) {
            console.error("[SummaryBox] Error fetching stats:", err);
        }
    }, [roomId, sessionId]);

    useEffect(() => {
        if (!roomId) return;
        fetchStats();
        const channel = supabase
            .channel(`summary-${roomId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "flash_drops", filter: `room_id=eq.${roomId}` }, fetchStats)
            .on("postgres_changes", { event: "*", schema: "public", table: "flash_drop_requests", filter: `room_id=eq.${roomId}` }, fetchStats)
            .on("postgres_changes", { event: "*", schema: "public", table: "flash_drop_roller_packs", filter: `room_id=eq.${roomId}` }, fetchStats)

            .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_session_tips" }, fetchStats)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchStats]);

    return (
        <div className="glass-panel rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 shrink-0 border-b border-white/[0.06]">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(160 80% 45%), hsl(200 80% 50%))' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                </div>
                <h2 className="font-display text-xs font-black tracking-wider uppercase" style={{ color: 'hsl(330 100% 75%)', textShadow: '0 0 10px hsl(330 100% 55% / 0.3)' }}>
                    Summary Box
                </h2>
            </div>

            {/* Stats grid — 2 rows of 3 */}
            <div className="flex-1 flex flex-col gap-1.5 min-h-0 px-3 py-2.5">
                {/* Row 1: FANS · DROPS · PACKS */}
                <div className="flex items-end gap-1.5">
                    <div className="flex-1 min-w-0">
                        <StatTile label="Fans" value={stats.fans} roomId={roomId} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <StatTile label="Drops" value={stats.drops} roomId={roomId} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <StatTile label="Packs" value={stats.packs} roomId={roomId} />
                    </div>
                </div>

                {/* Row 2: REQUESTS · TIPS */}
                <div className="flex items-end gap-1.5">
                    <div className="flex-1 min-w-0">
                        <StatTile label="Requests" value={stats.pendingRequests} roomId={roomId} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <StatTile label={`Tips (${cs()})`} value={stats.tips} roomId={roomId} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryBox;
