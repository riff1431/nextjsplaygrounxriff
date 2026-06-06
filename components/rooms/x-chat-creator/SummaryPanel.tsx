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
            .on("postgres_changes", { event: "*", schema: "public", table: "x_chat_messages", filter: `room_id=eq.${roomId}` }, (payload: any) => {
                const msg = payload.new;
                if (sessionId && msg && msg.session_id !== sessionId) return;

                if (payload.eventType === "INSERT") {
                    if (msg && msg.paid_amount > 0) {
                        toast.success(`🎉 Paid Message: ${cs()}${msg.paid_amount} from ${msg.sender_name}!`);
                    }
                }
                fetchStats();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "x_chat_reactions", filter: `room_id=eq.${roomId}` }, (payload: any) => {
                const rxn = payload.new;
                if (sessionId && rxn && rxn.session_id !== sessionId) return;
                fetchStats();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "x_chat_requests", filter: `room_id=eq.${roomId}` }, (payload: any) => {
                const req = payload.new;
                if (sessionId && req && req.session_id !== sessionId) return;
                fetchStats();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, sessionId]);

    const statRows = [
        { icon: "👍", label: "REACTIONS", value: stats.totalReactions.toLocaleString() },
        { icon: "🎭", label: "STICKERS", value: stats.totalStickers.toLocaleString() },
        { icon: "💰", label: "PAID MESSAGES (EUR)", value: `${cs()}${stats.totalTips.toLocaleString()}`, tourTag: "xchat-creator-earned-amount" },
        { icon: "👥", label: "FANS", value: stats.fans.toLocaleString(), tourTag: "xchat-creator-live-fans" },
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
                    <div key={i} className="flex justify-between items-center" data-tour={stat.tourTag}>
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
