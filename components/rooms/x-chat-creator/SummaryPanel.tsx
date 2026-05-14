"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { cs } from "@/utils/currency";

interface SummaryPanelProps {
    roomId?: string;
    sessionId?: string | null;
}

const SummaryPanel = ({ roomId, sessionId }: SummaryPanelProps) => {
    const supabase = createClient();
    const [stats, setStats] = useState({
        totalMessages: 0,
        queuedMessages: 0,
        answeredMessages: 0,
        totalReactions: 0,
        totalStickers: 0,
        totalTips: 0,
        totalRequests: 0,
        fans: 0,
    });
    const [fanIds, setFanIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!roomId) return;

        // Reset stats for fresh session
        setStats({
            totalMessages: 0,
            queuedMessages: 0,
            answeredMessages: 0,
            totalReactions: 0,
            totalStickers: 0,
            totalTips: 0,
            totalRequests: 0,
            fans: 0,
        });
        setFanIds(new Set());

        async function fetchStats() {
            // Fetch message stats — tips are summed from here (includes reaction-originated messages)
            let msgQuery = supabase
                .from("x_chat_messages")
                .select("id, status, paid_amount, sender_id")
                .eq("room_id", roomId);
            if (sessionId) msgQuery = msgQuery.eq("session_id", sessionId);
            const { data: messages } = await msgQuery;

            // Fetch reactions with reaction_type to differentiate reactions vs stickers
            let rxnQuery = supabase
                .from("x_chat_reactions")
                .select("id, amount, reaction_type")
                .eq("room_id", roomId);
            if (sessionId) rxnQuery = rxnQuery.eq("session_id", sessionId);
            const { data: reactions } = await rxnQuery;

            // Fetch requests
            let reqQuery = supabase
                .from("x_chat_requests")
                .select("id")
                .eq("room_id", roomId);
            if (sessionId) reqQuery = reqQuery.eq("session_id", sessionId);
            const { data: requests } = await reqQuery;

            if (messages) {
                const queued = messages.filter(m => m.status === "Queued").length;
                const answered = messages.filter(m => m.status === "Answered").length;
                // Tips: sum from messages only (reactions already insert messages with paid_amount)
                const tipTotal = messages.reduce((sum, m) => sum + (Number(m.paid_amount) || 0), 0);

                // Split reactions vs stickers by reaction_type prefix
                const reactionCount = reactions?.filter(r => !r.reaction_type?.startsWith("sticker_")).length || 0;
                const stickerCount = reactions?.filter(r => r.reaction_type?.startsWith("sticker_")).length || 0;

                const uniqueFans = new Set<string>(messages.filter(m => m.sender_id).map(m => m.sender_id as string));
                setFanIds(uniqueFans);

                setStats({
                    totalMessages: messages.length,
                    queuedMessages: queued,
                    answeredMessages: answered,
                    totalReactions: reactionCount,
                    totalStickers: stickerCount,
                    totalTips: tipTotal,
                    totalRequests: requests?.length || 0,
                    fans: uniqueFans.size,
                });
            }
        }
        fetchStats();

        // Subscribe to changes for live updates
        const channel = supabase
            .channel(`summary-${roomId}-${sessionId || 'all'}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "x_chat_messages", filter: `room_id=eq.${roomId}` }, (payload: any) => {
                const msg = payload.new;
                if (sessionId && msg.session_id !== sessionId) return;
                if (msg.paid_amount > 0) {
                    toast.success(`🎉 New Tip: ${cs()}${msg.paid_amount} from ${msg.sender_name}!`);
                }
                if (msg.sender_id) {
                    setFanIds(prev => {
                        const newSet = new Set(prev);
                        newSet.add(msg.sender_id);
                        setStats(s => ({ ...s, fans: newSet.size }));
                        return newSet;
                    });
                }
                setStats(prev => ({
                    ...prev,
                    totalMessages: prev.totalMessages + 1,
                    totalTips: prev.totalTips + (Number(msg.paid_amount) || 0),
                    queuedMessages: msg.status === "Queued" ? prev.queuedMessages + 1 : prev.queuedMessages,
                }));
            })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "x_chat_reactions", filter: `room_id=eq.${roomId}` }, (payload: any) => {
                const rxn = payload.new;
                if (sessionId && rxn.session_id !== sessionId) return;
                const isSticker = rxn.reaction_type?.startsWith("sticker_");
                setStats(prev => ({
                    ...prev,
                    totalReactions: isSticker ? prev.totalReactions : prev.totalReactions + 1,
                    totalStickers: isSticker ? prev.totalStickers + 1 : prev.totalStickers,
                }));
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "x_chat_requests", filter: `room_id=eq.${roomId}` }, (payload: any) => {
                if (payload.eventType === "INSERT") {
                    if (sessionId && (payload.new as any)?.session_id !== sessionId) return;
                    setStats(prev => ({ ...prev, totalRequests: prev.totalRequests + 1 }));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, sessionId]);

    const statRows = [
        { icon: "👍", label: "REACTIONS", value: stats.totalReactions.toLocaleString() },
        { icon: "🎭", label: "STICKERS", value: stats.totalStickers.toLocaleString() },
        { icon: "💰", label: "TIPS (EUR)", value: `${cs()}${stats.totalTips.toLocaleString()}` },
        { icon: "👥", label: "FANS", value: stats.fans.toLocaleString() },
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
