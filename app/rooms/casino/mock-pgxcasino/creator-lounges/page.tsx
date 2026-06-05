"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw, Search } from "lucide-react";
import { cs } from "@/utils/currency";

interface SyncedLounge {
    id: string;
    status: string;
    game_type: string;
    table_name: string;
    creator_name: string;
    description?: string;
    min_bet: number;
    max_bet: number;
}

export default function MockCreatorLoungesPage() {
    const router = useRouter();
    const [lounges, setLounges] = useState<SyncedLounge[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchLounges = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/v1/rooms/casino/lounges");
            const data = await res.json();
            if (res.ok && data.lounges) {
                setLounges(data.lounges);
            }
        } catch (err) {
            console.error("Failed to fetch creator lounges:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLounges();
    }, []);

    const filtered = lounges.filter((l) =>
        l.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.game_type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#07000e] text-white flex flex-col font-sans select-none p-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-yellow-500/10 pb-4 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/rooms/casino/mock-pgxcasino")}
                        className="p-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-950/20 text-yellow-400 hover:text-yellow-300 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase text-yellow-400">Creator Tables Directory</h1>
                        <p className="text-[10px] text-gray-500">Synced Realtime from PlayGroundX platform</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-[200px]">
                        <input
                            type="text"
                            placeholder="Search synced tables..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 bg-[#12071f]/60 border border-purple-500/15 rounded-xl text-xs outline-none focus:border-yellow-500/50 placeholder-white/20 transition"
                        />
                    </div>
                    <button
                        onClick={fetchLounges}
                        className="p-2 rounded-xl border border-purple-500/15 bg-[#12071f]/60 text-purple-300 hover:bg-purple-950/20 transition cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-20 text-center rounded-3xl border border-dashed border-purple-500/10 bg-black/20 text-xs text-gray-500">
                    No synced tables matching search or currently online.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((lounge) => (
                        <div
                            key={lounge.id}
                            className="p-5 rounded-2xl border border-purple-500/15 bg-[#12071f]/60 hover:border-purple-500/35 transition flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                                        lounge.status === "live"
                                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                                            : "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
                                    }`}>
                                        {lounge.status}
                                    </span>
                                    <span className="text-[10px] text-purple-300 font-bold uppercase">{lounge.game_type}</span>
                                </div>
                                <h3 className="font-bold text-white text-sm truncate">{lounge.table_name}</h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">By @{lounge.creator_name}</p>
                                {lounge.description && (
                                    <p className="text-[10px] text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                                        {lounge.description}
                                    </p>
                                )}
                            </div>
                            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-gray-500 font-bold uppercase">Stakes</span>
                                    <span className="text-[10px] font-mono text-yellow-300 font-bold">{cs()}{lounge.min_bet} - {cs()}{lounge.max_bet}</span>
                                </div>
                                <button
                                    onClick={() => router.push(`/rooms/casino/mock-pgxcasino/creator-lounges/${lounge.id}`)}
                                    className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white transition text-xs font-bold uppercase"
                                >
                                    Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
