"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Play, Users, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cs } from "@/utils/currency";

interface CreatorLoungeDetails {
    id: string;
    status: string;
    table_name: string;
    creator_name: string;
    vip_only: boolean;
    game_type: string;
    min_bet: number;
    max_bet: number;
    duration_minutes: number;
    description?: string;
    room_id: string;
}

export default function MockLoungeDetailsPage() {
    const loungeId = useParams()?.loungeId as string;
    const router = useRouter();

    const [lounge, setLounge] = useState<CreatorLoungeDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await fetch(`/api/v1/rooms/casino/lounges/${loungeId}`);
                const data = await res.json();
                if (res.ok && data.lounge) {
                    setLounge(data.lounge);
                } else {
                    toast.error("Lounge not found");
                }
            } catch (err) {
                console.error("Failed to load lounge details:", err);
            } finally {
                setLoading(false);
            }
        };

        if (loungeId) {
            fetchDetails();
        }
    }, [loungeId]);

    const handleJoinLounge = () => {
        if (!lounge) return;
        // In PGX, rooms are navigated via room_id (which corresponds to roomId in route)
        // Let's redirect to play and watch: `/rooms/casino/lounge/${lounge.room_id}`
        // Using window.parent.location check is vital because this page is loaded inside an iframe!
        // If we are in an iframe, we want the *parent* window to navigate to the PlayGroundX lounge room.
        // Let's check if we are in an iframe:
        const inIframe = window.self !== window.top;
        if (inIframe) {
            window.parent.location.href = `/rooms/casino/lounge/${lounge.room_id}`;
        } else {
            router.push(`/rooms/casino/lounge/${lounge.room_id}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07000e] flex items-center justify-center text-yellow-500">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            </div>
        );
    }

    if (!lounge) {
        return (
            <div className="min-h-screen bg-[#07000e] text-white flex flex-col items-center justify-center p-6 text-center">
                <p className="text-gray-400 text-sm">Creator table lounge not found or expired.</p>
                <button
                    onClick={() => router.push("/rooms/casino/mock-pgxcasino")}
                    className="mt-4 px-4 py-2 rounded-xl bg-yellow-500 text-black font-bold text-xs uppercase"
                >
                    Back to Casino Floor
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#07000e] text-white flex flex-col font-sans select-none p-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-yellow-500/10 pb-4 mb-8">
                <button
                    onClick={() => router.push("/rooms/casino/mock-pgxcasino/creator-lounges")}
                    className="p-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-950/20 text-yellow-400 hover:text-yellow-300 transition"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <h1 className="text-lg font-black uppercase text-yellow-400">Creator Table Details</h1>
                    <p className="text-[10px] text-gray-500">Table ID: {lounge.id}</p>
                </div>
            </div>

            {/* Details Panel */}
            <div className="max-w-[700px] mx-auto w-full p-6 sm:p-8 rounded-3xl border border-purple-500/15 bg-[#12071f]/60 backdrop-blur-md space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
                    <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded">
                            ● {lounge.status}
                        </span>
                        <h2 className="text-2xl font-black text-white mt-2 leading-none uppercase">{lounge.table_name}</h2>
                        <div className="flex items-center gap-1.5 mt-2.5">
                            <span className="text-xs text-purple-300 font-semibold">Hosted by @{lounge.creator_name}</span>
                            {lounge.vip_only && (
                                <span className="text-[9px] font-black uppercase bg-pink-500/20 border border-pink-500/30 text-pink-400 px-1.5 py-0.5 rounded ml-2">
                                    VIP ONLY
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-3xl sm:text-4xl">
                        {lounge.game_type === "Roulette" ? "🎰" : 
                         lounge.game_type === "Blackjack" ? "🃏" : 
                         lounge.game_type === "X-Chat" ? "💬" :
                         lounge.game_type === "Suga 4 U" ? "🍬" :
                         lounge.game_type === "Flash Drop" ? "⚡" :
                         lounge.game_type === "Confession" || lounge.game_type === "Confessions" ? "🤫" :
                         lounge.game_type === "Truth or Dare" ? "🎯" :
                         lounge.game_type === "Bar Lounge" ? "🍷" : "🎲"}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl border border-purple-500/10 bg-black/30">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider">Game Type</span>
                        <span className="block text-sm font-bold text-white mt-1">{lounge.game_type}</span>
                    </div>
                    <div className="p-4 rounded-2xl border border-purple-500/10 bg-black/30">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider">Min / Max Bets</span>
                        <span className="block text-sm font-mono font-bold text-yellow-300 mt-1">{cs()}{lounge.min_bet} - {cs()}{lounge.max_bet}</span>
                    </div>
                    <div className="p-4 rounded-2xl border border-purple-500/10 bg-black/30 col-span-2 sm:col-span-1">
                        <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider">Session Duration</span>
                        <span className="block text-sm font-bold text-white mt-1">{lounge.duration_minutes} Minutes</span>
                    </div>
                </div>

                {lounge.description && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-pink-300">Lounge Description</h4>
                        <p className="text-sm text-gray-300 leading-relaxed bg-black/20 p-4 rounded-2xl border border-purple-500/5">
                            {lounge.description}
                        </p>
                    </div>
                )}

                <div className="pt-4 flex flex-col gap-3">
                    <button
                        onClick={handleJoinLounge}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-500 font-black uppercase tracking-widest text-xs hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                        <Sparkles className="w-4 h-4 text-yellow-300" /> Join Creator Lounge & Play
                    </button>
                    <p className="text-center text-[10px] text-gray-500">
                        This action will transition you to the PlayGroundX multi-pane lounge room.
                    </p>
                </div>
            </div>
        </div>
    );
}
