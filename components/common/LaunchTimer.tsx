"use client";

import React, { useEffect, useState } from "react";
import { Timer, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface TimerSettings {
    enabled: boolean;
    targetDate: string;
    label: string;
}

const DEFAULT_SETTINGS: TimerSettings = {
    enabled: false,
    targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    label: "Exclusive Suga 4 U Portal Launch",
};

export default function LaunchTimer() {
    const [settings, setSettings] = useState<TimerSettings | null>(null);
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
        completed: boolean;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0, completed: false });

    useEffect(() => {
        const supabase = createClient();

        const loadSettings = async () => {
            try {
                const { data } = await supabase
                    .from("admin_settings")
                    .select("value")
                    .eq("key", "launch_timer_campaign")
                    .single();
                if (data?.value) {
                    setSettings(data.value as TimerSettings);
                } else {
                    setSettings(DEFAULT_SETTINGS);
                }
            } catch {
                setSettings(DEFAULT_SETTINGS);
            }
        };

        loadSettings();

        // Subscribe to realtime updates
        const channel = supabase
            .channel("public:launch_timer")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "admin_settings", filter: "key=eq.launch_timer_campaign" },
                (payload: any) => {
                    if (payload.new?.value) {
                        setSettings(payload.new.value as TimerSettings);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (!settings || !settings.enabled) return;

        const calculateTimeLeft = () => {
            const difference = +new Date(settings.targetDate) - +new Date();
            if (difference <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, completed: true });
                return;
            }

            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
                completed: false,
            });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [settings]);

    if (!settings || !settings.enabled) return null;

    return (
        <div className="z-40 pointer-events-auto flex items-center justify-center py-1 sm:py-0 w-full md:w-auto">
            <div className="relative group overflow-hidden rounded-full border border-pink-500/30 bg-black/60 px-3 sm:px-4 py-1.5 backdrop-blur-md transition-all duration-300 hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.25)] flex items-center gap-2 sm:gap-3">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-cyan-500/5 opacity-50 group-hover:opacity-100 transition-opacity" />

                <div className="hidden sm:flex items-center justify-center h-5 w-5 rounded-full bg-pink-500/10 shrink-0">
                    <Timer className="h-3 w-3 text-pink-400 animate-pulse" />
                </div>

                <div className="flex flex-row items-center gap-1.5 sm:gap-2">
                    <span className="text-[9px] sm:text-xs font-medium tracking-wide text-fuchsia-200/90 whitespace-nowrap inline-flex items-center gap-1">
                        {settings.label}
                        <Sparkles className="h-2.5 w-2.5 text-cyan-400 animate-bounce hidden sm:inline" />
                    </span>

                    {timeLeft.completed ? (
                        <span className="text-[10px] sm:text-xs font-black tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse">
                            WE ARE LIVE!
                        </span>
                    ) : (
                        <div className="flex items-center gap-0.5 sm:gap-1 font-mono text-[10px] sm:text-xs font-bold text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.2)]">
                            <div className="bg-white/5 border border-white/10 px-0.5 sm:px-1 rounded flex flex-col items-center">
                                <span>{String(timeLeft.days).padStart(2, "0")}</span>
                            </div>
                            <span className="text-pink-500/70 font-sans font-black animate-pulse">:</span>
                            <div className="bg-white/5 border border-white/10 px-0.5 sm:px-1 rounded flex flex-col items-center">
                                <span>{String(timeLeft.hours).padStart(2, "0")}</span>
                            </div>
                            <span className="text-pink-500/70 font-sans font-black animate-pulse">:</span>
                            <div className="bg-white/5 border border-white/10 px-0.5 sm:px-1 rounded flex flex-col items-center">
                                <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
                            </div>
                            <span className="text-pink-500/70 font-sans font-black animate-pulse">:</span>
                            <div className="bg-white/5 border border-white/10 px-0.5 sm:px-1 rounded flex flex-col items-center text-pink-400">
                                <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
