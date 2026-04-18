"use client";

import { Heart, Send, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
    id: string;
    room_id: string;
    user_id: string;
    username: string;
    message: string;
    created_at: string;
}

interface TodCreatorLiveChatProps {
    roomId: string | null;
    viewerCount?: number;
}

const TodCreatorLiveChat = ({ roomId, viewerCount = 0 }: TodCreatorLiveChatProps) => {
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

    useEffect(() => {
        if (!roomId) return;

        // Fetch past messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from("chat_messages")
                .select("id, room_id, user_id, username, message, created_at")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true })
                .limit(100);

            if (data && !error) {
                setMessages(data);
            }
            setLoading(false);
            setTimeout(scrollToBottom, 100);
        };

        fetchMessages();

        // Realtime subscription
        const channel = supabase
            .channel(`tod-chat-${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => [...prev, newMsg]);
                    setTimeout(scrollToBottom, 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!msg.trim() || !roomId || !myProfile || sending) return;
        setSending(true);

        const { error } = await supabase.from("chat_messages").insert({
            room_id: roomId,
            user_id: myProfile.id,
            username: myProfile.name,
            message: msg.trim(),
        });

        if (error) {
            toast.error("Failed to send message: " + error.message);
        } else {
            setMsg("");
        }
        setSending(false);
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

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
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-white/40 text-xs tracking-wider uppercase">No messages yet</p>
                    </div>
                ) : (
                    messages.map((m) => {
                        const isMe = m.user_id === myProfile?.id;
                        return (
                            <div key={m.id} className="flex items-start gap-2.5 group">
                                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white border ${isMe ? 'bg-blue-600/30 border-blue-400' : 'bg-pink-600/30 border-pink-400'}`}>
                                    {m.username?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`font-bold text-xs ${isMe ? 'tod-creator-text-neon-blue' : 'tod-creator-text-neon-pink'}`}>
                                            {m.username || "Unknown"}
                                        </span>
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
