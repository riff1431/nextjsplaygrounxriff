import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Zap } from "lucide-react";

interface Message {
    id: string;
    user: string;
    text: string;
    isPurchased?: boolean;
}

interface LoungeChatProps {
    messages: Message[];
    onSendMessage: (text: string) => void;
}

const LoungeChat: React.FC<LoungeChatProps> = ({ messages, onSendMessage }) => {
    const [inputText, setInputText] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText);
            setInputText("");
        }
    };

    return (
        <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-5 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-gold" />
                    <h2 className="font-title text-xl font-bold text-gold tracking-wide">
                        Lounge Chat
                    </h2>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-green-500 font-bold tracking-widest uppercase">Live</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 chat-scroll">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${msg.isPurchased ? "bg-gold/10 border border-gold/20" : "bg-white/5 border border-white/5"} rounded-xl p-3 transition-colors hover:bg-white/10`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-bold uppercase tracking-widest ${msg.isPurchased ? "text-gold" : "text-white/40"}`}>
                                {msg.user}
                            </span>
                            {msg.isPurchased && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-gold bg-gold/10 px-1.5 py-0.5 rounded-md uppercase tracking-tighter border border-gold/20">
                                    <Zap className="w-2.5 h-2.5 fill-gold" /> Purchase
                                </div>
                            )}
                        </div>
                        <p className={`text-sm leading-relaxed ${msg.isPurchased ? "text-white font-medium" : "text-white/80"}`}>
                            {msg.text}
                        </p>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <div className="p-5 bg-black/40 border-t border-white/5 space-y-4">
                <div className="pin-badge w-fit mx-auto cursor-pointer hover:bg-gold/20 transition-colors">
                    📍 PIN NAME TO TOP
                </div>

                <div className="relative group">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Whisper something..."
                        className="w-full bg-white/5 border border-white/10 py-3.5 pl-4 pr-14 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-gold/40 focus:bg-white/10 transition-all text-sm"
                    />
                    <button
                        onClick={handleSend}
                        className="absolute right-1.5 top-1.5 p-2 rounded-lg btn-send"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoungeChat;
