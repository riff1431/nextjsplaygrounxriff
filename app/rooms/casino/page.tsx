"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { Dices, User, Users, Play, Radio, Loader2, ArrowLeft, Coins, Gem, Bell } from "lucide-react";
import Link from "next/link";
import WalletPill from "@/components/common/WalletPill";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/app/context/ThemeContext";
import BrandLogo from "@/components/common/BrandLogo";
import { cs } from "@/utils/currency";

interface ActiveLounge {
    id: string;
    status: string;
    game_type: string;
    table_name: string;
    creator_name: string;
    min_bet: number;
    max_bet: number;
    room_id: string;
}

export default function CasinoLandingPage() {
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const { balance: walletBalance } = useWallet();
    const supabase = createClient();

    const [activeLounges, setActiveLounges] = useState<ActiveLounge[]>([]);
    const [loadingLounges, setLoadingLounges] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        // Fans are redirected directly to the Lounges Browse page
        if (user && role === "fan") {
            router.push("/rooms/casino/lounges");
        }
    }, [user, role, authLoading, router]);

    useEffect(() => {
        const fetchActiveLounges = async () => {
            try {
                const res = await fetch("/api/v1/rooms/casino/lounges");
                const data = await res.json();
                if (res.ok && data.lounges) {
                    setActiveLounges(data.lounges.slice(0, 4));
                }
            } catch (err) {
                console.error("Failed to load active lounges preview:", err);
            } finally {
                setLoadingLounges(false);
            }
        };

        fetchActiveLounges();
    }, []);

    if (authLoading || (user && role === "fan")) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-yellow-500 font-bold">
                <Loader2 className="w-10 h-10 animate-spin text-yellow-500 mb-4" />
                <span>Entering PlayGroundX Casino...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#06020a] text-white flex flex-col font-sans select-none relative overflow-x-hidden">
            {/* Background Neon Gradients */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-yellow-900/5 rounded-full blur-[140px] pointer-events-none z-0" />

            {/* Header */}
            <header className="h-[80px] border-b border-purple-500/10 bg-black/60 backdrop-blur-xl flex items-center justify-between px-6 z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <Link href="/home" className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-500/20 bg-black/40 text-purple-300 hover:bg-purple-950/20 transition-all text-xs font-semibold">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </Link>
                    <div className="flex items-center gap-2">
                        <BrandLogo showBadge={false} />
                        <span className="text-white/40 text-xs font-normal border-l border-white/20 pl-3">Casino</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#120824]/80 border border-purple-500/20 px-4 py-2 rounded-2xl">
                        <span className="text-yellow-400 text-sm">🪙</span>
                        <span className="font-mono text-sm font-bold text-yellow-200">{cs()}{walletBalance.toFixed(2)}</span>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition cursor-pointer">
                        <Bell className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-black/40 border border-purple-500/20">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 border border-white/20 flex items-center justify-center text-xs font-bold">
                            C
                        </div>
                        <span className="text-xs font-semibold text-purple-200">Creator Panel</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10 z-10 flex flex-col justify-center">
                <div className="text-center mb-10">
                    <div className="inline-flex p-3 rounded-3xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 mb-4 animate-bounce">
                        <Dices className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-yellow-200 to-yellow-400">
                        Welcome to the Casino
                    </h1>
                    <p className="text-gray-400 mt-3 text-base sm:text-lg max-w-xl mx-auto">
                        Host exclusive live table rooms for your fans or play yourself on the betting floor.
                    </p>
                </div>

                {/* Choice Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
                    {/* Play Card */}
                    <button
                        onClick={() => router.push("/rooms/casino/play")}
                        className="group relative h-[360px] rounded-3xl border border-cyan-400/30 bg-black/40 overflow-hidden hover:scale-[1.02] hover:border-cyan-400/60 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.4)] text-center flex flex-col items-center justify-center p-8 cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent_60%)]" />
                        <div className="relative z-10 w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                            <Play className="w-8 h-8 text-cyan-400 fill-current ml-1" />
                        </div>
                        <h2 className="text-3xl font-black tracking-wide text-white group-hover:text-cyan-300 transition-colors">PLAY CASINO</h2>
                        <p className="text-gray-400 text-sm max-w-xs mt-3 leading-relaxed">
                            Browse the casino games directly and place bets as a private player.
                        </p>
                        <div className="w-[80%] mt-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 font-bold tracking-wide uppercase text-sm text-black group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all">
                            Enter Casino Floor
                        </div>
                    </button>

                    {/* Host Card */}
                    <button
                        onClick={() => router.push("/rooms/casino/host-lobby")}
                        className="group relative h-[360px] rounded-3xl border border-pink-500/30 bg-black/40 overflow-hidden hover:scale-[1.02] hover:border-pink-500/60 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.4)] text-center flex flex-col items-center justify-center p-8 cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.15),transparent_60%)]" />
                        <div className="relative z-10 w-20 h-20 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(236,72,153,0.2)]">
                            <Radio className="w-8 h-8 text-pink-400" />
                        </div>
                        <h2 className="text-3xl font-black tracking-wide text-white group-hover:text-pink-300 transition-colors">HOST A TABLE</h2>
                        <p className="text-gray-400 text-sm max-w-xs mt-3 leading-relaxed">
                            Create your own custom table lounge, stream live, and chat with your fans.
                        </p>
                        <div className="w-[80%] mt-8 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 font-bold tracking-wide uppercase text-sm group-hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all">
                            Launch Creator Studio
                        </div>
                    </button>
                </div>

                {/* Active Creator Lounges Horizontal Preview */}
                <div className="mt-16">
                    <div className="flex items-center justify-between border-b border-purple-500/10 pb-4 mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <h2 className="text-xl font-bold tracking-wide uppercase text-purple-200">Active Creator Tables</h2>
                        </div>
                        <Link href="/rooms/casino/lounges" className="text-xs text-pink-400 hover:text-pink-300 font-bold transition">
                            View All Directory →
                        </Link>
                    </div>

                    {loadingLounges ? (
                        <div className="h-40 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                        </div>
                    ) : activeLounges.length === 0 ? (
                        <div className="py-12 text-center rounded-2xl border border-dashed border-purple-500/20 bg-black/20 text-gray-500 text-sm">
                            No creators are currently hosting live tables. Use the {"Host a Table"} button above to launch yours!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {activeLounges.map((lounge) => (
                                <div
                                    key={lounge.id}
                                    className="p-4 rounded-2xl border border-purple-500/10 bg-black/40 backdrop-blur-md hover:border-purple-500/30 transition flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                                ● {lounge.status}
                                            </span>
                                            <span className="text-xs text-purple-300 font-semibold">{lounge.game_type}</span>
                                        </div>
                                        <h3 className="font-bold text-sm text-white truncate">{lounge.table_name}</h3>
                                        <p className="text-xs text-gray-400 mt-1">By {lounge.creator_name}</p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[11px] text-gray-500 font-mono">{cs()}{lounge.min_bet} - {cs()}{lounge.max_bet} limits</span>
                                        <button
                                            onClick={() => router.push(`/rooms/casino/lounge/${lounge.room_id}`)}
                                            className="px-3 py-1.5 rounded-lg bg-pink-600/30 hover:bg-pink-600 text-pink-300 hover:text-white transition text-[11px] font-bold"
                                        >
                                            Join Room
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
