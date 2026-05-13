"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface SummaryPanelProps {
    roomId?: string;
    sessionId?: string | null;
}

/** Types that are auto-completed (drinks/tips) — not actionable "requests" */
const DRINK_TYPES = new Set(["drink", "champagne", "vip_bottle"]);
const TIP_LIKE_TYPES = new Set(["drink", "tip", "champagne", "vip_bottle", "pin"]);
/** Types that are actionable incoming requests requiring creator acceptance */
const REQUEST_TYPES = new Set(["vip", "booth", "song", "custom"]);

const SummaryPanel = ({ roomId, sessionId }: SummaryPanelProps) => {
    const supabase = createClient();
    const [stats, setStats] = useState({
        fans: 0,
        drinks: 0,
        tips: 0,
        requests: 0,
    });
    const [fanIds, setFanIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!roomId) return;

        async function fetchStats() {
            // Count unique chatters (fans) — scoped to session
            let fanQuery = supabase
                .from("bar_lounge_messages")
                .select("user_id")
                .eq("room_id", roomId!)
                .eq("is_system", false);
            if (sessionId) fanQuery = fanQuery.eq("session_id", sessionId);

            const { data: fansData } = await fanQuery;
            const uniqueFans = new Set<string>(fansData?.filter(m => m.user_id).map(m => m.user_id as string) || []);
            setFanIds(uniqueFans);

            // Fetch all requests — scoped to session
            let reqQuery = supabase
                .from("bar_lounge_requests")
                .select("type, amount")
                .eq("room_id", roomId!);
            if (sessionId) reqQuery = reqQuery.eq("session_id", sessionId);

            const { data: requests } = await reqQuery;

            // Drinks: only actual drink orders (drink, champagne, vip_bottle)
            const drinkCount = requests?.filter((r) => DRINK_TYPES.has(r.type)).length || 0;
            // Tips: sum amounts from all tip-like auto-completed items
            const tipTotal = requests
                ?.filter((r) => TIP_LIKE_TYPES.has(r.type))
                .reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
            // Requests: only actionable items that need creator acceptance
            const requestCount = requests?.filter((r) => REQUEST_TYPES.has(r.type)).length || 0;

            setStats({
                fans: uniqueFans.size,
                drinks: drinkCount,
                tips: tipTotal,
                requests: requestCount,
            });
        }

        fetchStats();

        // Real-time updates for requests
        const channel = supabase
            .channel(`bar-summary-${roomId}-${sessionId || 'all'}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "bar_lounge_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const newReq = payload.new as any;
                // Ignore requests from other sessions
                if (sessionId && newReq.session_id && newReq.session_id !== sessionId) return;

                const type = newReq.type as string;
                const amount = newReq.amount || 0;

                setStats((prev) => ({
                    ...prev,
                    drinks: DRINK_TYPES.has(type) ? prev.drinks + 1 : prev.drinks,
                    tips: TIP_LIKE_TYPES.has(type) ? prev.tips + amount : prev.tips,
                    requests: REQUEST_TYPES.has(type) ? prev.requests + 1 : prev.requests,
                }));
            })
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "bar_lounge_messages",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const newMsg = payload.new as any;
                // Ignore messages from other sessions
                if (sessionId && newMsg.session_id && newMsg.session_id !== sessionId) return;

                if (!newMsg.is_system && newMsg.user_id) {
                    setFanIds(prev => {
                        const newSet = new Set(prev);
                        newSet.add(newMsg.user_id);
                        setStats(s => ({ ...s, fans: newSet.size }));
                        return newSet;
                    });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, sessionId]);

    const statItems = [
        { label: "Fans", value: stats.fans.toLocaleString() },
        { label: "Drinks", value: stats.drinks.toLocaleString() },
        { label: "Tips", value: `€${stats.tips.toLocaleString()}` },
        { label: "Requests", value: stats.requests.toLocaleString() },
    ];

    return (
        <div className="glass-panel p-4">
            <h2 className="text-lg font-semibold text-gold font-title mb-3">Summary</h2>
            <div className="space-y-2">
                {statItems.map((stat, i) => (
                    <div key={i} className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: "hsl(280, 15%, 60%)" }}>{stat.label}</span>
                        <span className="text-sm font-semibold" style={{ color: "hsl(300, 20%, 95%)" }}>{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SummaryPanel;
