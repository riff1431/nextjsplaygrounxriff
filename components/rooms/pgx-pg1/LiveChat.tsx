"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import { Send, Loader2 , Smile } from 'lucide-react';
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { useAvatarMap } from "@/hooks/useAvatarMap";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";

interface ChatMsg {
    id: string;
    user_id: string;
    username: string;
    message: string;
    created_at: string;
}

interface LiveChatProps {
    roomId?: string | null;
}

const LiveChat = ({ roomId }: LiveChatProps) => {
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
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (!roomId) return;
        const supabase = createClient();

        // Fetch existing messages (last 50)
        async function fetchMessages() {
            const { data } = await supabase
                .from("chat_messages")
                .select("id, user_id, username, message, created_at")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true })
                .limit(50);
            if (data) setMessages(data);
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        }
        fetchMessages();

        // Subscribe to new messages via Realtime
        const channel = supabase
            .channel(`chat-${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    const newMsg = payload.new as ChatMsg;
                    setMessages((prev) => [...prev, newMsg]);
                    setTimeout(scrollToBottom, 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const handleSend = async () => {
        if (!newMessage.trim() || !roomId || !user || sending) return;
        setSending(true);

        const supabase = createClient();

        // Get display name
        const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", user.id)
            .single();

        const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "Anonymous";

        const { error } = await supabase.from("chat_messages").insert({
            room_id: roomId,
            user_id: user.id,
            username: displayName,
            message: newMessage.trim(),
        });

        if (!error) {
            setNewMessage("");
        }
        setSending(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const chatUserIds = useMemo(() => messages.map(m => m.user_id), [messages]);
    const avatarMap = useAvatarMap(chatUserIds);

    return (
        <div className="glass-card flex flex-col flex-1 min-h-0">
            {/* Header */}
            <div className="p-3 border-b border-white/10 shrink-0">
                <h2 className="font-display text-sm font-semibold tracking-wide">Live Chat</h2>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 pgx-chat-messages hide-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex gap-2">
                            <div className="w-7 h-7 rounded-full bg-secondary/60 shrink-0 flex items-center justify-center text-[10px] text-muted-foreground overflow-hidden">
                                {avatarMap[msg.user_id] ? (
                                    <img src={avatarMap[msg.user_id]} alt="" className="w-full h-full object-cover" />
                                ) : msg.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-medium truncate ${msg.user_id === user?.id ? "text-primary" : "text-foreground"}`}>
                                        {msg.username}
                                    </span>
                                    <UserBadgeDisplay userId={msg.user_id} />
                                    <span className="text-muted-foreground text-[10px] ml-auto shrink-0">
                                        {formatTime(msg.created_at)}
                                    </span>
                                </div>
                                <p className="text-muted-foreground text-[11px] mt-0.5">{msg.message}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-2 border-t border-white/10 shrink-0">
                <div className="flex gap-2">
                    
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
                                            setNewMessage(prev => prev + e.emoji);
                                        }}
                                        theme={"dark" as any}
                                    />
                                </div>
                            )}
                        </div>
                        <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={user ? "Type your message..." : "Log in to chat"}
                        disabled={!user}
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!user || sending || !newMessage.trim()}
                        className="gradient-pink text-primary-foreground px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveChat;
