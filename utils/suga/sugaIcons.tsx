import React from "react";
import { 
    Camera, 
    Megaphone, 
    Flame, 
    Clapperboard, 
    Volume2, 
    Sparkles, 
    Mic, 
    Image as ImageIcon, 
    Lock, 
    Gem,
    Gift
} from "lucide-react";

export function getSugaIcon(type: string, label?: string): React.ReactNode {
    const cleanType = (type || "").toUpperCase();
    const cleanLabel = (label || "").toLowerCase();

    // Specific Action Labels
    if (cleanLabel.includes("say my name")) {
        return <Volume2 className="w-5 h-5 text-fuchsia-400 drop-shadow-[0_0_6px_rgba(232,121,249,0.75)]" />;
    }
    if (cleanLabel.includes("sponsor")) {
        return <Sparkles className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.85)] animate-pulse" />;
    }
    if (cleanLabel.includes("voice note") || cleanLabel.includes("video nite")) {
        return <Mic className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.75)]" />;
    }
    if (cleanLabel.includes("photo drop")) {
        return <ImageIcon className="w-5 h-5 text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.75)]" />;
    }

    // General Types
    switch (cleanType) {
        case "POSE": 
            return <Camera className="w-5 h-5 text-pink-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.75)]" />;
        case "SHOUTOUT": 
            return <Megaphone className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.75)]" />;
        case "QUICK_TEASE": 
            return <Flame className="w-5 h-5 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.75)]" />;
        case "CUSTOM_CLIP": 
            return <Clapperboard className="w-5 h-5 text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.75)]" />;
        case "PRIVATE_1ON1": 
            return <Lock className="w-5 h-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.85)] animate-pulse" />;
        case "GIFT":
            if (cleanLabel.includes("more")) {
                return <Gem className="w-5 h-5 text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.75)]" />;
            }
            if (cleanLabel.includes("big") || cleanLabel.includes("money") || cleanLabel.includes("crown")) {
                return <Gem className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.85)] animate-pulse" />;
            }
            if (cleanLabel.includes("diamonds")) {
                return <Gem className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.75)]" />;
            }
            return <Gem className="w-5 h-5 text-pink-400 drop-shadow-[0_0_5px_rgba(236,72,153,0.75)]" />;
        default:
            return <Gift className="w-5 h-5 text-pink-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.75)]" />;
    }
}

export function getSugaGlowClass(price: number): string {
    if (price >= 100) {
        return "shadow-[0_0_15px_rgba(234,179,8,0.35)] border-yellow-500/40 text-yellow-400 bg-yellow-500/[0.03] hover:bg-yellow-500/[0.08]";
    }
    if (price >= 50) {
        return "shadow-[0_0_12px_rgba(168,85,247,0.35)] border-purple-500/40 text-purple-300 bg-purple-500/[0.03] hover:bg-purple-500/[0.08]";
    }
    if (price >= 25) {
        return "shadow-[0_0_10px_rgba(236,72,153,0.35)] border-pink-500/40 text-pink-300 bg-pink-500/[0.03] hover:bg-pink-500/[0.08]";
    }
    return "shadow-[0_0_8px_rgba(244,63,94,0.25)] border-pink-500/20 text-pink-400 bg-pink-500/[0.01] hover:bg-pink-500/[0.06]";
}

export function getSugaIconContainerClass(price: number): string {
    if (price >= 100) {
        return "from-yellow-500/25 via-amber-500/30 to-yellow-500/15 border-yellow-500/35 group-hover:border-yellow-400/60 shadow-yellow-500/10";
    }
    if (price >= 50) {
        return "from-purple-500/25 via-fuchsia-500/30 to-purple-500/15 border-purple-500/35 group-hover:border-purple-400/60 shadow-purple-500/10";
    }
    if (price >= 25) {
        return "from-pink-500/25 via-rose-500/30 to-pink-500/15 border-pink-500/35 group-hover:border-pink-400/60 shadow-pink-500/10";
    }
    return "from-rose-500/20 via-pink-500/25 to-rose-500/10 border-rose-500/25 group-hover:border-rose-400/50 shadow-rose-500/5";
}

