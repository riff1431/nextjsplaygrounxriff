"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface ChatMsg {
    id: string;
    sender_id: string;
    sender_name: string;
    message: string;
    created_at: string;
}

interface ConfessionsLiveChatProps {
    roomId?: string | null;
    sessionId?: string | null;
}

const ConfessionsLiveChat = ({ roomId, sessionId }: ConfessionsLiveChatProps) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (!roomId) return;
        const supabase = createClient();

        async function fetchMessages() {
            let query = supabase
                .from("room_chat_messages")
                .select("id, sender_id, sender_name, message, created_at")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true })
                .limit(50);
            if (sessionId) query = query.eq("session_id", sessionId);
            const { data } = await query;
            if (data) setMessages(data as ChatMsg[]);
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        }
        fetchMessages();

        const channel = supabase
            .channel(`room_chat_messages_${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "room_chat_messages",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    const newMsg = payload.new as ChatMsg;
                    setMessages((prev) => {
                        // Prevent duplicates from optimistic updates
                        if (prev.some(m => m.id === newMsg.id || (m.sender_id === newMsg.sender_id && m.message === newMsg.message && m.id.startsWith("temp-")))) {
                            return prev;
                        }
                        return [...prev, newMsg];
                    });
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
        const displayName = user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split("@")[0] || "Creator";

        // Optimistically update UI
        const tempId = `temp-${Date.now()}`;
        const newLocalMsg: ChatMsg = {
            id: tempId,
            sender_id: user.id,
            sender_name: displayName,
            message: newMessage.trim(),
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, newLocalMsg]);
        setNewMessage("");
        setTimeout(scrollToBottom, 50);

        const insertPayload: any = {
            room_id: roomId,
            sender_id: user.id,
            sender_name: displayName,
            message: newLocalMsg.message,
        };
        if (sessionId) insertPayload.session_id = sessionId;

        const { error, data } = await supabase.from("room_chat_messages").insert(insertPayload).select().single();

        if (error) {
            console.error("❌ Chat insert error:", error);
            // Revert on error
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } else if (data) {
            // Replace temp id with real id
            setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
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

    return (
        <div className="conf-glass-card-strong flex flex-col w-[400px] shrink-0 h-full pb-2 pgx-chat-wrapper">
            {/* Header */}
            <div className="p-4 border-b border-white/20">
                <h2 className="conf-font-cinzel text-white text-lg font-semibold">Live Chat</h2>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 pgx-chat-messages hide-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-white/40 text-xs">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex gap-2">
                            <div className="w-8 h-8 rounded-full bg-[hsl(320,50%,15%)] shrink-0 flex items-center justify-center text-xs text-white/60">
                                {msg.sender_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-sm font-medium truncate ${msg.sender_id === user?.id ? "text-[hsl(330,90%,65%)]" : "text-white"}`}>
                                        {msg.sender_name}
                                    </span>
                                    <span className="text-xs">💜</span>
                                    <span className="text-white/60 text-xs ml-auto shrink-0">
                                        {formatTime(msg.created_at)}
                                    </span>
                                </div>
                                <p className="text-white/60 text-xs mt-0.5">{msg.message}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/20">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={user ? "Type your message..." : "Log in to chat"}
                        disabled={!user}
                        className="flex-1 bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[hsl(330,90%,55%)] disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!user || sending || !newMessage.trim()}
                        className="bg-[hsl(330,90%,55%)] hover:bg-[hsl(330,90%,55%)]/80 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfessionsLiveChat;
