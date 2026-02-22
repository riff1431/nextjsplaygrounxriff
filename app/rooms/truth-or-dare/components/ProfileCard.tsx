"use client";

import { Crown } from "lucide-react";

interface ProfileCardProps {
    name: string;
    title: string;
    avatar?: string | null;
    color: "red" | "blue";
    amount?: number;
}

export const ProfileCard = ({ name, title, avatar, color, amount }: ProfileCardProps) => (
    <div className={`glass-panel p-3 text-center flex-1 ${color === "red" ? "text-neon-red" : ""}`}>
        <p className={`text-[10px] sm:text-xs font-semibold mb-1 ${color === "red" ? "text-neon-red" : "text-accent"}`}>
            <Crown className="inline w-3 h-3 mr-1" />
            {title}
        </p>
        <div className={`relative w-12 h-12 mx-auto rounded-full border-2 flex items-center justify-center mb-1 ${color === "red" ? "border-neon-red bg-primary/10" : "border-accent bg-accent/10"}`}>
            {avatar ? (
                <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
            ) : (
                <Crown className={`w-5 h-5 ${color === "red" ? "text-neon-red" : "text-neon-blue"}`} />
            )}
            {amount !== undefined && (
                <div className={`absolute -bottom-1 -right-1 ${color === "red" ? "bg-neon-red" : "bg-accent"} text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full`}>
                    ${amount.toFixed(0)}
                </div>
            )}
        </div>
        <p className={`text-xs truncate ${color === "red" ? "text-neon-red" : "text-neon-blue"}`}>{name}</p>
    </div>
);
