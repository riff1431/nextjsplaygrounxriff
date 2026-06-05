"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Loader2, Plus, Calendar, Settings, Film, Eye, Coins, AlertCircle } from "lucide-react";
import Link from "next/link";
import WalletPill from "@/components/common/WalletPill";
import { useWallet } from "@/hooks/useWallet";
import BrandLogo from "@/components/common/BrandLogo";
import { cs } from "@/utils/currency";

interface CreatorLoungeDetails {
    id: string;
    room_id: string;
    table_name: string;
    creator_name: string;
    game_type: string;
    min_bet: number;
    max_bet: number;
    duration_minutes: number;
    status: string;
}

export default function CreatorHostLobbyPage() {
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const { balance: walletBalance } = useWallet();
    const supabase = createClient();

    const [lounges, setLounges] = useState<CreatorLoungeDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"all" | "my" | "scheduled" | "ended">("all");

    useEffect(() => {
        if (!authLoading && (!user || role !== "creator")) {
            router.push("/rooms/casino");
        }
    }, [user, role, authLoading, router]);

    const fetchLounges = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch all tables
            const { data, error } = await supabase
                .from("casino_lounges")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setLounges(data || []);
        } catch (err) {
            console.error("Failed to fetch creator lounges:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchLounges();
    }, [user]);

    const filteredLounges = lounges.filter((lounge) => {
        if (activeTab === "all") return true;
        if (activeTab === "my") return lounge.creator_id === user?.id;
        if (activeTab === "scheduled") return lounge.status === "scheduled";
        if (activeTab === "ended") return lounge.status === "ended";
        return true;
    });

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#06020a] flex flex-col items-center justify-center text-pink-500 font-bold">
                <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-4" />
                <span>Loading Host Lobby...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#06020a] text-white flex flex-col font-sans select-none relative overflow-x-hidden">
            {/* Background Neon Gradients */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-pink-900/5 rounded-full blur-[140px] pointer-events-none z-0" />

            {/* Header */}
            <header className="h-[80px] border-b border-purple-500/10 bg-black/60 backdrop-blur-xl flex items-center justify-between px-6 z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/rooms/casino")} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-500/20 bg-black/40 text-purple-300 hover:bg-purple-950/20 transition-all text-xs font-semibold">
                        <ArrowLeft className="w-3.5 h-3.5" /> Choice Page
                    </button>
                    <div className="flex items-center gap-2">
                        <BrandLogo showBadge={false} />
                        <span className="text-white/40 text-xs font-normal border-l border-white/20 pl-3">Creator Host Lobby</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#120824]/80 border border-purple-500/20 px-4 py-2 rounded-2xl">
                        <span className="text-yellow-400 text-sm">🪙</span>
                        <span className="font-mono text-sm font-bold text-yellow-200">{cs()}{walletBalance.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={() => router.push("/rooms/casino/create-lounge")}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)] active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" /> Create New Table
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10 z-10 flex flex-col">
                <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                            CREATOR HOST LOBBY
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Set up games, stream tables, and manage active casino sessions.
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2.5 p-1 rounded-2xl bg-black/40 border border-purple-500/10 backdrop-blur-sm self-start">
                        {(["all", "my", "scheduled", "ended"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                                    activeTab === tab
                                        ? "bg-pink-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                                        : "text-gray-400 hover:text-white"
                                }`}
                            >
                                {tab === "all"
                                    ? "All Tables"
                                    : tab === "my"
                                    ? "My Tables"
                                    : tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table List */}
                {filteredLounges.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 rounded-3xl border border-purple-500/10 bg-black/20 text-center">
                        <AlertCircle className="w-12 h-12 text-purple-400/30 mb-4" />
                        <h3 className="text-lg font-bold text-purple-300">No Lounges Found</h3>
                        <p className="text-gray-500 text-xs mt-1 max-w-sm">
                            There are no tables in this category. Click {"Create New Table"} at the top right to get started!
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-purple-500/15 bg-black/40 backdrop-blur-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-purple-950/20 text-pink-300 font-bold border-b border-purple-500/15 text-xs uppercase tracking-wider">
                                        <th className="p-4 pl-6">Table Name</th>
                                        <th className="p-4">Creator</th>
                                        <th className="p-4">Game Type</th>
                                        <th className="p-4">Stakes</th>
                                        <th className="p-4">Duration</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 pr-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLounges.map((lounge) => (
                                        <tr key={lounge.id} className="border-b border-purple-500/10 hover:bg-purple-950/5 transition text-sm">
                                            <td className="p-4 pl-6 font-bold text-white">{lounge.table_name}</td>
                                            <td className="p-4 text-purple-300">@{lounge.creator_name}</td>
                                            <td className="p-4 text-gray-300">{lounge.game_type}</td>
                                            <td className="p-4 font-mono text-yellow-300 text-xs">
                                                {cs()}{lounge.min_bet} - {cs()}{lounge.max_bet}
                                            </td>
                                            <td className="p-4 text-gray-400 text-xs">
                                                {lounge.duration_minutes} Mins
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                                    lounge.status === "live"
                                                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                                                        : lounge.status === "scheduled"
                                                        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                                                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                                                }`}>
                                                    {lounge.status}
                                                </span>
                                            </td>
                                            <td className="p-4 pr-6 text-right">
                                                {lounge.status === "live" ? (
                                                    <button
                                                        onClick={() => router.push(`/rooms/casino/lounge/${lounge.room_id}`)}
                                                        className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition cursor-pointer"
                                                    >
                                                        Join Room
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-500 font-bold text-xs cursor-not-allowed"
                                                    >
                                                        Wait Start
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
