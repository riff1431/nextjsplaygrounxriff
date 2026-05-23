"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Heart, DollarSign, Users, Clock, TrendingUp, Gift } from "lucide-react";
import { useSuga4U, ActivityEvent } from "@/hooks/useSuga4U";
import { createClient } from "@/utils/supabase/client";
import { cs } from "@/utils/currency";

interface S4uSessionSummaryProps {
    roomId?: string;
    sessionId?: string;
}

const S4uSessionSummary = ({ roomId, sessionId }: S4uSessionSummaryProps) => {
    const { activity } = useSuga4U(roomId || null, sessionId || null);
    const [sessionStart, setSessionStart] = useState<string | null>(null);
    const [viewerCount, setViewerCount] = useState(0);
    const peakViewersRef = useRef(0);
    const [peakViewers, setPeakViewers] = useState(0);
    const [elapsed, setElapsed] = useState("0m");

    // Fetch session start time once
    useEffect(() => {
        if (!sessionId) return;
        const supabase = createClient();
        (async () => {
            const { data } = await supabase
                .from("room_sessions")
                .select("started_at, live_started_at")
                .eq("id", sessionId)
                .single();
            if (data) {
                setSessionStart(data.live_started_at || data.started_at);
            }
        })();
    }, [sessionId]);

    // Poll and subscribe to participant count (viewers) for real-time updates
    useEffect(() => {
        if (!sessionId) return;
        const supabase = createClient();

        const fetchCount = async () => {
            const { count } = await supabase
                .from("room_session_participants")
                .select("*", { count: "exact", head: true })
                .eq("session_id", sessionId);
            const c = count || 0;
            setViewerCount(c);
            if (c > peakViewersRef.current) {
                peakViewersRef.current = c;
                setPeakViewers(c);
            }
        };

        fetchCount();

        // Subscribe to changes in room_session_participants for this session
        const channel = supabase
            .channel(`s4u-viewers-${sessionId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "room_session_participants",
                    filter: `session_id=eq.${sessionId}`,
                },
                () => {
                    fetchCount();
                }
            )
            .subscribe();

        // Keep 15s fallback poll just in case of connection drop
        const interval = setInterval(fetchCount, 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [sessionId]);

    // Live duration timer
    useEffect(() => {
        if (!sessionStart) return;
        const updateElapsed = () => {
            const start = new Date(sessionStart).getTime();
            const diff = Math.max(0, Date.now() - start);
            const totalMin = Math.floor(diff / 60000);
            const hours = Math.floor(totalMin / 60);
            const mins = totalMin % 60;
            setElapsed(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
        };
        updateElapsed();
        const timer = setInterval(updateElapsed, 30000);
        return () => clearInterval(timer);
    }, [sessionStart]);

    // Compute stats from activity events (already session-scoped by useSuga4U)
    const stats = useMemo(() => {
        const totalEarned = activity.reduce((sum, a) => sum + (a.amount || 0), 0);
        const tipsReceived = activity.filter(a => a.type === "TIP").length;
        const totalInteractions = activity.length;
        return { totalEarned, tipsReceived, totalInteractions };
    }, [activity]);

    const items = [
        { icon: DollarSign, label: "Total Earned", value: `${cs()}${stats.totalEarned.toLocaleString()}` },
        { icon: Users, label: "Viewers", value: viewerCount.toLocaleString() },
        { icon: Clock, label: "Duration", value: elapsed },
        { icon: TrendingUp, label: "Peak Viewers", value: peakViewers.toLocaleString() },
        { icon: Gift, label: "Tips Received", value: stats.tipsReceived.toLocaleString() },
        { icon: Heart, label: "Interactions", value: stats.totalInteractions.toLocaleString() },
    ];

    return (
        <div className="s4u-creator-glass-panel p-4">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3">Summary</h3>
            <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4].map((i) => (
                    <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-pink-400 s4u-creator-animate-pulse"
                        style={{ animationDelay: `${i * 0.3}s` }}
                    />
                ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {items.map((stat, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2 flex items-center gap-2">
                        <stat.icon className="w-4 h-4 s4u-creator-text-primary" />
                        <div>
                            <p className="text-[10px] text-white/50">{stat.label}</p>
                            <p className="text-xs font-bold text-white">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default S4uSessionSummary;
