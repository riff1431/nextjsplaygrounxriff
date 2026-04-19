"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Smile } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface ChatMsg {
    id: string;
    sender_name: string;
    body: string;
    lane: string;
    paid_amount: number;
    status: string;
    creator_reply: string | null;
    created_at: string;
}

const LiveChat = ({ roomId }: { roomId?: string }) => {
    const supabase = createClient();
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [message, setMessage] = useState("");
    const [activeFilter, setActiveFilter] = useState<"All" | "Paid" | "Priority">("All");
    const [showEmojis, setShowEmojis] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const EMOJIS = ["😀","😂","😍","🔥","🎉","👍","🙏","❤️","✨","💯","😎","👀","👑","💰"];

    useEffect(() => {
        if (!roomId) return;

        // Fetch existing messages
        async function fetchMessages() {
            const { data } = await supabase
                .from("x_chat_messages")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true })
                .limit(100);
            if (data) setMessages(data);
        }
        fetchMessages();

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`creator-livechat-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "x_chat_messages",
                filter: `room_id=eq.${roomId}`,
            }, (payload: any) => {
                setMessages((prev) => {
                    if (prev.some(m => m.id === (payload.new as ChatMsg).id)) return prev;
                    return [...prev, payload.new as ChatMsg];
                });
            })
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "x_chat_messages",
                filter: `room_id=eq.${roomId}`,
            }, (payload: any) => {
                const updated = payload.new as ChatMsg;
                setMessages((prev) => prev.map(m => m.id === updated.id ? updated : m));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeFilter]);

    const handleSend = async () => {
        if (!message.trim() || !roomId) return;
        // Creator sends a broadcast/system message
        await supabase.from("x_chat_messages").insert({
            room_id: roomId,
            sender_name: "🎤 Creator",
            body: message.trim(),
            lane: "Free",
            paid_amount: 0,
            status: "Answered",
        });
        setMessage("");
    };

    const getLaneBadge = (msg: ChatMsg) => {
        if (msg.lane === "Priority") return <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-300">👑</span>;
        if (msg.lane === "Paid") return <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-300">💰</span>;
        return null;
    };

    const filteredMessages = messages.filter(m => activeFilter === "All" || m.lane === activeFilter);

    return (
        <div className="panel-glass rounded-lg flex flex-col h-full overflow-hidden w-full pgx-chat-wrapper">
            {/* Header */}
            <div className="flex flex-col border-b border-border">
                <div className="flex items-center justify-between px-4 py-3 pb-2">
                    <h2 className="font-display text-sm tracking-widest gold-text flex items-center gap-2">
                        💬 LIVE CHAT
                        {messages.length > 0 && (
                            <span className="text-[10px] text-muted-foreground font-normal">({messages.length})</span>
                        )}
                    </h2>
                </div>
                
                {/* Lane Filters */}
                <div className="flex gap-2 px-3 pb-2">
                    {(["All", "Paid", "Priority"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                activeFilter === tab
                                    ? tab === "Priority" ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                    : tab === "Paid" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : "bg-primary/20 text-primary border border-primary/30"
                                : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                            }`}
                        >
                            {tab === "Priority" ? "👑 Priority" : tab === "Paid" ? "💰 Paid" : "All"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-2 pgx-chat-messages hide-scrollbar">
                {filteredMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
                )}
                {filteredMessages.map((m, i) => (
                    <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.5) }}
                        className="flex items-start gap-2 py-1"
                    >
                        <span className="text-lg flex-shrink-0">
                            {m.lane === "Priority" ? "👑" : m.lane === "Paid" ? "💎" : "🙂"}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-sm text-foreground">{m.sender_name}</span>
                                {getLaneBadge(m)}
                                {m.paid_amount > 0 && (
                                    <span className="text-[10px] text-gold">€{m.paid_amount}</span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-sm text-foreground/80 break-words">{m.body}</p>
                            {m.creator_reply && (
                                <div className="mt-1 pl-2 border-l-2 border-primary/30">
                                    <p className="text-xs text-primary">↳ {m.creator_reply}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-border relative">
                {/* Quick Emoji Picker */}
                {showEmojis && (
                    <div className="absolute bottom-[3.5rem] left-2 panel-glass p-2 grid grid-cols-7 gap-2 z-50 rounded-lg">
                        {EMOJIS.map(emoji => (
                            <button
                                type="button"
                                key={emoji}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMessage(prev => prev + emoji); setShowEmojis(false); }}
                                className="hover:scale-125 transition-transform text-lg"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowEmojis(!showEmojis); }}
                        className="bg-secondary/50 px-3 rounded hover:bg-secondary transition-colors text-muted-foreground flex items-center justify-center"
                    >
                        <Smile className="w-4 h-4" />
                    </button>
                    <input
                        type="text"
                        placeholder="Broadcast a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="flex-1 bg-input rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!message.trim() || !roomId}
                        className="bg-success text-success-foreground px-4 py-2 rounded text-sm font-bold tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveChat;