export function getSugaCyberpunkStyle(type: string, label: string): {
    glowClass: string;
    bgClass: string;
} {
    const cleanType = (type || "").toUpperCase();
    const cleanLabel = (label || "").toLowerCase();

    // Default cyberpunk neon colors (Hot Pink)
    let glow = "border-pink-500/20 hover:border-pink-400/60 hover:shadow-[0_0_12px_rgba(244,63,94,0.4)] hover:text-pink-300";
    let bg = "bg-slate-950/40 hover:bg-slate-900/55";

    if (cleanType === "POSE" || cleanLabel.includes("pose")) {
        glow = "border-pink-500/20 hover:border-pink-400/65 hover:shadow-[0_0_15px_rgba(244,63,94,0.45)] hover:text-pink-300";
        bg = "bg-gradient-to-br from-pink-500/[0.07] via-slate-950/40 to-pink-500/[0.01]";
    } else if (cleanType === "SHOUTOUT" || cleanLabel.includes("shoutout")) {
        glow = "border-cyan-500/20 hover:border-cyan-400/65 hover:shadow-[0_0_15px_rgba(34,211,238,0.45)] hover:text-cyan-300";
        bg = "bg-gradient-to-br from-cyan-500/[0.07] via-slate-950/40 to-cyan-500/[0.01]";
    } else if (cleanType === "QUICK_TEASE" || cleanLabel.includes("quick tease")) {
        glow = "border-amber-500/25 hover:border-amber-400/65 hover:shadow-[0_0_15px_rgba(245,158,11,0.45)] hover:text-amber-300";
        bg = "bg-gradient-to-br from-amber-500/[0.07] via-slate-950/40 to-amber-500/[0.01]";
    } else if (cleanType === "CUSTOM_CLIP" || cleanLabel.includes("custom clip")) {
        glow = "border-purple-500/20 hover:border-purple-400/65 hover:shadow-[0_0_15px_rgba(168,85,247,0.45)] hover:text-purple-300";
        bg = "bg-gradient-to-br from-purple-500/[0.07] via-slate-950/40 to-purple-500/[0.01]";
    } else if (cleanLabel.includes("say my name")) {
        glow = "border-fuchsia-500/20 hover:border-fuchsia-400/65 hover:shadow-[0_0_15px_rgba(232,121,249,0.45)] hover:text-fuchsia-300";
        bg = "bg-gradient-to-br from-fuchsia-500/[0.07] via-slate-950/40 to-fuchsia-500/[0.01]";
    } else if (cleanLabel.includes("sponsor")) {
        glow = "border-yellow-500/35 hover:border-yellow-400/75 hover:shadow-[0_0_20px_rgba(234,179,8,0.55)] hover:text-yellow-300";
        bg = "bg-gradient-to-br from-yellow-500/[0.12] via-slate-950/40 to-amber-500/[0.03]";
    } else if (cleanLabel.includes("voice note") || cleanLabel.includes("video nite")) {
        glow = "border-emerald-500/20 hover:border-emerald-400/65 hover:shadow-[0_0_15px_rgba(16,185,129,0.45)] hover:text-emerald-300";
        bg = "bg-gradient-to-br from-emerald-500/[0.07] via-slate-950/40 to-emerald-500/[0.01]";
    } else if (cleanLabel.includes("photo drop")) {
        glow = "border-rose-500/20 hover:border-rose-400/65 hover:shadow-[0_0_15px_rgba(244,63,94,0.45)] hover:text-rose-300";
        bg = "bg-gradient-to-br from-rose-500/[0.07] via-slate-950/40 to-rose-500/[0.01]";
    } else if (cleanType === "PRIVATE_1ON1" || cleanLabel.includes("private")) {
        glow = "border-red-500/35 hover:border-red-400/75 hover:shadow-[0_0_20px_rgba(239,68,68,0.55)] hover:text-red-300";
        bg = "bg-gradient-to-br from-red-500/[0.12] via-slate-950/40 to-rose-500/[0.03]";
    } else if (cleanType === "GIFT") {
        if (cleanLabel.includes("more")) {
            glow = "border-purple-500/25 hover:border-purple-400/65 hover:shadow-[0_0_15px_rgba(168,85,247,0.45)] hover:text-purple-300";
            bg = "bg-gradient-to-br from-purple-500/[0.07] via-slate-950/40 to-purple-500/[0.01]";
        } else if (cleanLabel.includes("big") || cleanLabel.includes("money") || cleanLabel.includes("crown")) {
            glow = "border-yellow-500/35 hover:border-yellow-400/75 hover:shadow-[0_0_20px_rgba(234,179,8,0.55)] hover:text-yellow-300";
            bg = "bg-gradient-to-br from-yellow-500/[0.12] via-slate-950/40 to-amber-500/[0.03]";
        } else if (cleanLabel.includes("diamonds")) {
            glow = "border-cyan-500/25 hover:border-cyan-400/65 hover:shadow-[0_0_15px_rgba(34,211,238,0.45)] hover:text-cyan-300";
            bg = "bg-gradient-to-br from-cyan-500/[0.07] via-slate-950/40 to-cyan-500/[0.01]";
        } else {
            glow = "border-pink-500/25 hover:border-pink-400/65 hover:shadow-[0_0_12px_rgba(236,72,153,0.45)] hover:text-pink-300";
            bg = "bg-gradient-to-br from-pink-500/[0.07] via-slate-950/40 to-pink-500/[0.01]";
        }
    }

    return { glowClass: glow, bgClass: bg };
}
