"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Send, MessageSquare, Crown, Zap , Smile } from 'lucide-react';
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";
import { useAvatarMap } from "@/hooks/useAvatarMap";

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
    sessionId?: string | null;
    /** Pass the room's host_id so we can badge creator messages */
    hostId?: string | null;
    /** Style variant: 'fan' uses neon pink theme, 'creator' uses dark glass */
    variant?: "fan" | "creator";
}

export default function FlashDropLiveChat({
    roomId,
    sessionId,
    hostId,
    variant = "fan",
}: FlashDropLiveChatProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
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
        let query = supabase
            .from("room_chat_messages")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: true })
            .limit(100);
        if (sessionId) query = query.eq("session_id", sessionId);
        const { data } = await query;
        if (data) setMessages(data as ChatMessage[]);
        setLoadingHistory(false);
    }, [roomId, sessionId]);

    useEffect(() => {
        if (!roomId) { setLoadingHistory(false); return; }
        fetchMessages();
    }, [roomId, fetchMessages]);

    // Realtime subscription — append new messages live
    useEffect(() => {
        if (!roomId) return;
        const channel = supabase
            .channel(`fd-chat-${roomId}-${sessionId || 'default'}`) // Scoped to session to prevent cross-bleed if multiple exist
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "room_chat_messages",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload: any) => {
                    const newMsg = payload.new as ChatMessage & { session_id?: string };
                    
                    // Session isolation filter
                    if (sessionId && newMsg.session_id && newMsg.session_id !== sessionId) {
                        return;
                    }

                    setMessages((prev) => {
                        // Avoid duplicates (optimistic inserts or multiple clients)
                        if (prev.some((m) => m.id === newMsg.id || (m.sender_id === newMsg.sender_id && m.message === newMsg.message && m.id.startsWith("opt-")))) return prev;

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
    }, [roomId, sessionId]);

    // Auto-scroll to bottom
    useEffect(() => {
        const timeout = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
        return () => clearTimeout(timeout);
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
            const insertPayload: any = {
                room_id: roomId,
                sender_id: user.id,
                sender_name: senderName,
                message: text,
            };
            if (sessionId) insertPayload.session_id = sessionId;

            const { data } = await supabase
                .from("room_chat_messages")
                .insert(insertPayload)
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

    const senderIds = useMemo(() => messages.map(m => m.sender_id), [messages]);
    const avatarMap = useAvatarMap(senderIds);

    const primaryColor = "hsl(330 100% 55%)";
    const primaryLight = "hsl(330 100% 80%)";
    const primaryDim = "hsl(330 100% 55% / 0.3)";

    return (
        <div
            className="flex flex-col h-full rounded-2xl overflow-hidden pgx-chat-wrapper"
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
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 scrollbar-thin scrollbar-thumb-pink-900/40 pgx-chat-messages hide-scrollbar">
                {/* State: no room */}
                {!roomId && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center pgx-chat-wrapper">
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
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center pgx-chat-wrapper">
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
                            <div key={m.id} className="flex items-center gap-2.5 py-1 my-1">
                                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
                                <span
                                    className="text-[11px] font-bold px-3 py-1 rounded-full shrink-0 backdrop-blur-sm"
                                    style={{
                                        background: m.system_type === "drop_new"
                                            ? "hsl(330 100% 50% / 0.1)"
                                            : m.system_type === "drop_ended"
                                                ? "rgba(255,255,255,0.03)"
                                                : "hsl(45 100% 50% / 0.08)",
                                        border: `1px solid ${m.system_type === "drop_new"
                                            ? "hsl(330 100% 55% / 0.2)"
                                            : m.system_type === "drop_ended"
                                                ? "rgba(255,255,255,0.06)"
                                                : "hsl(45 100% 55% / 0.15)"}`,
                                        color: m.system_type === "drop_new"
                                            ? "hsl(330 100% 70%)"
                                            : m.system_type === "drop_ended"
                                                ? "rgba(255,255,255,0.35)"
                                                : "hsl(45 100% 65%)",
                                    }}
                                >
                                    {m.message}
                                </span>
                                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
                            </div>
                        );
                    }

                    const isMe = m.sender_id === user?.id;
                    const isHostMsg = style === "host";
                    const isTip = m.is_tip;
                    const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    // Color scheme per message type
                    const nameColor = isHostMsg ? "hsl(280 100% 75%)" : isTip ? primaryLight : isMe ? "hsl(200 80% 70%)" : "hsl(330 80% 70%)";
                    const avatarBg = isHostMsg
                        ? "linear-gradient(135deg, hsl(280 100% 50%), hsl(330 100% 55%))"
                        : isTip
                            ? "linear-gradient(135deg, hsl(330 100% 45%), hsl(330 100% 60%))"
                            : isMe
                                ? "linear-gradient(135deg, hsl(200 80% 40%), hsl(200 80% 55%))"
                                : "linear-gradient(135deg, hsl(270 30% 20%), hsl(330 30% 25%))";
                    const ringColor = isHostMsg ? "hsl(280 100% 60% / 0.6)" : isTip ? "hsl(330 100% 55% / 0.5)" : isMe ? "hsl(200 80% 50% / 0.4)" : "rgba(255,255,255,0.08)";
                    const bubbleBg = isMe
                        ? "hsl(200 80% 40% / 0.2)"
                        : isHostMsg
                            ? "hsl(280 60% 30% / 0.15)"
                            : isTip
                                ? "hsl(330 80% 40% / 0.12)"
                                : "rgba(255,255,255,0.04)";
                    const bubbleBorder = isMe
                        ? "1px solid hsl(200 80% 55% / 0.15)"
                        : isHostMsg
                            ? "1px solid hsl(280 100% 55% / 0.15)"
                            : isTip
                                ? "1px solid hsl(330 100% 55% / 0.15)"
                                : "1px solid rgba(255,255,255,0.05)";

                    return (
                        <div
                            key={m.id}
                            className={`flex gap-2.5 group transition-all duration-200 ${isMe ? "flex-row-reverse" : ""}`}
                        >
                            {/* Avatar */}
                            <div className="shrink-0 mt-0.5">
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold overflow-hidden"
                                    style={{
                                        background: avatarBg,
                                        boxShadow: `0 0 0 2px ${ringColor}, 0 2px 8px rgba(0,0,0,0.3)`,
                                        color: "#fff",
                                    }}
                                >
                                    {m.sender_id && avatarMap[m.sender_id] ? (
                                        <img src={avatarMap[m.sender_id]} alt="" className="w-full h-full object-cover" />
                                    ) : isHostMsg ? <Crown size={12} /> : m.sender_name[0]?.toUpperCase()}
                                </div>
                            </div>

                            {/* Content */}
                            <div className={`flex-1 min-w-0 flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                {/* Name row */}
                                <div className={`flex items-center gap-1.5 mb-0.5 flex-wrap ${isMe ? "flex-row-reverse" : ""}`}>
                                    <span
                                        className="text-[12px] font-bold leading-none"
                                        style={{ color: nameColor, textShadow: isHostMsg ? "0 0 8px hsl(280 100% 65% / 0.4)" : "none" }}
                                    >
                                        {m.sender_name}
                                    </span>
                                    {m.sender_id && <UserBadgeDisplay userId={m.sender_id} />}
                                    {isHostMsg && (
                                        <span
                                            className="text-[7px] font-black uppercase tracking-[0.1em] px-1.5 py-px rounded-sm"
                                            style={{
                                                background: "linear-gradient(135deg, hsl(280 100% 40% / 0.5), hsl(330 100% 45% / 0.3))",
                                                border: "1px solid hsl(280 100% 60% / 0.3)",
                                                color: "hsl(280 100% 88%)",
                                            }}
                                        >
                                            Creator
                                        </span>
                                    )}
                                    {isTip && m.tip_amount && (
                                        <span
                                            className="text-[8px] font-black uppercase tracking-wider px-1.5 py-px rounded-full"
                                            style={{
                                                background: "linear-gradient(135deg, hsl(330 100% 40% / 0.4), hsl(350 100% 50% / 0.3))",
                                                border: "1px solid hsl(330 100% 55% / 0.35)",
                                                color: "hsl(330 100% 88%)",
                                            }}
                                        >
                                            💰 ${m.tip_amount}
                                        </span>
                                    )}
                                    <span className="text-[9px] text-white/20 font-mono opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                                        {time}
                                    </span>
                                </div>

                                {/* Message bubble */}
                                <div
                                    className="max-w-[88%] px-3 py-1.5 rounded-2xl text-[13px] leading-relaxed break-words"
                                    style={{
                                        background: bubbleBg,
                                        border: bubbleBorder,
                                        color: "rgba(255,255,255,0.85)",
                                        borderTopLeftRadius: isMe ? "16px" : "4px",
                                        borderTopRightRadius: isMe ? "4px" : "16px",
                                        backdropFilter: "blur(4px)",
                                    }}
                                >
                                    {m.message}
                                </div>
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
                        
                        <div className="relative flex items-center">
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:bg-white/10"
                            >
                                <Smile className="w-5 h-5 text-white/70" />
                            </button>
                            {showEmojiPicker && (
                                <div ref={emojiPickerRef} className="absolute bottom-[calc(100%+8px)] left-0 mb-2 z-50">
                                    <EmojiPicker 
                                        onEmojiClick={(e) => {
                                            setInputText(prev => prev + e.emoji);
                                        }}
                                        theme={Theme.DARK}
                                    />
                                </div>
                            )}
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                            placeholder={roomId ? (isCreator ? "Reply to your fans..." : "Say something...") : "No active session..."}
                            disabled={!roomId || sending}
                            maxLength={300}
                            className="flex-1 text-[15px] px-3 py-2 rounded-xl outline-none transition-all disabled:opacity-40"
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
