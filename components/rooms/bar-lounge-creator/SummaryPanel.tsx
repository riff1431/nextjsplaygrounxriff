"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface SummaryPanelProps {
    roomId?: string;
    sessionId?: string | null;
}

const SummaryPanel = ({ roomId, sessionId }: SummaryPanelProps) => {
    const supabase = createClient();
    const [stats, setStats] = useState({
        fans: 0,
        drinks: 0,
        tips: 0,
        requests: 0,
    });

    useEffect(() => {
        if (!roomId) return;

        async function fetchStats() {
            // Count unique chatters (fans) — scoped to session
            let fanQuery = supabase
                .from("bar_lounge_messages")
                .select("user_id", { count: "exact", head: true })
                .eq("room_id", roomId!)
                .eq("is_system", false);
            if (sessionId) fanQuery = fanQuery.eq("session_id", sessionId);

            const { count: fanCount } = await fanQuery;

            // Count requests — scoped to session
            let reqQuery = supabase
                .from("bar_lounge_requests")
                .select("type, amount")
                .eq("room_id", roomId!);
            if (sessionId) reqQuery = reqQuery.eq("session_id", sessionId);

            const { data: requests } = await reqQuery;

            const drinkCount = requests?.filter((r) => r.type === "drink" || r.type === "tip").length || 0;
            const tipTotal = requests?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
            const requestCount = requests?.length || 0;

            setStats({
                fans: fanCount || 0,
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

                setStats((prev) => ({
                    ...prev,
                    requests: prev.requests + 1,
                    tips: prev.tips + (newReq.amount || 0),
                    drinks: (newReq.type === "drink" || newReq.type === "tip") ? prev.drinks + 1 : prev.drinks,
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

                if (!newMsg.is_system) {
                    setStats((prev) => ({
                        ...prev,
                        fans: prev.fans + 1, // approximate — increments per message
                    }));
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
