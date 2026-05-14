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

        async function fetchFanCount() {
            // Count fans from room_participants — people who actually joined the room
            const { data: participants } = await supabase
                .from("room_participants")
                .select("user_id")
                .eq("room_id", roomId!);

            const uniqueFans = new Set<string>(
                participants?.filter(p => p.user_id).map(p => p.user_id as string) || []
            );
            setFanIds(uniqueFans);
            return uniqueFans;
        }

        async function fetchStats() {
            const uniqueFans = await fetchFanCount();

            // Fetch all requests — try session-scoped first, fall back to room-only
            // The session_id column may not exist on bar_lounge_requests if the
            // migration hasn't been applied yet; in that case .eq() returns an error.
            let requests: any[] | null = null;

            if (sessionId) {
                const { data, error } = await supabase
                    .from("bar_lounge_requests")
                    .select("type, amount, session_id")
                    .eq("room_id", roomId!)
                    .eq("session_id", sessionId);

                if (!error && data) {
                    requests = data;
                }
            }

            // Fallback: fetch all requests for the room (no session filter)
            if (!requests) {
                const { data } = await supabase
                    .from("bar_lounge_requests")
                    .select("type, amount")
                    .eq("room_id", roomId!);
                requests = data;
            }

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
            // Listen for participants joining/leaving the room (not messages)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "room_participants",
                filter: `room_id=eq.${roomId}`,
            }, () => {
                // Re-fetch the full participant list on any change (INSERT or DELETE)
                fetchFanCount().then(updatedFans => {
                    setStats(s => ({ ...s, fans: updatedFans.size }));
                });
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
