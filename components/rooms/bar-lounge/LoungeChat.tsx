import React, { useRef, useEffect } from "react";
import { Crown, Send } from "lucide-react";
import { cx, toneClasses } from "@/app/rooms/bar-lounge/page";

interface Message {
    id: string;
    user_id: string;
    handle: string;
    content: string;
    created_at: string;
}

interface LoungeChatProps {
    messages: Message[];
    chatValue: string;
    hostId: string;
    currentUserId?: string;
    onChangeChat: (value: string) => void;
    onSendMessage: () => void;
}

const LoungeChat: React.FC<LoungeChatProps> = ({
    messages,
    chatValue,
    hostId,
    currentUserId,
    onChangeChat,
    onSendMessage,
}) => {
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="p-4 flex flex-col h-full border border-violet-500/20 rounded-xl bg-black/40 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl font-bold bl-glow-text-gold text-yellow-400">
                    Lounge Chat
                </h2>
                <span className="bl-live-badge">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-bl-glow-pulse" />
                    Live
                </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin mb-3 h-[400px]">
                {messages.map((m) => {
                    const isHost = m.handle === "Host" || m.user_id === hostId;
                    const isMe = m.user_id === currentUserId;

                    return (
                        <div key={m.id} className="bl-chat-message flex items-start gap-2">
                            <span className="text-lg shrink-0">
                                {isHost ? "👑" : isMe ? "👤" : "🧑"}
                            </span>
                            <div className="flex-1 min-w-0">
                                <span className={cx("font-bold text-sm", isHost ? "text-fuchsia-300" : "text-violet-200")}>
                                    {m.handle || "Guest"}
                                </span>
                                {isHost && (
                                    <Crown className="w-3 h-3 text-yellow-400 inline ml-1 mb-0.5" />
                                )}
                                <span className="text-sm text-gray-300 ml-1 block mt-0.5 leading-relaxed">{m.content}</span>
                            </div>
                        </div>
                    );
                })}

                <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2 mt-auto">
                <input
                    type="text"
                    value={chatValue}
                    onChange={(e) => onChangeChat(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") onSendMessage();
                    }}
                    placeholder="Send a message..."
                    className="flex-1 rounded-lg px-3 py-2 text-sm bg-black/50 border border-violet-500/40 text-white placeholder:text-gray-500 focus:outline-none focus:border-fuchsia-500/60"
                />
                <button
                    onClick={onSendMessage}
                    className="bl-btn-glow rounded-lg px-4 py-2 text-sm font-bold text-white flex items-center gap-1"
                >
                    SEND
                </button>
            </div>
        </div>
    );
};

export default LoungeChat;
