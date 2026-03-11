"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

interface SummaryPanelProps {
    roomId?: string;
}

const SummaryPanel = ({ roomId }: SummaryPanelProps) => {
    const supabase = createClient();
    const [stats, setStats] = useState({
        totalMessages: 0,
        queuedMessages: 0,
        answeredMessages: 0,
        totalReactions: 0,
        totalTips: 0,
        totalRequests: 0,
    });

    useEffect(() => {
        if (!roomId) return;

        async function fetchStats() {
            // Fetch message stats
            const { data: messages } = await supabase
                .from("x_chat_messages")
                .select("id, status, paid_amount")
                .eq("room_id", roomId);

            // Fetch reactions
            const { data: reactions } = await supabase
                .from("x_chat_reactions")
                .select("id, amount")
                .eq("room_id", roomId);

            // Fetch requests
            const { data: requests } = await supabase
                .from("x_chat_requests")
                .select("id")
                .eq("room_id", roomId);

            if (messages) {
                const queued = messages.filter(m => m.status === "Queued").length;
                const answered = messages.filter(m => m.status === "Answered").length;
                const messageTips = messages.reduce((sum, m) => sum + (Number(m.paid_amount) || 0), 0);
                const reactionTips = reactions?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;

                setStats({
                    totalMessages: messages.length,
                    queuedMessages: queued,
                    answeredMessages: answered,
                    totalReactions: reactions?.length || 0,
                    totalTips: messageTips + reactionTips,
                    totalRequests: requests?.length || 0,
                });
            }
        }
        fetchStats();

        // Subscribe to changes for live updates
        const channel = supabase
            .channel(`summary-${roomId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "x_chat_messages", filter: `room_id=eq.${roomId}` }, () => {
                fetchStats();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "x_chat_reactions", filter: `room_id=eq.${roomId}` }, () => {
                fetchStats();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "x_chat_requests", filter: `room_id=eq.${roomId}` }, () => {
                fetchStats();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    const statRows = [
        { icon: "👍", label: "REACTIONS", value: stats.totalReactions.toLocaleString() },
        { icon: "🎭", label: "STICKERS", value: stats.totalReactions.toLocaleString() },
        { icon: "💰", label: "TIPS (USD)", value: `$${stats.totalTips.toLocaleString()}` },
        { icon: "👥", label: "FANS", value: stats.totalMessages.toLocaleString() },
        { icon: "⭐", label: "REQUESTS", value: stats.totalRequests.toLocaleString() },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="panel-glass rounded-lg flex flex-col min-h-0 flex-shrink-0"
        >
            <div className="px-4 py-1 border-b border-border">
                <h2 className="font-display text-sm tracking-widest gold-text text-center">
                    ✨ SUMMARY
                </h2>
            </div>
            <div className="p-4 space-y-0">
                {statRows.map((stat, i) => (
                    <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span>{stat.icon}</span>
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground">
                                {stat.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-foreground text-lg">{stat.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default SummaryPanel;
