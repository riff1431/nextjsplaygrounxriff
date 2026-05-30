"use client";

import React, { useEffect, useState } from "react";
import { X, Sparkles, Heart, Crown, User, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

interface WelcomeMessage {
    enabled: boolean;
    title: string;
    message: string;
    buttonText: string;
    accentColor?: "pink" | "blue" | "purple" | "green";
}

interface WelcomeCampaign {
    fan: WelcomeMessage;
    creator: WelcomeMessage;
    all: WelcomeMessage;
}

const DEFAULT_CAMPAIGNS: WelcomeCampaign = {
    all: {
        enabled: true,
        title: "Welcome to PlayGroundX Portal!",
        message: "Step into the ultimate neon nightlife experience. Discover elite creators, unlock private content drops, join our Truth & Dare tables, or customize your own lounge rooms!",
        buttonText: "Enter the Lounge",
        accentColor: "blue",
    },
    fan: {
        enabled: true,
        title: "Welcome to the Fan Headquarters!",
        message: "Your backstage pass to elite adult creators starts here! Explore dynamic news feeds, unlock exclusive albums, chat privately, and access exclusive custom rooms tailored for VIPs.",
        buttonText: "Let's Play",
        accentColor: "pink",
    },
    creator: {
        enabled: true,
        title: "Welcome to your Creator Studio!",
        message: "Ready to take complete ownership of your fanbase and maximize earnings? Broadcast live rooms, receive interactive tips/gifts, schedule events, and set custom pricing models effortlessly.",
        buttonText: "Open Dashboard",
        accentColor: "purple",
    },
};

interface WelcomePopupProps {
    role: "fan" | "creator" | "all";
}

export default function WelcomePopup({ role }: WelcomePopupProps) {
    const [msgSettings, setMsgSettings] = useState<WelcomeMessage | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [hash, setHash] = useState("");

    // Simple hash function to detect campaign changes
    const getSimpleHash = (text: string) => {
        let h = 0;
        for (let i = 0; i < text.length; i++) {
            h = (h << 5) - h + text.charCodeAt(i);
            h |= 0;
        }
        return String(Math.abs(h));
    };

    useEffect(() => {
        const supabase = createClient();

        const loadCampaigns = async () => {
            try {
                const { data } = await supabase
                    .from("admin_settings")
                    .select("value")
                    .eq("key", "welcome_campaign")
                    .single();

                const campaigns = (data?.value as WelcomeCampaign) || DEFAULT_CAMPAIGNS;
                const activeMessage = campaigns[role] || DEFAULT_CAMPAIGNS[role];
                setMsgSettings(activeMessage);

                if (activeMessage?.enabled) {
                    const currentHash = getSimpleHash(`${activeMessage.title}-${activeMessage.message}-${activeMessage.buttonText}`);
                    setHash(currentHash);

                    // Check local storage
                    const dismissedHash = localStorage.getItem(`pgx_welcome_dismissed_${role}`);
                    if (dismissedHash !== currentHash) {
                        // Delay slightly for premium page transition
                        const timer = setTimeout(() => setIsOpen(true), 800);
                        return () => clearTimeout(timer);
                    }
                }
            } catch {
                const activeMessage = DEFAULT_CAMPAIGNS[role];
                setMsgSettings(activeMessage);
                if (activeMessage?.enabled) {
                    const currentHash = getSimpleHash(`${activeMessage.title}-${activeMessage.message}-${activeMessage.buttonText}`);
                    setHash(currentHash);
                    const dismissedHash = localStorage.getItem(`pgx_welcome_dismissed_${role}`);
                    if (dismissedHash !== currentHash) {
                        const timer = setTimeout(() => setIsOpen(true), 800);
                        return () => clearTimeout(timer);
                    }
                }
            }
        };

        loadCampaigns();
    }, [role]);

    const handleDismiss = () => {
        setIsOpen(false);
        if (hash) {
            localStorage.setItem(`pgx_welcome_dismissed_${role}`, hash);
        }
    };

    if (!msgSettings || !isOpen) return null;

    const accent = msgSettings.accentColor || (role === "fan" ? "pink" : role === "creator" ? "purple" : "blue");

    const colorMap = {
        pink: {
            border: "border-pink-500/30",
            bgGlow: "from-pink-500/10 via-black/95 to-black",
            btn: "bg-pink-600 hover:bg-pink-700 shadow-[0_0_15px_rgba(236,72,153,0.4)]",
            text: "text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]",
            icon: <Heart className="w-8 h-8 text-pink-500 animate-pulse shrink-0" />,
        },
        blue: {
            border: "border-cyan-500/30",
            bgGlow: "from-cyan-500/10 via-black/95 to-black",
            btn: "bg-cyan-600 hover:bg-cyan-700 shadow-[0_0_15px_rgba(6,182,212,0.4)]",
            text: "text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]",
            icon: <Sparkles className="w-8 h-8 text-cyan-400 animate-bounce shrink-0" />,
        },
        purple: {
            border: "border-violet-500/30",
            bgGlow: "from-violet-500/10 via-black/95 to-black",
            btn: "bg-violet-600 hover:bg-violet-700 shadow-[0_0_15px_rgba(139,92,246,0.4)]",
            text: "text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]",
            icon: <Crown className="w-8 h-8 text-violet-400 animate-pulse shrink-0" />,
        },
        green: {
            border: "border-emerald-500/30",
            bgGlow: "from-emerald-500/10 via-black/95 to-black",
            btn: "bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.4)]",
            text: "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]",
            icon: <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />,
        },
    };

    const activeTheme = colorMap[accent];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
                {/* Overlay Background click to close */}
                <div className="absolute inset-0" onClick={handleDismiss} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className={`relative w-full max-w-lg rounded-3xl border ${activeTheme.border} p-6 sm:p-8 shadow-2xl overflow-hidden`}
                >
                    {/* Animated smoke orbs in background */}
                    <div className="absolute -inset-10 opacity-30 blur-3xl pointer-events-none">
                        <div className={`absolute -inset-4 bg-gradient-to-r ${accent === "pink" ? "from-pink-500/20" : accent === "purple" ? "from-violet-500/20" : accent === "green" ? "from-emerald-500/20" : "from-cyan-500/20"} to-transparent rounded-full`} />
                    </div>

                    <div className={`absolute inset-0 bg-gradient-to-b ${activeTheme.bgGlow} opacity-90`} />

                    {/* Content wrapper */}
                    <div className="relative z-10 flex flex-col items-center text-center">
                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute -top-2 -right-2 p-1.5 rounded-full border border-white/10 bg-black/40 text-gray-400 hover:text-white hover:border-white/20 transition-all hover:scale-105"
                            aria-label="Dismiss welcome popup"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Top Icon Badge */}
                        <div className={`w-16 h-16 rounded-2xl bg-black/40 border ${activeTheme.border} flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(0,0,0,0.5)]`}>
                            {activeTheme.icon}
                        </div>

                        {/* Welcome Role Label */}
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/40 mb-1 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                            Campaign: {role === "all" ? "Guest Portal" : role === "fan" ? "Fan Community" : "Creator Hub"}
                        </span>

                        {/* Custom Dynamic Title */}
                        <h2 className={`text-xl sm:text-2xl font-black italic tracking-wide leading-tight mb-3 ${activeTheme.text}`}>
                            {msgSettings.title}
                        </h2>

                        {/* Dynamic Description */}
                        <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-medium max-w-md mb-6">
                            {msgSettings.message}
                        </p>

                        {/* Call to action button */}
                        <button
                            onClick={handleDismiss}
                            className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-bold text-white text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${activeTheme.btn}`}
                        >
                            {msgSettings.buttonText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
