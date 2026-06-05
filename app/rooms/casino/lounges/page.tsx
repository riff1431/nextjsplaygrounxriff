"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { Dices, Search, Calendar, Heart, ShieldAlert, Sparkles, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import BrandLogo from "@/components/common/BrandLogo";
import { cs } from "@/utils/currency";

const GAME_FILTERS = [
    "All Games", 
    "X-Chat", 
    "Suga 4 U", 
    "Flash Drop", 
    "Confession", 
    "Truth or Dare", 
    "Bar Lounge",
    "Roulette", 
    "Blackjack", 
    "Baccarat"
];

interface LoungeDirectoryDetails {
    id: string;
    status: string;
    game_type: string;
    table_name: string;
    creator_name: string;
    min_bet: number;
    max_bet: number;
    room_id: string;
    description?: string;
    vip_only?: boolean;
    creator_avatar_url?: string;
}

export default function FanLoungesDirectoryPage() {
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const { balance: walletBalance } = useWallet();
    const supabase = createClient();

    const [lounges, setLounges] = useState<LoungeDirectoryDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGame, setSelectedGame] = useState("All Games");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "live" | "scheduled">("all");

    const fetchLounges = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedGame !== "All Games") {
                params.append("gameType", selectedGame);
            }
            // Route fetches both live and scheduled by default, but let's query it
            const res = await fetch(`/api/v1/rooms/casino/lounges?${params.toString()}`);
            const data = await res.json();
            if (res.ok && data.lounges) {
                setLounges(data.lounges);
            } else {
                setLounges([]);
            }
        } catch (err) {
            console.error("Failed to load lounges directory:", err);
            toast.error("Could not fetch creator tables.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLounges();
    }, [selectedGame]);

    const filteredLounges = lounges.filter((l) => {
        const matchesSearch = 
            l.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.game_type.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            statusFilter === "all" ? true : l.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#06020a] flex items-center justify-center text-pink-500 font-bold">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500 mr-2" /> Loading Directory...
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
                    <button onClick={() => router.push("/rooms/casino")} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-500/20 bg-black/40 text-purple-300 hover:bg-purple-950/20 transition-all text-xs font-semibold">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <div className="flex items-center gap-2">
                        <BrandLogo showBadge={false} />
                        <span className="text-white/40 text-xs font-normal border-l border-white/20 pl-3">Creator Tables</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#120824]/80 border border-purple-500/20 px-4 py-2 rounded-2xl">
                        <span className="text-yellow-400 text-sm">🪙</span>
                        <span className="font-mono text-sm font-bold text-yellow-200">{cs()}{walletBalance.toFixed(2)}</span>
                    </div>
                    {role === "creator" && (
                        <button
                            onClick={() => router.push("/rooms/casino/host-lobby")}
                            className="px-4 py-2 rounded-xl bg-pink-600/20 border border-pink-500/30 hover:bg-pink-600 hover:text-white font-bold text-xs uppercase transition"
                        >
                            Host Lobby
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10 z-10 flex flex-col">
                {/* Hero Banner */}
                <div className="relative rounded-3xl border border-purple-500/25 bg-gradient-to-r from-purple-950/40 to-pink-950/20 p-8 mb-10 overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-pink-600/10 rounded-full blur-[80px] pointer-events-none" />
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-[10px] font-bold uppercase tracking-wider mb-3">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Live Entertainment
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none uppercase">
                            Join Creator Lounges
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm max-w-lg leading-relaxed">
                            Watch your favorite creators host casino tables live! Chat, send gifts, tip to support, and play games simultaneously.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/rooms/casino/play")}
                        className="px-6 py-4.5 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-wider transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] active:scale-95 shrink-0 self-start md:self-auto cursor-pointer"
                    >
                        ⚡ Go to Solo Casino Floor
                    </button>
                </div>

                {/* Filters Row */}
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Game Select Buttons */}
                    <div className="flex gap-2.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-thin">
                        {GAME_FILTERS.map((game) => (
                            <button
                                key={game}
                                onClick={() => setSelectedGame(game)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition cursor-pointer ${
                                    selectedGame === game
                                        ? "bg-pink-600 border border-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                                        : "bg-[#0f071a]/60 border border-purple-500/15 text-gray-400 hover:text-white"
                                }`}
                            >
                                {game}
                            </button>
                        ))}
                    </div>

                    {/* Search & Status Filters */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Status dropdown */}
                        <div className="flex gap-1.5 p-1 rounded-xl bg-black/40 border border-purple-500/10">
                            {(["all", "live", "scheduled"] as const).map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                                        statusFilter === st
                                            ? "bg-purple-600/30 text-purple-300 border border-purple-500/20"
                                            : "text-gray-500 hover:text-white"
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        {/* Search input */}
                        <div className="relative flex-1 md:w-[240px] min-w-[200px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
                            <input
                                type="text"
                                placeholder="Search tables or creators..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[#0f071a]/60 border border-purple-500/15 rounded-xl text-xs outline-none focus:border-pink-500/50 placeholder-white/20 transition"
                            />
                        </div>

                        <button
                            onClick={fetchLounges}
                            className="p-2.5 rounded-xl border border-purple-500/15 bg-[#0f071a]/60 text-purple-300 hover:bg-purple-950/20 transition cursor-pointer"
                            title="Refresh table list"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Directory Grid */}
                {loading ? (
                    <div className="h-60 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-pink-500 mb-2" />
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Refreshing live tables...</span>
                    </div>
                ) : filteredLounges.length === 0 ? (
                    <div className="py-20 rounded-3xl border border-purple-500/10 bg-black/20 text-center flex flex-col items-center justify-center">
                        <Dices className="w-12 h-12 text-purple-500/25 mb-4" />
                        <h3 className="text-lg font-black text-purple-300 uppercase">No Active Table Lounges</h3>
                        <p className="text-gray-500 text-xs mt-1 max-w-sm">
                            No creators are hosting {selectedGame !== "All Games" ? selectedGame : ""} tables right now.
                        </p>
                        {role === "creator" && (
                            <button
                                onClick={() => router.push("/rooms/casino/create-lounge")}
                                className="mt-4 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase transition cursor-pointer"
                            >
                                Host Your Own Now
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredLounges.map((lounge) => {
                            const isLive = lounge.status === "live";
                            return (
                                <div
                                    key={lounge.id}
                                    className="group relative rounded-3xl border border-purple-500/15 bg-black/40 overflow-hidden hover:border-purple-500/40 hover:scale-[1.01] transition-all duration-300 shadow-lg flex flex-col justify-between"
                                >
                                    {/* Cover Image Placeholder */}
                                    <div className="h-[120px] bg-gradient-to-br from-purple-900/40 to-pink-900/30 relative flex items-center justify-center">
                                        <div className="absolute inset-0 bg-black/20" />
                                        <span className="text-3xl z-10">
                                            {lounge.game_type === "Roulette" ? "🎰" : 
                                              lounge.game_type === "Blackjack" ? "🃏" : 
                                              lounge.game_type === "X-Chat" ? "💬" :
                                              lounge.game_type === "Suga 4 U" ? "🍬" :
                                              lounge.game_type === "Flash Drop" ? "⚡" :
                                              lounge.game_type === "Confessions" ? "🤫" :
                                              lounge.game_type === "Truth or Dare" ? "🎯" :
                                              lounge.game_type === "Bar Lounge" ? "🍷" : "🎲"}
                                        </span>
                                        <div className="absolute top-3 right-3 z-10 flex gap-1">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                                                isLive 
                                                    ? "bg-green-500/10 border-green-500/20 text-green-400 animate-pulse" 
                                                    : "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
                                            }`}>
                                                {lounge.status}
                                            </span>
                                            {lounge.vip_only && (
                                                <span className="text-[9px] font-black uppercase bg-pink-500/20 border border-pink-500/30 text-pink-400 px-1.5 py-0.5 rounded">
                                                    VIP
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-purple-800 to-pink-700 flex items-center justify-center text-[10px] font-bold border border-white/10 overflow-hidden">
                                                    {lounge.creator_avatar_url ? (
                                                        <img src={lounge.creator_avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        "C"
                                                    )}
                                                </div>
                                                <span className="text-xs font-semibold text-purple-300">@{lounge.creator_name}</span>
                                            </div>

                                            <h3 className="font-bold text-white text-base leading-snug group-hover:text-pink-300 transition-colors line-clamp-1">
                                                {lounge.table_name}
                                            </h3>
                                            
                                            {lounge.description && (
                                                <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                                                    {lounge.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-5 pt-3 border-t border-purple-500/10 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Limits</span>
                                                <span className="text-xs font-mono font-bold text-yellow-400">{cs()}{lounge.min_bet} - {cs()}{lounge.max_bet}</span>
                                            </div>
                                            
                                            <button
                                                onClick={() => {
                                                    if (isLive) {
                                                        router.push(`/rooms/casino/lounge/${lounge.room_id}`);
                                                    } else {
                                                        toast.info("This table is scheduled and hasn't started yet.");
                                                    }
                                                }}
                                                className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                                                    isLive
                                                        ? "bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                                                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                                }`}
                                            >
                                                {isLive ? "Join Room" : "Scheduled"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
