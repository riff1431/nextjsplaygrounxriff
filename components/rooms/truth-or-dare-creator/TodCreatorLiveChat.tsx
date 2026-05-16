"use client";

import { Heart, Send, Loader2 , Smile } from 'lucide-react';
import { useState, useEffect, useRef } from "react";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { cs } from "@/utils/currency";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";

interface ChatMessage {
    id: string;
    room_id: string;
    user_id: string;
    username: string;
    message: string;
    created_at: string;
}

interface ActivityItem {
    id: string;
    fanName: string;
    amount: number;
    type: 'tip' | 'reaction';
    emoji?: string;
    message?: string;
    timestamp: number;
}

interface TodCreatorLiveChatProps {
    roomId: string | null;
    sessionStartedAt?: string | null;
    sessionId?: string | null;
    viewerCount?: number;
    activityItems?: ActivityItem[];
}

const TodCreatorLiveChat = ({ roomId, sessionStartedAt, sessionId, viewerCount = 0, activityItems = [] }: TodCreatorLiveChatProps) => {
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
    
    const supabase = createClient();
    const [msg, setMsg] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [myProfile, setMyProfile] = useState<{ id: string; name: string } | null>(null);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    // Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("id, full_name, username")
                    .eq("id", user.id)
                    .single();
                if (data) {
                    const name = data.full_name || data.username || user.email?.split("@")[0] || "Creator";
                    setMyProfile({ id: data.id, name });
                }
            }
        };
        fetchProfile();
    }, []);

    // Reset messages when session changes (new session = clean chat)
    useEffect(() => {
        setMessages([]);
        setLoading(true);
    }, [sessionId, sessionStartedAt]);

    useEffect(() => {
        if (!roomId) return;

        // Fetch past messages — scoped to current session
        const fetchMessages = async () => {
            const baseQuery = () => supabase
                .from("chat_messages")
                .select("id, room_id, user_id, username, message, created_at")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true })
                .limit(100);

            let data: any[] | null = null;
            let error: any = null;

            // Session-scoped filtering: prefer session_id, fall back to timestamp
            if (sessionId) {
                ({ data, error } = await baseQuery().eq("session_id", sessionId));
                // If session_id column doesn't exist, fallback to timestamp
                if (error && error.message?.includes('session_id')) {
                    if (sessionStartedAt) {
                        ({ data, error } = await baseQuery().gte("created_at", sessionStartedAt));
                    } else {
                        ({ data, error } = await baseQuery());
                    }
                }
            } else if (sessionStartedAt) {
                ({ data, error } = await baseQuery().gte("created_at", sessionStartedAt));
            } else {
                ({ data, error } = await baseQuery());
            }

            if (data && !error) {
                setMessages(data);
            }
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        };

        fetchMessages();

        // Realtime subscription — use unique channel name per session
        const channel = supabase
            .channel(`tod-chat-${roomId}-${sessionId || sessionStartedAt || 'nosession'}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    const newMsg = payload.new as any;
                    // Only add messages from the current session
                    if (sessionId && newMsg.session_id && newMsg.session_id !== sessionId) return;
                    if (!sessionId && sessionStartedAt && newMsg.created_at && newMsg.created_at < sessionStartedAt) return;
                    setMessages((prev) => [...prev, newMsg as ChatMessage]);
                    setTimeout(scrollToBottom, 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, sessionId, sessionStartedAt]);

    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!msg.trim() || !roomId || !myProfile || sending) return;
        setSending(true);

        const chatPayload: Record<string, any> = {
            room_id: roomId,
            user_id: myProfile.id,
            username: myProfile.name,
            message: msg.trim(),
            session_id: sessionId || null,
        };
        let { error } = await supabase.from("chat_messages").insert(chatPayload);
        // If session_id column doesn't exist yet, retry without it
        if (error && error.message?.includes('session_id')) {
            delete chatPayload.session_id;
            ({ error } = await supabase.from("chat_messages").insert(chatPayload));
        }

        if (error) {
            toast.error("Failed to send message: " + error.message);
        } else {
            setMsg("");
        }
        setSending(false);
    };

    const formatTime = (dateStr: string | number) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    type ChatItem = ChatMessage & { isActivity: false; timestamp: number };
    type ActItem = ActivityItem & { isActivity: true; timestamp: number };

    const allItems: (ChatItem | ActItem)[] = [
        ...messages.map((m): ChatItem => ({
            ...m,
            isActivity: false,
            timestamp: new Date(m.created_at).getTime()
        })),
        ...(activityItems || []).map((a): ActItem => ({
            ...a,
            isActivity: true,
            timestamp: a.timestamp
        }))
    ].sort((a, b) => a.timestamp - b.timestamp);

    // Auto-scroll on new combined items
    useEffect(() => {
        scrollToBottom();
    }, [allItems.length]);

    return (
        <div className="tod-creator-panel-bg rounded-xl tod-creator-neon-border-blue p-4 flex flex-col h-full overflow-hidden pgx-chat-wrapper">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="tod-creator-text-neon-yellow text-sm font-bold">●</span>
                    <h3 className="font-bold text-white tracking-widest uppercase text-sm">Live Chat</h3>
                </div>
                <div className="flex items-center gap-1.5 tod-creator-text-neon-pink text-sm">
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="font-bold">{viewerCount || messages.length}</span>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                    </div>
                ) : allItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-white/40 text-xs tracking-wider uppercase">No messages yet</p>
                    </div>
                ) : (
                    allItems.map((item) => {
                        if (item.isActivity) {
                            return (
                                <div key={`activity-${item.id}`} className="flex items-start gap-2.5 group">
                                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white border ${item.type === 'reaction' ? 'bg-purple-600/30 border-purple-400' : 'bg-green-600/30 border-green-400'}`}>
                                        {item.emoji || (item.type === 'tip' ? '💰' : '✨')}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`font-bold text-xs ${item.type === 'reaction' ? 'text-purple-400' : 'text-green-400'}`}>
                                                {item.fanName || "Unknown"}
                                            </span>
                                            <span className="text-[10px] text-white/30 ml-auto shrink-0">
                                                {formatTime(item.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white/80 mt-0.5 break-words max-w-[200px] leading-snug">
                                            {item.type === 'reaction' ? `sent ${item.message || 'a reaction'}` : `sent a ${cs()}${item.amount} tip`}
                                        </p>
                                    </div>
                                    <div className="shrink-0 flex items-center">
                                        <span className="text-xs font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                            +{cs()}{item.amount}
                                        </span>
                                    </div>
                                </div>
                            );
                        }

                        // Chat Message
                        const m = item as any;
                        const isMe = m.user_id === myProfile?.id;
                        return (
                            <div key={`chat-${m.id}`} className="flex items-start gap-2.5 group">
                                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white border ${isMe ? 'bg-blue-600/30 border-blue-400' : 'bg-pink-600/30 border-pink-400'}`}>
                                    {m.username?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`font-bold text-xs ${isMe ? 'tod-creator-text-neon-blue' : 'tod-creator-text-neon-pink'}`}>
                                            {m.username || "Unknown"}
                                        </span>
                                        {m.user_id && <UserBadgeDisplay userId={m.user_id} />}
                                        {m.created_at && (
                                            <span className="text-[10px] text-white/30 ml-auto shrink-0">
                                                {formatTime(m.created_at)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-white/80 mt-0.5 break-words max-w-[200px] leading-snug">
                                        {m.message}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="mt-3 flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-2 shrink-0">
                
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
                                            setMsg(prev => prev + e.emoji);
                                        }}
                                        theme={Theme.DARK}
                                    />
                                </div>
                            )}
                        </div>
                        <input
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                    placeholder={myProfile ? "Send a message..." : "Loading..."}
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    disabled={!roomId || !myProfile}
                />
                <button
                    onClick={handleSend}
                    disabled={!msg.trim() || !roomId || !myProfile || sending}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                >
                    {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin tod-creator-text-neon-blue" />
                    ) : (
                        <Send className="w-4 h-4 tod-creator-text-neon-blue" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default TodCreatorLiveChat;
