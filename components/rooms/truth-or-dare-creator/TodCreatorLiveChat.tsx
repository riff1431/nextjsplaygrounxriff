"use client";

import { Heart, Search, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface ChatMessage {
    id: string;
    room_id: string;
    sender_id: string;
    sender_name: string;
    body: string;
    tip_amount: number;
    has_attachment: boolean;
    is_pinned: boolean;
    created_at?: string;
}

interface TodCreatorLiveChatProps {
    roomId: string | null;
}

const TodCreatorLiveChat = ({ roomId }: TodCreatorLiveChatProps) => {
    const supabase = createClient();
    const [msg, setMsg] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [viewerCount, setViewerCount] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [myProfile, setMyProfile] = useState<{ id: string, name: string } | null>(null);

    // Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from("profiles").select("id, name").eq("id", user.id).single();
                if (data) setMyProfile({ id: data.id, name: data.name || "User" });
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
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true })
                .limit(100);

            if (data && !error) {
                setMessages(data);
            }
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
                    setMessages((prev) => [...prev, payload.new as ChatMessage]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!msg.trim() || !roomId || !myProfile) return;

        const { error } = await supabase.from("chat_messages").insert({
            room_id: roomId,
            sender_id: myProfile.id,
            sender_name: myProfile.name,
            body: msg.trim(),
            tip_amount: 0,
            has_attachment: false,
            is_pinned: false,
        });

        if (error) {
            toast.error("Failed to send message: " + error.message);
        } else {
            setMsg("");
        }
    };

    return (
        <div className="tod-creator-panel-bg rounded-xl tod-creator-neon-border-blue p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="tod-creator-text-neon-yellow text-sm font-bold">●</span>
                    <h3 className="font-bold text-white tracking-widest uppercase text-sm">Live Chat</h3>
                </div>
                <div className="flex items-center gap-1.5 tod-creator-text-neon-pink text-sm">
                    <Heart className="w-4 h-4 fill-current" />
                    <span className="font-bold">{viewerCount || (messages.length > 0 ? messages.length * 3 : 1)}</span>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-white/40 text-xs tracking-wider uppercase">No messages yet</p>
                    </div>
                ) : (
                    messages.map((m) => {
                        const isMe = m.sender_id === myProfile?.id;
                        return (
                            <div key={m.id} className="flex items-start gap-2.5 group">
                                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white border ${isMe ? 'bg-blue-600/30 border-blue-400' : 'bg-pink-600/30 border-pink-400'}`}>
                                    {m.sender_name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`font-bold text-xs ${isMe ? 'tod-creator-text-neon-blue' : 'tod-creator-text-neon-pink'}`}>
                                            {m.sender_name || "Unknown"}
                                        </span>
                                        {m.tip_amount > 0 && (
                                            <span className="text-[10px] text-yellow-400 font-bold bg-yellow-400/10 px-1.5 py-0.5 rounded-full">
                                                tipped ${m.tip_amount}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-white/80 mt-0.5 break-words max-w-[200px] leading-snug">
                                        {m.body}
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
                    placeholder="Send a message..."
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={!roomId}
                />
                <button
                    onClick={handleSend}
                    disabled={!msg.trim() || !roomId}
                    className="p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                >
                    <Send className="w-4 h-4 tod-creator-text-neon-blue" />
                </button>
            </div>
        </div>
    );
};

export default TodCreatorLiveChat;
