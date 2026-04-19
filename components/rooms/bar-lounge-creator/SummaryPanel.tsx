"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface SummaryPanelProps {
    roomId?: string;
}

const SummaryPanel = ({ roomId }: SummaryPanelProps) => {
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
            // Count unique chatters (fans)
            const { count: fanCount } = await supabase
                .from("bar_lounge_messages")
                .select("user_id", { count: "exact", head: true })
                .eq("room_id", roomId!)
                .eq("is_system", false);

            // Count drink purchases
            const { data: requests } = await supabase
                .from("bar_lounge_requests")
                .select("type, amount")
                .eq("room_id", roomId!);

            const TIP_TYPES = ["drink", "tip", "champagne", "vip_bottle", "vip", "pin"];

            const drinkCount = requests?.filter((r) => r.type === "drink").length || 0;
            const tipTotal = requests?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
            const requestCount = requests?.filter((r) => !TIP_TYPES.includes(r.type)).length || 0;

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
            .channel(`bar-summary-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "bar_lounge_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const newReq = payload.new as any;
                const TIP_TYPES = ["drink", "tip", "champagne", "vip_bottle", "vip", "pin"];
                setStats((prev) => ({
                    ...prev,
                    drinks: newReq.type === "drink" ? prev.drinks + 1 : prev.drinks,
                    tips: prev.tips + (newReq.amount || 0),
                    requests: !TIP_TYPES.includes(newReq.type) ? prev.requests + 1 : prev.requests,
                }));
            })
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "bar_lounge_messages",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const newMsg = payload.new as any;
                if (!newMsg.is_system) {
                    setStats((prev) => ({
                        ...prev,
                        fans: prev.fans + 1, // approximate — increments per message
                    }));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

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
