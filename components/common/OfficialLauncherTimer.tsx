"use client";

import React, { useEffect, useState } from "react";
import { Clock, Sparkles, X, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface TimerSettings {
    enabled: boolean;
    targetDate: string;
    label: string;
}

const TARGET_DATE_KEY = "playgroundx_official_launcher_target";
const DISMISSED_KEY = "playgroundx_official_launcher_dismissed";

export default function OfficialLauncherTimer() {
    const { user, role, isLoading: authLoading } = useAuth();
    const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
    const [checkingOnboarding, setCheckingOnboarding] = useState<boolean>(true);

    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [label, setLabel] = useState<string>("Official Portal Global Launch");
    const [isDismissed, setIsDismissed] = useState<boolean>(true); // Start true to prevent layout flash
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        completed: boolean;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0, completed: false });

    // --- Guard: only show to fully-onboarded users ---
    useEffect(() => {
        if (authLoading) return;

        // Not logged in → never show
        if (!user) {
            setOnboardingComplete(false);
            setCheckingOnboarding(false);
            return;
        }

        const supabaseCheck = createClient();
        const checkProfile = async () => {
            try {
                const { data: profile } = await supabaseCheck
                    .from("profiles")
                    .select("role, onboarding_completed_at, kyc_status")
                    .eq("id", user.id)
                    .single();

                if (!profile) {
                    setOnboardingComplete(false);
                    return;
                }

                const isFanDone =
                    profile.role === "fan" && !!profile.onboarding_completed_at;
                const isCreatorDone =
                    profile.role === "creator" && profile.kyc_status === "approved";
                const isAdmin = profile.role === "admin";

                setOnboardingComplete(isFanDone || isCreatorDone || isAdmin);
            } catch {
                setOnboardingComplete(false);
            } finally {
                setCheckingOnboarding(false);
            }
        };

        checkProfile();
    }, [user, authLoading]);

    useEffect(() => {
        // Only run client-side after we know onboarding is complete
        if (!onboardingComplete) return;

        const dismissed = localStorage.getItem(DISMISSED_KEY);
        if (dismissed !== "true") {
            setIsDismissed(false);
        }

        const supabase = createClient();

        const fetchCampaign = async () => {
            let targetStr: string | null = null;
            let campaignLabel = "Official Portal Global Launch";

            // 1. Try to load from Supabase settings
            try {
                const { data } = await supabase
                    .from("admin_settings")
                    .select("value")
                    .eq("key", "launch_timer_campaign")
                    .single();

                const settings = data?.value as TimerSettings | undefined;
                if (settings?.enabled && settings.targetDate) {
                    const parsedDate = new Date(settings.targetDate);
                    if (parsedDate.getTime() > Date.now()) {
                        targetStr = settings.targetDate;
                        if (settings.label) {
                            campaignLabel = settings.label;
                        }
                    }
                }
            } catch (err) {
                console.log("No supabase settings found, using local storage fallback.");
            }

            // 2. If no campaign setting, try local storage persistent date
            if (!targetStr) {
                const localTarget = localStorage.getItem(TARGET_DATE_KEY);
                if (localTarget) {
                    const parsedDate = new Date(localTarget);
                    if (parsedDate.getTime() > Date.now()) {
                        targetStr = localTarget;
                    }
                }
            }

            // 3. Fallback: 10 days from now, persistent in local storage
            if (!targetStr) {
                const fallbackDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
                targetStr = fallbackDate.toISOString();
                localStorage.setItem(TARGET_DATE_KEY, targetStr);
            }

            setTargetDate(new Date(targetStr));
            setLabel(campaignLabel);
        };

        fetchCampaign();

        // Subscribe to settings changes
        const channel = supabase
            .channel("public:official_launcher_timer")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "admin_settings", filter: "key=eq.launch_timer_campaign" },
                (payload: any) => {
                    const settings = payload.new?.value as TimerSettings | undefined;
                    if (settings?.enabled && settings.targetDate) {
                        const parsedDate = new Date(settings.targetDate);
                        if (parsedDate.getTime() > Date.now()) {
                            setTargetDate(parsedDate);
                            if (settings.label) {
                                setLabel(settings.label);
                            }
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [onboardingComplete]);

    // Calculate time left
    useEffect(() => {
        if (!targetDate) return;

        const calculateTime = () => {
            const diff = targetDate.getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, completed: true });
                return;
            }

            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((diff / 1000 / 60) % 60),
                seconds: Math.floor((diff / 1000) % 60),
                completed: false,
            });
        };

        calculateTime();
        const intervalId = setInterval(calculateTime, 1000);

        return () => clearInterval(intervalId);
    }, [targetDate]);

    const handleDismiss = () => {
        setIsDismissed(true);
        localStorage.setItem(DISMISSED_KEY, "true");
    };

    // Never show on auth, onboarding, or any page before signup is fully complete
    if (authLoading || checkingOnboarding || !onboardingComplete) return null;
    if (isDismissed || !targetDate) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="fixed top-4 left-4 right-4 z-[9999] flex justify-center pointer-events-none sm:left-auto sm:right-6 sm:top-6 sm:block md:right-8 md:top-8"
            >
                <div className="relative group p-2.5 sm:p-4 rounded-2xl border border-pink-500/25 bg-black/90 backdrop-blur-xl shadow-[0_0_30px_rgba(236,72,153,0.25),0_0_60px_rgba(0,230,255,0.15)] hover:border-pink-500/40 hover:shadow-[0_0_40px_rgba(236,72,153,0.35),0_0_80px_rgba(34,211,238,0.2)] transition-all duration-500 w-full max-w-[260px] sm:max-w-[340px] overflow-hidden pointer-events-auto">
                    {/* Glowing Accent Lines */}
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-transparent to-cyan-500/5 opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all duration-700 pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all duration-700 pointer-events-none" />

                    {/* MOBILE LAYOUT (Compact 3 lines) */}
                    <div className="sm:hidden relative space-y-2">
                        {/* Line 1: Title + Close */}
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/5">
                            <div className="text-[9.5px] font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-fuchsia-300 flex items-center gap-1.5 min-w-0">
                                <Clock className="w-3 h-3 text-pink-400 shrink-0" />
                                <span className="truncate leading-tight">{label}</span>
                            </div>
                            <button
                                onClick={handleDismiss}
                                className="p-0.5 rounded text-gray-400 hover:text-white cursor-pointer shrink-0"
                                title="Close Notification"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Line 2: Inline Countdown Timer + Live Dot */}
                        {timeLeft.completed ? (
                            <div className="text-[10px] font-bold text-center text-emerald-400 py-1">
                                WE ARE LIVE!
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-zinc-950/60 border border-white/5 rounded-xl px-2 py-1.5">
                                <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-white">
                                    <span className="text-pink-400">{String(timeLeft.days).padStart(2, "0")}d</span>
                                    <span className="text-pink-500/50">:</span>
                                    <span>{String(timeLeft.hours).padStart(2, "0")}h</span>
                                    <span className="text-pink-500/50">:</span>
                                    <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>
                                    <span className="text-pink-500/50">:</span>
                                    <span className="text-pink-400 animate-pulse">{String(timeLeft.seconds).padStart(2, "0")}s</span>
                                </div>
                                <span className="flex items-center gap-1 text-[8px] font-bold text-cyan-400 tracking-wider uppercase shrink-0">
                                    <span className="relative flex h-1 w-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1 w-1 bg-cyan-500"></span>
                                    </span>
                                    LIVE
                                </span>
                            </div>
                        )}

                        {/* Line 3: Skip button */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleDismiss}
                                className="text-[8px] font-black text-gray-500 hover:text-pink-400 transition-colors tracking-widest uppercase cursor-pointer"
                            >
                                Skip Alert
                            </button>
                        </div>
                    </div>

                    {/* DESKTOP LAYOUT (Original Grid) */}
                    <div className="hidden sm:block relative space-y-2.5 sm:space-y-3">
                        {/* Title Row */}
                        <div className="flex items-start justify-between border-b border-white/5 pb-2.5 gap-2">
                            <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-fuchsia-300 drop-shadow-[0_0_10px_rgba(236,72,153,0.2)] flex items-start gap-1.5 flex-1 min-w-0">
                                <Clock className="w-3.5 h-3.5 text-pink-400 animate-pulse shrink-0 mt-0.5" />
                                <span className="break-words leading-tight flex-1">{label}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className="flex items-center gap-1">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                                    </span>
                                    <span className="text-[8px] font-bold text-cyan-400 tracking-widest uppercase">LIVE</span>
                                </span>

                                {/* Close Button */}
                                <button
                                    onClick={handleDismiss}
                                    className="p-1 rounded-lg border border-white/5 bg-white/5 text-gray-400 hover:text-white hover:border-pink-500/30 hover:bg-pink-500/10 transition-all hover:scale-105 cursor-pointer shrink-0"
                                    title="Close Notification"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Timer Countdown Grid */}
                        {timeLeft.completed ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-2 space-y-1 text-center"
                            >
                                <Sparkles className="w-6 h-6 text-yellow-400 animate-bounce" />
                                <span className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse">
                                    WE ARE OFFICIALLY LIVE!
                                </span>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center">
                                {/* Days */}
                                <div className="flex flex-col items-center">
                                    <div className="w-full py-1 sm:py-2 rounded-xl bg-zinc-950/65 border border-white/5 shadow-inner relative overflow-hidden group-hover:border-pink-500/20 transition-colors duration-300">
                                        <span className="font-mono text-sm sm:text-lg font-black text-white tracking-tight drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]">
                                            {String(timeLeft.days).padStart(2, "0")}
                                        </span>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] font-bold text-gray-500 tracking-widest mt-1 uppercase">DAYS</span>
                                </div>

                                {/* Hours */}
                                <div className="flex flex-col items-center">
                                    <div className="w-full py-1 sm:py-2 rounded-xl bg-zinc-950/65 border border-white/5 shadow-inner relative overflow-hidden group-hover:border-pink-500/20 transition-colors duration-300">
                                        <span className="font-mono text-sm sm:text-lg font-black text-white tracking-tight drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]">
                                            {String(timeLeft.hours).padStart(2, "0")}
                                        </span>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] font-bold text-gray-500 tracking-widest mt-1 uppercase">HOURS</span>
                                </div>

                                {/* Minutes */}
                                <div className="flex flex-col items-center">
                                    <div className="w-full py-1 sm:py-2 rounded-xl bg-zinc-950/65 border border-white/5 shadow-inner relative overflow-hidden group-hover:border-pink-500/20 transition-colors duration-300">
                                        <span className="font-mono text-sm sm:text-lg font-black text-white tracking-tight drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]">
                                            {String(timeLeft.minutes).padStart(2, "0")}
                                        </span>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] font-bold text-gray-500 tracking-widest mt-1 uppercase">MINS</span>
                                </div>

                                {/* Seconds */}
                                <div className="flex flex-col items-center">
                                    <div className="w-full py-1 sm:py-2 rounded-xl bg-zinc-950/65 border border-white/5 shadow-inner relative overflow-hidden group-hover:border-pink-500/20 transition-colors duration-300">
                                        <span className="font-mono text-sm sm:text-lg font-black text-pink-400 tracking-tight drop-shadow-[0_0_8px_rgba(236,72,153,0.3)]">
                                            {String(timeLeft.seconds).padStart(2, "0")}
                                        </span>
                                    </div>
                                    <span className="text-[7px] sm:text-[8px] font-bold text-pink-500/70 tracking-widest mt-1 uppercase">SECS</span>
                                </div>
                            </div>
                        )}

                        {/* Footer Skip Link */}
                        <div className="flex justify-end pt-1">
                            <button
                                onClick={handleDismiss}
                                className="text-[9px] sm:text-[10px] font-black text-gray-400 hover:text-pink-400 transition-colors tracking-widest uppercase cursor-pointer flex items-center gap-1"
                            >
                                Skip Alert
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
