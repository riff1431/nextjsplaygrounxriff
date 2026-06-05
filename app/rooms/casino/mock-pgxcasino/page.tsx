"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Eye, Users, ShieldAlert, Sparkles, Coins, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { cs } from "@/utils/currency";

const MOCK_GAMES = [
    { id: "roulette_live_001", name: "European Roulette", icon: "🎰", category: "Table Games", minBet: 20, maxBet: 10000, color: "from-red-900 to-black" },
    { id: "blackjack_live_001", name: "VIP Blackjack", icon: "🃏", category: "Cards", minBet: 50, maxBet: 25000, color: "from-emerald-950 to-black" },
    { id: "baccarat_live_001", name: "Speed Baccarat", icon: "🎲", category: "Cards", minBet: 10, maxBet: 5000, color: "from-blue-950 to-black" },
];

interface CreatorLounge {
    id: string;
    status: string;
    game_type: string;
    table_name: string;
    creator_name: string;
    min_bet: number;
    max_bet: number;
}

export default function MockCasinoHomePage() {
    const router = useRouter();
    const { balance: walletBalance } = useWallet();
    const [lounges, setLounges] = useState<CreatorLounge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLounges = async () => {
            try {
                const res = await fetch("/api/v1/rooms/casino/lounges?status=live");
                const data = await res.json();
                if (res.ok && data.lounges) {
                    setLounges(data.lounges);
                }
            } catch (err) {
                console.error("Failed to load active creator lounges:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLounges();
    }, []);

    return (
        <div className="min-h-screen bg-[#07000e] text-white flex flex-col font-sans select-none relative overflow-x-hidden p-6">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-yellow-600/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Title / Hero */}
            <div className="text-center my-6">
                <div className="inline-flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                    <Sparkles className="w-3.5 h-3.5" /> Welcome to PGX Casino
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600">
                    THE ROYAL CASINO FLOOR
                </h1>
                <p className="text-gray-400 text-xs mt-2 max-w-md mx-auto">
                    Play popular casino games solo or join a creator&apos;s interactive live stream table below.
                </p>
            </div>

            {/* Horizontal Creator Lounges Section */}
            <div className="mt-8 mb-12">
                <div className="flex items-center justify-between border-b border-yellow-500/10 pb-3 mb-6">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        <h2 className="text-sm font-black uppercase tracking-wider text-yellow-400">
                            Creator Live Tables
                        </h2>
                    </div>
                    <Link
                        href="/rooms/casino/mock-pgxcasino/creator-lounges"
                        className="text-[11px] text-pink-400 hover:text-pink-300 font-bold transition-all"
                    >
                        View All Lounges →
                    </Link>
                </div>

                {loading ? (
                    <div className="h-24 flex items-center justify-center text-xs text-yellow-500/50">
                        Syncing live creator stream tables...
                    </div>
                ) : lounges.length === 0 ? (
                    <div className="py-8 text-center rounded-2xl border border-dashed border-purple-500/15 bg-black/30 text-xs text-gray-500">
                        No creator live rooms are synced right now. Create one in the PlayGroundX Creator Studio to list it here!
                    </div>
                ) : (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
                        {lounges.map((lounge) => (
                            <div
                                key={lounge.id}
                                className="w-[280px] shrink-0 p-4 rounded-2xl border border-purple-500/20 bg-[#12071f]/80 backdrop-blur-md flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400">
                                            ● {lounge.status}
                                        </span>
                                        <span className="text-[10px] text-purple-300 font-bold uppercase">{lounge.game_type}</span>
                                    </div>
                                    <h3 className="font-bold text-white text-sm truncate">{lounge.table_name}</h3>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Host: @{lounge.creator_name}</p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-gray-500 font-bold uppercase">Stakes</span>
                                        <span className="text-[10px] font-mono text-yellow-300 font-bold">{cs()}{lounge.min_bet} - {cs()}{lounge.max_bet}</span>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/rooms/casino/mock-pgxcasino/creator-lounges/${lounge.id}`)}
                                        className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white transition text-[10px] font-bold uppercase"
                                    >
                                        Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Solo Games Grid */}
            <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-yellow-400 border-b border-yellow-500/10 pb-3 mb-6">
                    Solo Live Dealer Tables
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {MOCK_GAMES.map((game) => (
                        <div
                            key={game.id}
                            className={`rounded-3xl border border-yellow-500/10 bg-gradient-to-br ${game.color} p-6 flex flex-col justify-between h-[200px] hover:border-yellow-500/30 transition-all group`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[9px] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold">
                                        {game.category}
                                    </span>
                                    <h3 className="font-black text-lg text-white mt-1.5 group-hover:text-yellow-400 transition-colors">
                                        {game.name}
                                    </h3>
                                </div>
                                <span className="text-3xl">{game.icon}</span>
                            </div>

                            <div className="flex items-center justify-between border-t border-white/5 pt-4">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-gray-500 font-bold uppercase">Table Limits</span>
                                    <span className="text-xs font-mono font-bold text-yellow-300">${game.minBet} - ${game.maxBet}</span>
                                </div>

                                <button
                                    onClick={() => router.push(`/rooms/casino/mock-pgxcasino/game/${game.id}`)}
                                    className="px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-wider transition hover:scale-105 cursor-pointer flex items-center gap-1.5"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" /> Play Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
