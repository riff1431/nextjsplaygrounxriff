"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface ChatMsg {
    id: string;
    user_id: string;
    username: string;
    message: string;
    created_at: string;
}

interface ConfessionsLiveChatProps {
    roomId?: string | null;
}

const ConfessionsLiveChat = ({ roomId }: ConfessionsLiveChatProps) => {
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

        const channel = supabase
            .channel(`chat-creator-${roomId}`)
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
        const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, username")
            .eq("id", user.id)
            .single();

        const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "Creator";

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
                                {msg.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`text-sm font-medium truncate ${msg.user_id === user?.id ? "text-[hsl(330,90%,65%)]" : "text-white"}`}>
                                        {msg.username}
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
