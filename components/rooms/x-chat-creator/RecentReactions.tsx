"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

interface XChatReaction {
    id: string;
    fan_id: string;
    reaction_type: string;
    amount: number;
    created_at: string;
    fan_name?: string;
}

const RecentReactions = ({ roomId }: { roomId?: string }) => {
    const supabase = createClient();
    const [reactions, setReactions] = useState<XChatReaction[]>([]);

    useEffect(() => {
        if (!roomId) return;

        async function fetchReactions() {
            const { data, error } = await supabase
                .from("x_chat_reactions")
                .select("id, fan_id, reaction_type, amount, created_at")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) {
                console.error("Error fetching reactions:", error.message);
                return;
            }

            // Fetch fan names
            if (data && data.length > 0) {
                const fanIds = [...new Set(data.map((r: any) => r.fan_id))];
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, full_name, username")
                    .in("id", fanIds);
                
                const profileMap = (profiles || []).reduce((acc: any, p: any) => {
                    acc[p.id] = p.full_name || p.username || "Anonymous";
                    return acc;
                }, {});

                const enriched = data.map((r: any) => ({
                    ...r,
                    fan_name: profileMap[r.fan_id] || "Anonymous",
                }));
                setReactions(enriched as XChatReaction[]);
            } else {
                setReactions([]);
            }
        }
        fetchReactions();

        const channel = supabase
            .channel(`x-chat-reactions-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "x_chat_reactions",
                filter: `room_id=eq.${roomId}`,
            }, async (payload: any) => {
                const newReaction = payload.new as XChatReaction;
                // Fetch profile for new reaction
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name, username")
                    .eq("id", newReaction.fan_id)
                    .single();
                
                newReaction.fan_name = profile?.full_name || profile?.username || "Anonymous";
                setReactions((prev) => [newReaction, ...prev].slice(0, 50));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    const formatReactionName = (rawType: string) => {
        return rawType
            .replace("reaction_", "")
            .replace("sticker_", "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="panel-glass rounded-lg flex flex-col min-h-0 min-h-[200px] flex-shrink-0">
            <div className="px-4 py-2 border-b border-border flex-shrink-0">
                <h2 className="font-display text-sm tracking-widest gold-text text-center uppercase">
                    🎁 Recent Reactions & Tips
                </h2>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto scrollbar-thin flex-1">
                {reactions.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No reactions yet</p>
                )}
                {reactions.map((r, i) => (
                    <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-white/5"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">
                                {r.fan_name}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                                Sent {formatReactionName(r.reaction_type)}
                            </span>
                        </div>
                        <div className="text-gold font-bold text-sm bg-gold/10 px-2 py-1 rounded">
                            €{r.amount}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default RecentReactions;
