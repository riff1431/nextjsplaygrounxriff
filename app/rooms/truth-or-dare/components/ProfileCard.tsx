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
    <div className="glass-panel p-3 text-center flex-1 border-white/5 bg-black/40 group hover:bg-black/60 transition-all duration-300">
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5 ${color === "red" ? "text-red-400" : "text-blue-400"}`}>
            <Crown className={`w-3 h-3 ${color === "red" ? "text-red-500" : "text-blue-500"}`} />
            {title}
        </p>
        <div className={`relative w-14 h-14 mx-auto rounded-full p-1 border-2 transition-all duration-500 ${color === "red" ? "border-red-500/30 group-hover:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] group-hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "border-blue-500/30 group-hover:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"}`}>
            <div className="w-full h-full rounded-full overflow-hidden bg-white/5 flex items-center justify-center">
                {avatar ? (
                    <img src={avatar} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                    <Crown className={`w-6 h-6 ${color === "red" ? "text-red-500/40" : "text-blue-500/40"}`} />
                )}
            </div>
            {amount !== undefined && (
                <div className={`absolute -bottom-1 -right-1 ${color === "red" ? "bg-red-500 shadow-[0_2px_8px_rgba(239,68,68,0.5)]" : "bg-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.5)]"} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-10`}>
                    ${amount.toFixed(0)}
                </div>
            )}
        </div>
        <p className={`text-xs font-bold mt-2 truncate ${color === "red" ? "text-red-400" : "text-blue-400"}`}>{name}</p>
    </div>
);
