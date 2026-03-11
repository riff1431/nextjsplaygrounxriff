"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageSquare, Crown, Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface ChatMessage {
    id: string;
    sender_id: string | null;
    sender_name: string;
    message: string;
    created_at: string;
    is_tip: boolean;
    tip_amount: number | null;
    is_system: boolean;
    system_type: string | null;
}

interface FlashDropLiveChatProps {
    roomId: string | null;
    /** Pass the room's host_id so we can badge creator messages */
    hostId?: string | null;
    /** Style variant: 'fan' uses neon pink theme, 'creator' uses dark glass */
    variant?: "fan" | "creator";
}

export default function FlashDropLiveChat({
    roomId,
    hostId,
    variant = "fan",
}: FlashDropLiveChatProps) {
    const { user } = useAuth();
    const supabase = createClient();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [inputText, setInputText] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isCreator = variant === "creator";

    // Fetch message history
    const fetchMessages = useCallback(async () => {
        if (!roomId) return;
        const { data } = await supabase
            .from("room_chat_messages")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: true })
            .limit(100);
        if (data) setMessages(data as ChatMessage[]);
        setLoadingHistory(false);
    }, [roomId]);

    useEffect(() => {
        if (!roomId) { setLoadingHistory(false); return; }
        fetchMessages();
    }, [roomId, fetchMessages]);

    // Realtime subscription — append new messages live
    useEffect(() => {
        if (!roomId) return;
        const channel = supabase
            .channel(`fd-chat-${roomId}`) // Removed variant to consolidate
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "room_chat_messages",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload: any) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => {
                        // Avoid duplicates (optimistic inserts or multiple clients)
                        if (prev.some((m) => m.id === newMsg.id)) return prev;

                        // Extra safety for system messages (ignore identical ones within 3 seconds)
                        if (newMsg.is_system) {
                            const isDuplicate = prev.some(m =>
                                m.is_system &&
                                m.message === newMsg.message &&
                                Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 3000
                            );
                            if (isDuplicate) return prev;
                        }

                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe((status: any) => {
                if (status === "CHANNEL_ERROR") {
                    console.warn("⚠️ Flash drop chat subscription failed");
                }
            });
        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    // Auto-scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || !roomId || sending || !user) return;
        setSending(true);

        const senderName =
            user.user_metadata?.full_name ||
            user.user_metadata?.username ||
            user.email?.split("@")[0] ||
            (isCreator ? "Creator" : "Fan");

        // Optimistic append
        const optimisticId = `opt-${Date.now()}`;
        const optimistic: ChatMessage = {
            id: optimisticId,
            sender_id: user.id,
            sender_name: senderName,
            message: text,
            created_at: new Date().toISOString(),
            is_tip: false,
            tip_amount: null,
            is_system: false,
            system_type: null,
        };
        setMessages((prev) => [...prev, optimistic]);
        setInputText("");

        try {
            const { data } = await supabase
                .from("room_chat_messages")
                .insert({
                    room_id: roomId,
                    sender_id: user.id,
                    sender_name: senderName,
                    message: text,
                })
                .select()
                .single();

            // Replace optimistic message with real one
            if (data) {
                setMessages((prev) =>
                    prev.map((m) => (m.id === optimisticId ? (data as ChatMessage) : m))
                );
            }
        } catch (err) {
            console.error("Chat send failed:", err);
            // Remove optimistic on error
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    // Determine if a sender is the creator/host
    const isHost = (senderId: string | null) => !!hostId && senderId === hostId;

    const getMessageStyle = (m: ChatMessage) => {
        if (m.is_system) return "system";
        if (m.is_tip) return "tip";
        if (isHost(m.sender_id)) return "host";
        if (m.sender_id === user?.id) return "self";
        return "normal";
    };

    const primaryColor = "hsl(330 100% 55%)";
    const primaryLight = "hsl(330 100% 80%)";
    const primaryDim = "hsl(330 100% 55% / 0.3)";

    return (
        <div
            className="flex flex-col h-full rounded-2xl overflow-hidden"
            style={{
                background: isCreator ? "rgba(10,5,20,0.7)" : "rgba(0,0,0,0.55)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${primaryDim}`,
                boxShadow: `0 0 30px hsl(330 100% 55% / 0.08), inset 0 1px 0 hsl(330 100% 80% / 0.06)`,
            }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
                style={{ borderColor: "hsl(330 100% 55% / 0.2)" }}
            >
                <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: primaryColor, boxShadow: `0 0 8px ${primaryColor}` }}
                />
                <MessageSquare className="w-4 h-4" style={{ color: primaryLight }} />
                <span
                    className="text-sm font-black uppercase tracking-widest"
                    style={{ color: primaryLight, textShadow: `0 0 12px hsl(330 100% 60% / 0.6)`, fontFamily: "var(--fd-font-tech, monospace)" }}
                >
                    Live Chat
                </span>
                <div className="flex-1" />
                <span className="text-[10px] text-white/30 font-mono tabular-nums">
                    {messages.length > 0 ? `${messages.length} msgs` : roomId ? "No messages yet" : "Offline"}
                </span>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 min-h-0 scrollbar-thin scrollbar-thumb-pink-900/40">
                {/* State: no room */}
                {!roomId && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                        <MessageSquare className="w-8 h-8 text-white/10" />
                        <p className="text-white/25 text-[11px] font-mono">Session not live yet</p>
                    </div>
                )}

                {/* State: room found, loading history */}
                {roomId && loadingHistory && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-white/25 text-[11px] font-mono animate-pulse">Loading chat...</p>
                    </div>
                )}

                {/* State: room found, no messages */}
                {roomId && !loadingHistory && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                        <Zap className="w-8 h-8 text-white/10" />
                        <p className="text-white/25 text-[11px] font-mono">Be the first to say something! 👋</p>
                    </div>
                )}

                {/* Messages */}
                {messages.map((m) => {
                    const style = getMessageStyle(m);

                    // System event messages
                    if (style === "system") {
                        return (
                            <div key={m.id} className="flex items-center gap-2 py-0.5">
                                <div className="flex-1 h-px bg-white/5" />
                                <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                    style={{
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        color: m.system_type === "drop_new"
                                            ? "hsl(330 100% 70%)"
                                            : m.system_type === "drop_ended"
                                                ? "rgba(255,255,255,0.35)"
                                                : "hsl(45 100% 65%)",
                                    }}
                                >
                                    {m.message}
                                </span>
                                <div className="flex-1 h-px bg-white/5" />
                            </div>
                        );
                    }

                    const isMe = m.sender_id === user?.id;
                    const isHostMsg = style === "host";

                    return (
                        <div
                            key={m.id}
                            className={`flex items-start gap-2 group ${isMe ? "flex-row-reverse" : ""}`}
                        >
                            {/* Avatar */}
                            <div
                                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                                style={{
                                    background: isHostMsg
                                        ? "linear-gradient(135deg, hsl(280 100% 50%), hsl(330 100% 55%))"
                                        : m.is_tip
                                            ? "linear-gradient(135deg, hsl(330 100% 45%), hsl(330 100% 60%))"
                                            : isMe
                                                ? "linear-gradient(135deg, hsl(200 80% 40%), hsl(200 80% 55%))"
                                                : "rgba(255,255,255,0.08)",
                                    border: isHostMsg
                                        ? "1px solid hsl(280 100% 65% / 0.5)"
                                        : m.is_tip
                                            ? "1px solid hsl(330 100% 60% / 0.5)"
                                            : "1px solid rgba(255,255,255,0.1)",
                                    color: "#fff",
                                }}
                            >
                                {isHostMsg ? <Crown size={10} /> : m.sender_name[0]?.toUpperCase()}
                            </div>

                            {/* Message bubble */}
                            <div className={`flex-1 min-w-0 ${isMe ? "items-end" : ""} flex flex-col`}>
                                <div className={`flex items-baseline gap-1.5 flex-wrap ${isMe ? "flex-row-reverse" : ""}`}>
                                    <span
                                        className="text-[11px] font-bold leading-none shrink-0"
                                        style={{
                                            color: isHostMsg
                                                ? "hsl(280 100% 75%)"
                                                : m.is_tip
                                                    ? primaryLight
                                                    : isMe
                                                        ? "hsl(200 80% 70%)"
                                                        : "hsl(330 100% 65%)",
                                            textShadow: isHostMsg ? "0 0 8px hsl(280 100% 65% / 0.5)" : "none",
                                        }}
                                    >
                                        {m.sender_name}
                                        {isHostMsg && (
                                            <span
                                                className="ml-1 text-[8px] font-black uppercase tracking-widest px-1 rounded"
                                                style={{
                                                    background: "hsl(280 100% 40% / 0.4)",
                                                    border: "1px solid hsl(280 100% 60% / 0.4)",
                                                    color: "hsl(280 100% 85%)",
                                                }}
                                            >
                                                Creator
                                            </span>
                                        )}
                                    </span>
                                    {m.is_tip && m.tip_amount && (
                                        <span
                                            className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                            style={{
                                                background: "hsl(330 100% 40% / 0.4)",
                                                border: "1px solid hsl(330 100% 55% / 0.4)",
                                                color: "hsl(330 100% 85%)",
                                            }}
                                        >
                                            💰 ${m.tip_amount}
                                        </span>
                                    )}
                                </div>
                                <p
                                    className={`text-[12px] leading-snug mt-0.5 break-words max-w-[90%] px-2.5 py-1.5 rounded-xl ${isMe ? "self-end" : "self-start"}`}
                                    style={{
                                        background: isMe
                                            ? "hsl(200 80% 40% / 0.25)"
                                            : isHostMsg
                                                ? "hsl(280 100% 40% / 0.15)"
                                                : "rgba(255,255,255,0.05)",
                                        color: "rgba(255,255,255,0.82)",
                                        border: isMe
                                            ? "1px solid hsl(200 80% 55% / 0.2)"
                                            : isHostMsg
                                                ? "1px solid hsl(280 100% 55% / 0.2)"
                                                : "1px solid rgba(255,255,255,0.06)",
                                    }}
                                >
                                    {m.message}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div
                className="px-3 py-3 border-t shrink-0"
                style={{ borderColor: "hsl(330 100% 55% / 0.15)" }}
            >
                {!user ? (
                    <p className="text-center text-[11px] text-white/25 font-mono py-1">Sign in to chat</p>
                ) : (
                    <div className="flex gap-2 items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                            placeholder={roomId ? (isCreator ? "Reply to your fans..." : "Say something...") : "No active session..."}
                            disabled={!roomId || sending}
                            maxLength={300}
                            className="flex-1 text-[13px] px-3 py-2 rounded-xl outline-none transition-all disabled:opacity-40"
                            style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid hsl(330 100% 55% / 0.25)",
                                color: "#fff",
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = "hsl(330 100% 55% / 0.6)";
                                e.currentTarget.style.boxShadow = "0 0 12px hsl(330 100% 55% / 0.15)";
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = "hsl(330 100% 55% / 0.25)";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!roomId || !inputText.trim() || sending}
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: "linear-gradient(135deg, hsl(330 100% 40%), hsl(330 100% 55%))",
                                boxShadow: "0 0 14px hsl(330 100% 55% / 0.35)",
                            }}
                        >
                            <Send className="w-4 h-4 text-white" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
