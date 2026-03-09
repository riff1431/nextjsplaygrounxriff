"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface SummaryStats {
    fans: number;
    drops: number;
    packs: number;
    bundles: number;
    pendingRequests: number;
}

interface SummaryBoxProps {
    roomId: string | null;
}

const SummaryBox = ({ roomId }: SummaryBoxProps) => {
    const supabase = createClient();
    const [stats, setStats] = useState<SummaryStats>({
        fans: 0, drops: 0, packs: 0, bundles: 0, pendingRequests: 0
    });

    const fetchStats = useCallback(async () => {
        if (!roomId) return;

        // Drops stats
        const { data: drops } = await supabase
            .from("flash_drops")
            .select("id, kind, status")
            .eq("room_id", roomId);

        // Requests stats
        const { data: requests } = await supabase
            .from("flash_drop_requests")
            .select("id, status, content")
            .eq("room_id", roomId);

        // Unique fans from requests
        const { data: fanData } = await supabase
            .from("flash_drop_requests")
            .select("fan_id")
            .eq("room_id", roomId);

        const uniqueFans = new Set(fanData?.map(r => r.fan_id) ?? []).size;
        const liveDrops = (drops ?? []).filter(d => d.status === "Live").length;
        const packCount = (drops ?? []).filter(d => d.kind === "Pack").length;
        const bundleCount = (requests ?? []).filter(r =>
            r.content?.toLowerCase().includes("bundle")
        ).length;
        const pending = (requests ?? []).filter(r => r.status === "pending").length;

        setStats({
            fans: uniqueFans,
            drops: liveDrops,
            packs: packCount,
            bundles: bundleCount,
            pendingRequests: pending,
        });
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;
        fetchStats();

        const channel = supabase
            .channel(`summary-${roomId}`)
            .on("postgres_changes", {
                event: "*", schema: "public", table: "flash_drops", filter: `room_id=eq.${roomId}`,
            }, fetchStats)
            .on("postgres_changes", {
                event: "*", schema: "public", table: "flash_drop_requests", filter: `room_id=eq.${roomId}`,
            }, fetchStats)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchStats]);

    const items = [
        { label: "Fans", value: stats.fans },
        { label: "Drops", value: stats.drops },
        { label: "Packs", value: stats.packs },
        { label: "Bundles", value: stats.bundles },
        { label: "Requests", value: stats.pendingRequests },
    ];

    return (
        <div className="glass-panel rounded-xl p-4 flex-1 flex flex-col min-h-0">
            <h2 className="font-display text-lg font-bold neon-text mb-3 tracking-wider shrink-0">
                Summary Box
            </h2>
            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0">
                <div className="grid grid-cols-2 gap-2">
                    {items.map((item) => (
                        <div key={item.label} className="flex flex-col gap-1">
                            <span className="text-xs font-semibold neon-text tracking-wide uppercase">
                                {item.label}
                            </span>
                            <div className="glass-card rounded-lg flex items-center justify-center h-16 w-full border border-primary/20">
                                <span className="font-display text-2xl font-black text-primary">
                                    {roomId ? item.value : "—"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SummaryBox;
