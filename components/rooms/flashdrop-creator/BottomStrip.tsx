"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface BundleStat {
    label: string;
    key: string;
    sold: number;
}

const BUNDLES: BundleStat[] = [
    { label: "Weekend Bundle", key: "weekend bundle", sold: 0 },
    { label: "Backstage Bundle", key: "backstage bundle", sold: 0 },
    { label: "Whale Bundle", key: "whale bundle", sold: 0 },
];

interface BottomStripProps {
    roomId?: string | null;
}

const BottomStrip = ({ roomId }: BottomStripProps) => {
    const supabase = createClient();
    const [bundles, setBundles] = useState<BundleStat[]>(BUNDLES);

    const fetchStats = useCallback(async () => {
        if (!roomId) return;
        const { data } = await supabase
            .from("flash_drop_requests")
            .select("content, status")
            .eq("room_id", roomId)
            .eq("status", "accepted");

        if (!data) return;

        setBundles(prev => prev.map(b => ({
            ...b,
            sold: data.filter(r => r.content?.toLowerCase().includes(b.key)).length,
        })));
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;
        fetchStats();

        const channel = supabase
            .channel(`bundle-stats-${roomId}`)
            .on("postgres_changes", {
                event: "*", schema: "public", table: "flash_drop_requests", filter: `room_id=eq.${roomId}`,
            }, fetchStats)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchStats]);

    return (
        <div className="grid grid-cols-3 gap-3">
            {bundles.map((bundle) => (
                <div key={bundle.label} className="flex flex-col gap-1">
                    <span className="text-xs font-semibold neon-text tracking-wide uppercase">
                        {bundle.label}
                    </span>
                    <div className="glass-card rounded-lg flex flex-col items-center justify-center cursor-pointer h-16 w-full border border-primary/20 hover:border-primary/50 transition-all group">
                        <span className="font-display text-xl font-black text-primary">
                            {bundle.sold}
                        </span>
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">
                            sold
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BottomStrip;
