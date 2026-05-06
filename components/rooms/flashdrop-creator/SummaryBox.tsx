"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface SummaryStats {
    fans: number;
    drops: number;
    packs: number;
    pendingRequests: number;
    tips: number;
}

interface SummaryBoxProps {
    roomId: string | null;
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

const SummaryBox = ({ roomId }: SummaryBoxProps) => {
    const supabase = createClient();
    const [stats, setStats] = useState<SummaryStats>({
        fans: 0, drops: 0, packs: 0, pendingRequests: 0, tips: 0
    });

    const fetchStats = useCallback(async () => {
        if (!roomId) return;

        try {
            const { count: dropsCount } = await supabase
                .from("flash_drops")
                .select("*", { count: "exact", head: true })
                .eq("room_id", roomId)
                .eq("status", "Live");

            const { count: packsCount } = await supabase
                .from("flash_drop_roller_packs")
                .select("*", { count: "exact", head: true })
                .eq("room_id", roomId);

            const { count: pendingCount } = await supabase
                .from("flash_drop_requests")
                .select("*", { count: "exact", head: true })
                .eq("room_id", roomId)
                .eq("status", "pending");

            const { data: fanData } = await supabase
                .from("flash_drop_requests")
                .select("fan_id")
                .eq("room_id", roomId);

            const uniqueFans = new Set(fanData?.map((r) => r.fan_id) ?? []).size;

            // Tips: sum from active session for this room
            let totalTips = 0;
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
    }, [roomId]);

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
        <div className="glass-panel rounded-xl px-3 py-3 flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Title */}
            <h2 className="font-display text-sm font-bold neon-text mb-2 tracking-wider shrink-0">
                Summary Box
            </h2>

            {/* Stats grid — 2 rows of 3 */}
            <div className="flex-1 flex flex-col gap-1.5 min-h-0">
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
                        <StatTile label="Tips (€)" value={stats.tips} roomId={roomId} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SummaryBox;
