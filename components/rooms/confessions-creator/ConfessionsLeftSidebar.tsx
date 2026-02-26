"use client";

import { MessageSquare, Plus, DollarSign, User } from "lucide-react";
import Image from "next/image";

const ConfessionsLeftSidebar = () => {
    return (
        <div className="flex flex-col gap-4 w-[260px] shrink-0 overflow-y-auto pb-4">
            {/* Profile Card */}
            <div className="conf-glass-card overflow-hidden relative">
                <div className="relative aspect-[4/3] w-full">
                    <Image
                        src="/rooms/confessions-profile.jpg"
                        alt="Profile"
                        fill
                        className="object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-[hsl(0,85%,55%)] text-white text-xs font-bold px-3 py-1 rounded-md conf-live-pulse tracking-wide">
                        LIVE
                    </div>
                    <div className="absolute bottom-3 left-3 text-white text-sm font-medium drop-shadow-md">
                        Fan:37
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="conf-glass-card p-4">
                <h3 className="conf-font-cinzel text-white font-semibold text-lg mb-3 border-b border-white/20 pb-2">
                    Summary
                </h3>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-white/60">
                        <User className="h-4 w-4 conf-text-gold" />
                        <span>Fans: <span className="conf-text-gold font-semibold">1,290</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                        <MessageSquare className="h-4 w-4 conf-text-gold" />
                        <span>Confessions: <span className="conf-text-gold font-semibold">1,290</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                        <DollarSign className="h-4 w-4 conf-text-gold" />
                        <span>Tips: <span className="conf-text-gold font-semibold">$1,290</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                        <DollarSign className="h-4 w-4 conf-text-gold" />
                        <span>Earned: <span className="conf-text-gold font-semibold">$1,290</span></span>
                    </div>
                </div>
            </div>

            {/* Random Request */}
            <div className="conf-glass-card p-4">
                <h3 className="conf-font-cinzel text-white font-semibold mb-3">Random Request</h3>
                <button className="w-full flex items-center justify-center gap-2 py-3 border border-white/20 rounded-lg conf-text-gold hover:bg-white/5 transition-colors">
                    <Plus className="h-5 w-5" />
                </button>
            </div>

            {/* Confession Wall */}
            <div className="conf-glass-card p-4 flex-1 flex flex-col">
                <h3 className="conf-font-cinzel text-white font-semibold mb-3">Confession Wall</h3>
                <div className="flex flex-col gap-3 flex-1">
                    <button className="w-full flex items-center justify-center gap-2 py-3 border border-white/20 rounded-lg conf-text-gold hover:bg-white/5 transition-colors">
                        <Plus className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfessionsLeftSidebar;
