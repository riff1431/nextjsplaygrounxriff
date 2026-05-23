"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import EmojiPicker from "@/components/common/EmojiPicker";
import { createClient } from "@/utils/supabase/client";
import { cs } from "@/utils/currency";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";
import { useAvatarMap } from "@/hooks/useAvatarMap";

interface ChatMsg {
    id: string;
    sender_id?: string | null;
    sender_name: string;
    body: string;
    lane: string;
    paid_amount: number;
    status: string;
    creator_reply: string | null;
    created_at: string;
}

const LiveChat = ({ roomId, sessionId }: { roomId?: string; sessionId?: string | null }) => {
    const supabase = createClient();
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [message, setMessage] = useState("");
    const [activeFilter, setActiveFilter] = useState<"All" | "Paid" | "Priority">("All");
    const [showEmojis, setShowEmojis] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!roomId) return;

        // Reset messages for fresh session
        setMessages([]);

        // Fetch existing messages
        async function fetchMessages() {
            let query = supabase
                .from("x_chat_messages")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true })
                .limit(100);
            if (sessionId) query = query.eq("session_id", sessionId);
            const { data } = await query;
            if (data) setMessages(data);
        }
        fetchMessages();

        // Subscribe to real-time changes
        const channelName = sessionId ? `x-chat-${roomId}-${sessionId}` : `x-chat-${roomId}`;
        const filterStr = sessionId ? `session_id=eq.${sessionId}` : `room_id=eq.${roomId}`;

        const channel = supabase
            .channel(channelName)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "x_chat_messages",
                filter: filterStr,
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
                filter: filterStr,
            }, (payload: any) => {
                const updated = payload.new as ChatMsg;
                setMessages((prev) => prev.map(m => m.id === updated.id ? updated : m));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, sessionId]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeFilter]);

    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update time every 10 seconds to refresh the pinned message timer
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    const activePinMessage = React.useMemo(() => {
        // Search backwards to find the most recent pin message
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.status === "Pinned" && m.body.includes("📌")) {
                const pinTime = new Date(m.created_at).getTime();
                // Check if it's within 1 minute
                if (currentTime - pinTime <= 60 * 1000) {
                    return m;
                }
                // If the most recent one is expired, no older ones are active
                break;
            }
        }
        return null;
    }, [messages, currentTime]);

    const handleSend = async () => {
        if (!message.trim() || !roomId) return;
        const { data: { user } } = await supabase.auth.getUser();
        // Creator sends a broadcast/system message
        const insertPayload: any = {
            room_id: roomId,
            sender_name: "🎤 Creator",
            body: message.trim(),
            lane: "Free",
            paid_amount: 0,
            status: "Answered",
        };
        if (sessionId) insertPayload.session_id = sessionId;
        await supabase.from("x_chat_messages").insert(insertPayload);
        setMessage("");
    };

    const getLaneBadge = (msg: ChatMsg) => {
        if (msg.lane === "Priority") return <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-300">👑</span>;
        if (msg.lane === "Paid") return <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/15 text-cyan-300">💰</span>;
        return null;
    };

    const getMessageData = (msg: ChatMsg) => {
        let icon = msg.lane === "Priority" ? "👑" : msg.lane === "Paid" ? "💎" : "🙂";
        let text = msg.body;

        const KNOWN_EMOJIS = ["🔥", "💎", "👑", "⚡", "💋", "😈", "🌹", "🎁", "📌", "🎤", "📢", "❓", "👕", "💬"];
        const firstChar = Array.from(text)[0];
        
        if (firstChar && KNOWN_EMOJIS.includes(firstChar)) {
            icon = firstChar;
            // Remove the emoji and space from the body
            text = text.slice(firstChar.length).trim();
        } else {
            // Fallback for old messages without prefixed emoji
            const EMOJI_MAP: Record<string, string> = {
                "sent boost": "🔥",
                "sent shine": "💎",
                "sent crown": "👑",
                "sent pulse": "⚡",
                "sent kiss": "💋",
                "sent tease": "😈",
                "sent rose": "🌹",
                "sent gift": "🎁"
            };
            const lowerBody = text.toLowerCase();
            for (const [key, e] of Object.entries(EMOJI_MAP)) {
                if (lowerBody.includes(key)) {
                    icon = e;
                    break;
                }
            }
        }

        return { icon, text };
    };

    const paidUnreadCount = useMemo(() => {
        return messages.filter(m => m.lane === "Paid" && m.status === "Queued").length;
    }, [messages]);

    const priorityUnreadCount = useMemo(() => {
        return messages.filter(m => m.lane === "Priority" && m.status === "Queued").length;
    }, [messages]);

    const filteredMessages = messages.filter(m => activeFilter === "All" || m.lane === activeFilter);

    const senderIds = useMemo(() => messages.map(m => m.sender_id).filter(Boolean) as string[], [messages]);
    const avatarMap = useAvatarMap(senderIds);

    return (
        <div className="panel-glass rounded-lg flex flex-col h-full overflow-hidden w-full pgx-chat-wrapper">
            {/* Header */}
            <div className="flex flex-col border-b border-border shrink-0">
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
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                activeFilter === tab
                                    ? tab === "Priority" ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                    : tab === "Paid" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : "bg-primary/20 text-primary border border-primary/30"
                                : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                            }`}
                        >
                            {tab === "Priority" ? (
                                <>
                                    <span>👑 Priority</span>
                                    {priorityUnreadCount > 0 && (
                                        <span className="bg-yellow-400 text-black rounded-full text-[9px] font-extrabold px-1 py-0.5 leading-none flex items-center justify-center min-w-[14px] h-[14px] shadow-[0_0_10px_rgba(250,204,21,0.5)] animate-pulse">
                                            {priorityUnreadCount}
                                        </span>
                                    )}
                                </>
                            ) : tab === "Paid" ? (
                                <>
                                    <span>💰 Paid</span>
                                    {paidUnreadCount > 0 && (
                                        <span className="bg-cyan-400 text-black rounded-full text-[9px] font-extrabold px-1 py-0.5 leading-none flex items-center justify-center min-w-[14px] h-[14px] shadow-[0_0_10px_rgba(34,211,238,0.5)] animate-pulse">
                                            {paidUnreadCount}
                                        </span>
                                    )}
                                </>
                            ) : (
                                "All"
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pinned User Banner */}
            {activePinMessage && (
                <div className="mx-3 mt-2 p-2 rounded-lg border border-pink-500/50 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.15)] shrink-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">📌</span>
                        <span className="font-bold text-[11px] text-pink-400 uppercase tracking-wider">Pinned to Top</span>
                        <span className="ml-auto text-[10px] text-muted-foreground font-semibold">
                            {Math.ceil((60 * 1000 - (currentTime - new Date(activePinMessage.created_at).getTime())) / 60000)}m left
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-base shrink-0">👑</span>
                        <div className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                            <span className="font-bold text-sm text-white">{activePinMessage.sender_name}</span>
                            {activePinMessage.sender_id && <UserBadgeDisplay userId={activePinMessage.sender_id} />}
                            <span className="text-xs text-white/70 ml-1.5">is the life of the party!</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 scrollbar-thin px-3 py-2 space-y-2 pgx-chat-messages hide-scrollbar mt-1">
                {filteredMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
                )}
                {filteredMessages.map((m, i) => {
                    const { icon, text } = getMessageData(m);
                    return (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.5) }}
                            className="flex items-start gap-2 py-1"
                        >
                            {m.sender_id && avatarMap[m.sender_id] ? (
                                <span className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden">
                                    <img src={avatarMap[m.sender_id]} alt="" className="w-full h-full object-cover" />
                                </span>
                            ) : (
                                <span className="text-lg flex-shrink-0">
                                    {icon}
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="font-semibold text-sm text-foreground">{m.sender_name}</span>
                                    {m.sender_id && <UserBadgeDisplay userId={m.sender_id} />}
                                    {getLaneBadge(m)}
                                    {m.paid_amount > 0 && (
                                        <span className="text-[10px] text-gold">{cs()}{m.paid_amount}</span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground/80 break-words">{text}</p>
                                {m.creator_reply && (
                                    <div className="mt-1 pl-2 border-l-2 border-primary/30">
                                        <p className="text-xs text-primary">↳ {m.creator_reply}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-border relative shrink-0">
                <div className="flex gap-2">
                    <EmojiPicker
                        onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)}
                        accentColor="hsl(45, 90%, 55%)"
                        position="top"
                    />
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
