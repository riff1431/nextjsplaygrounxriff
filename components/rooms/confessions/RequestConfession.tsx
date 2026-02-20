import React, { useState } from 'react';
import { Send, Lock, User, MessageSquare, Mic, Video } from "lucide-react";

interface RequestConfessionProps {
    reqType: 'Text' | 'Audio' | 'Video';
    setReqType: (type: 'Text' | 'Audio' | 'Video') => void;
    reqAmount: number;
    setReqAmount: (amount: number) => void;
    reqTopic: string;
    setReqTopic: (topic: string) => void;
    isAnon: boolean;
    setIsAnon: (anon: boolean) => void;
    handleOpenConfirm: () => void;
    isSending: boolean;
}

const RequestConfession: React.FC<RequestConfessionProps> = ({
    reqType, setReqType, reqAmount, setReqAmount, reqTopic, setReqTopic, isAnon, setIsAnon, handleOpenConfirm, isSending
}) => {
    const tabs = [
        { id: "Text" as const, icon: MessageSquare, label: "Text" },
        { id: "Audio" as const, icon: Mic, label: "Audio" },
        { id: "Video" as const, icon: Video, label: "Video" },
    ];

    return (
        <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold tracking-wide">Request Confession</h2>
                <button className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded border border-border/50 hover:bg-secondary/50">
                    Custom
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setReqType(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all ${reqType === tab.id
                            ? "gradient-pink text-primary-foreground neon-border shadow-[0_0_15px_rgba(255,42,109,0.3)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Offer Amount */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
                    <span>My Offer Amount</span>
                </div>
                <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 gold-text font-bold text-lg group-focus-within:scale-110 transition-transform">$</span>
                    <input
                        type="number"
                        value={reqAmount || ''}
                        onChange={(e) => setReqAmount(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-input border border-border text-foreground text-base font-bold focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* Topic Prompt */}
            <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Topic prompt</span>
                <textarea
                    value={reqTopic}
                    onChange={(e) => setReqTopic(e.target.value)}
                    placeholder="What should they confess?"
                    className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none h-24 sm:h-28 shadow-inner"
                />
            </div>

            {/* Identity */}
            <div className="flex gap-2.5">
                <button
                    onClick={() => setIsAnon(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all border ${!isAnon
                        ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_15px_rgba(255,42,109,0.15)]"
                        : "border-border/50 bg-secondary text-muted-foreground hover:bg-white/5 hover:text-foreground/80"
                        }`}
                >
                    <User className="w-3.5 h-3.5" />
                    Public
                </button>
                <button
                    onClick={() => setIsAnon(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all border ${isAnon
                        ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_15px_rgba(255,42,109,0.15)]"
                        : "border-border/50 bg-secondary text-muted-foreground hover:bg-white/5 hover:text-foreground/80"
                        }`}
                >
                    <span className="text-sm">🎭</span>
                    Anonymous
                </button>
            </div>

            <div className="text-[10px] font-medium text-muted-foreground text-right px-1 pb-1">
                $5 Anonymous <span className="gold-text font-bold">+$25</span>
            </div>

            {/* Submit */}
            <button
                onClick={handleOpenConfirm}
                disabled={isSending || !reqTopic.trim() || reqAmount <= 0}
                className="w-full py-3.5 rounded-xl gradient-pink text-primary-foreground font-display font-bold text-sm tracking-wide neon-border hover:opacity-90 transition-opacity flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
                <Send className="w-4 h-4" />
                {isSending ? "Processing..." : "Send Request"}
            </button>
        </div>
    );
};

export default RequestConfession;
