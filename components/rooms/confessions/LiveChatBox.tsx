"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface ChatMsg {
    id: string;
    user_id: string;
    username: string;
    message: string;
    created_at: string;
}

interface LiveChatBoxProps {
    roomId?: string | null;
    className?: string;
}

const LiveChatBox = ({ roomId, className }: LiveChatBoxProps) => {
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
            .channel(`chat-fan-${roomId}`)
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

        const displayName = profile?.display_name || profile?.username || user.email?.split("@")[0] || "Fan";

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
        <div className={`neon-glass-card flex flex-col ${className || ""}`}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <MessageSquare className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white/90">Live Chat</h3>
                <span className="ml-auto text-[10px] text-white/40">{messages.length} msgs</span>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-xs">
                        No messages yet. Say hi! 👋
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-rose-500/15 border border-rose-500/20 shrink-0 flex items-center justify-center text-[10px] font-bold text-rose-300">
                                {msg.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-1.5">
                                    <span className={`text-xs font-bold truncate ${msg.user_id === user?.id ? "text-rose-400" : "text-white/80"}`}>
                                        {msg.username}
                                    </span>
                                    <span className="text-white/20 text-[9px] ml-auto shrink-0">
                                        {formatTime(msg.created_at)}
                                    </span>
                                </div>
                                <p className="text-white/50 text-xs leading-relaxed">{msg.message}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <div className="p-2.5 border-t border-white/10">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={user ? "Type a message..." : "Log in to chat"}
                        disabled={!user}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-rose-500/40 focus:bg-white/8 transition disabled:opacity-40"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!user || sending || !newMessage.trim()}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-2 rounded-xl transition disabled:opacity-40 disabled:hover:bg-rose-600"
                    >
                        {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveChatBox;
