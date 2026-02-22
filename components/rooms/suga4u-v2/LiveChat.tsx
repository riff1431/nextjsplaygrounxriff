import React, { useState } from "react";
import { Heart, Send } from "lucide-react";
import { useSuga4U, ActivityEvent } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const LiveChat = ({ roomId }: { roomId: string | null }) => {
    const { activity, sendMessage } = useSuga4U(roomId);
    const { user } = useAuth();
    const [inputText, setInputText] = useState("");

    const handleSend = async () => {
        if (!inputText.trim()) return;
        try {
            const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            await sendMessage(inputText, senderName);
            setInputText("");
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    const formatActivity = (a: ActivityEvent) => {
        if (a.type === 'TIP') return <span>tipped <span className="text-gold font-bold">${a.amount}</span>!</span>;
        if (a.type === 'PAID_REQUEST') return `requested: ${a.label} ($${a.amount})`;
        if (a.type === 'OFFER_CLAIM') return `claimed offer: ${a.label}`;
        if (a.type === 'SECRET_UNLOCK') return `unlocked a secret: ${a.label}`;
        if (a.type === 'BUY_FOR_HER') return `bought: ${a.label}`;
        return a.label;
    };

    const isHighlight = (a: ActivityEvent) => {
        return ['TIP', 'PAID_REQUEST', 'OFFER_CLAIM', 'SECRET_UNLOCK'].includes(a.type);
    };

    return (
        <div className="glass-panel flex flex-col h-full bg-transparent border-gold/20">
            <div className="flex items-center justify-center p-3 border-b border-gold/20">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3">Live Chat</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 chat-scroll">
                {[...activity].reverse().map((m) => (
                    <div key={m.id} className="flex items-start gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-muted/30 flex-shrink-0 flex items-center justify-center">
                            <span className="text-xs">{m.type === 'TIP' ? "💰" : "👤"}</span>
                        </div>
                        <p className="leading-snug">
                            <span className={`font-bold ${isHighlight(m) ? "text-gold" : "text-pink-light"}`}>{m.fanName}:</span>{" "}
                            <span className="text-foreground/80">{formatActivity(m)}</span>
                            {isHighlight(m) && <Heart className="inline w-3 h-3 text-pink fill-pink ml-1" />}
                        </p>
                    </div>
                ))}
            </div>

            <div className="p-3 border-t border-gold/20 flex gap-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 bg-muted/50 rounded-full px-4 py-2 text-sm outline-none border border-gold/20 focus:border-pink/50 transition-colors"
                />
                <button
                    onClick={handleSend}
                    disabled={!roomId}
                    className="p-2 rounded-full bg-pink text-white hover:bg-pink-light transition-colors disabled:opacity-50"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default LiveChat;
