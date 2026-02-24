"use client";

import React from "react";

interface ContestantProps {
    rank: number;
    name: string;
    votes: string;
    gradient: string;
}

const ContestantCard = ({ rank, name, votes, gradient }: ContestantProps) => {
    return (
        <div className="relative group cursor-pointer rounded-xl overflow-hidden border border-border neon-border-accent-comp transition-all hover:scale-[1.02] hover:brightness-110 h-full">
            {/* Image placeholder with gradient */}
            <div className={`h-full ${gradient} flex items-center justify-center`}>
                <span className="text-5xl opacity-30">👤</span>
            </div>

            {/* Rank & Name overlay */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                <span className="bg-accent text-accent-foreground w-6 h-6 rounded-full flex items-center justify-center font-display font-bold text-xs">
                    {rank}
                </span>
                <span className="font-display font-bold text-base text-foreground drop-shadow-lg tracking-wide">
                    {name}
                </span>
            </div>

            {/* LIVE badge */}
            <div className="absolute top-2 right-2">
                <span className="live-badge bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider">
                    LIVE
                </span>
            </div>

            {/* Vote count */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg px-2 py-1">
                <span className="text-xs">🔒</span>
                <span className="text-foreground font-semibold text-xs">{votes}</span>
            </div>

            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

export default ContestantCard;
