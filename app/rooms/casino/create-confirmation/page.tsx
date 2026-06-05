"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { ArrowRight, Loader2, Check, ArrowLeft, Dices, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import BrandLogo from "@/components/common/BrandLogo";
import { cs } from "@/utils/currency";

interface LoungeDetails {
    table_name: string;
    creator_name: string;
    status: string;
    game_type: string;
    min_bet: number;
    max_bet: number;
    start_time: string;
    duration_minutes: number;
    room_id: string;
}

function ConfirmationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const loungeId = searchParams.get("loungeId");
    const { user, role, isLoading: authLoading } = useAuth();
    const { balance: walletBalance } = useWallet();

    const [lounge, setLounge] = useState<LoungeDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && (!user || role !== "creator")) {
            router.push("/rooms/casino");
            return;
        }

        const fetchLoungeDetails = async () => {
            if (!loungeId) {
                setError("Lounge ID is missing");
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/v1/rooms/casino/lounges/${loungeId}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to fetch details");
                setLounge(data.lounge);
            } catch (err) {
                console.error(err);
                const errorMsg = err instanceof Error ? err.message : "Failed to load lounge details";
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchLoungeDetails();
    }, [user, role, authLoading, loungeId, router]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#06020a] flex flex-col items-center justify-center text-pink-500 font-bold">
                <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-4" />
                <span>Loading confirmation details...</span>
            </div>
        );
    }

    if (error || !lounge) {
        return (
            <div className="min-h-screen bg-[#06020a] flex flex-col items-center justify-center text-red-500 p-6 text-center">
                <ShieldAlert className="w-16 h-16 text-red-500/30 mb-4" />
                <h2 className="text-xl font-bold text-red-400">Failed to load confirmation</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-sm">{error || "Could not retrieve details for the table."}</p>
                <button onClick={() => router.push("/rooms/casino/host-lobby")} className="mt-6 px-6 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 font-bold hover:bg-red-500/20 transition-all">
                    Back to Lobby
                </button>
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
                    <div className="flex items-center gap-2">
                        <BrandLogo showBadge={false} />
                        <span className="text-white/40 text-xs font-normal border-l border-white/20 pl-3">Confirmation</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#120824]/80 border border-purple-500/20 px-4 py-2 rounded-2xl">
                        <span className="text-yellow-400 text-sm">🪙</span>
                        <span className="font-mono text-sm font-bold text-yellow-200">{cs()}{walletBalance.toFixed(2)}</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-[700px] mx-auto w-full px-6 py-10 z-10 flex flex-col justify-center">
                <div className="text-center mb-8">
                    <div className="inline-flex w-20 h-20 rounded-full border border-green-400 bg-green-500/10 flex items-center justify-center text-4xl text-green-400 mb-6 shadow-[0_0_20px_rgba(74,222,128,0.2)] animate-pulse">
                        <Check className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                        Table Created Successfully!
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
                        Your table lounge is live. Fans can now join from the PGX Casino featured lobby.
                    </p>
                </div>

                {/* Details Summary Card */}
                <div className="p-6 rounded-3xl border border-purple-500/15 bg-black/40 backdrop-blur-md mb-8">
                    <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-white">{lounge.table_name}</h2>
                            <p className="text-xs text-pink-400 mt-1">Hosted by @{lounge.creator_name}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 border border-green-500/20 text-green-400">
                            {lounge.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                            <span className="text-gray-500 font-semibold uppercase block tracking-wider">Game Type</span>
                            <span className="text-white font-bold block">{lounge.game_type}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-gray-500 font-semibold uppercase block tracking-wider">Stake Limits</span>
                            <span className="text-yellow-300 font-bold font-mono block">{cs()}{lounge.min_bet} - {cs()}{lounge.max_bet}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-gray-500 font-semibold uppercase block tracking-wider">Start Time</span>
                            <span className="text-white block">{new Date(lounge.start_time).toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-gray-500 font-semibold uppercase block tracking-wider">Duration</span>
                            <span className="text-white block">{lounge.duration_minutes} Minutes</span>
                        </div>
                    </div>
                </div>

                {/* Navigation Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => router.push(`/rooms/casino/lounge/${lounge.room_id}`)}
                        className="py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)] active:scale-95 transition-all cursor-pointer"
                    >
                        <span>View My Table</span> <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => router.push("/rooms/casino/host-lobby")}
                        className="py-3.5 rounded-xl border border-purple-500/20 bg-black/40 font-bold uppercase tracking-wider text-xs text-purple-300 hover:bg-purple-950/20 transition-all cursor-pointer"
                    >
                        Back to Lobby
                    </button>
                </div>
            </main>
        </div>
    );
}

export default function CreateConfirmationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#06020a] flex flex-col items-center justify-center text-pink-500 font-bold">
                <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-4" />
                <span>Loading confirmation details...</span>
            </div>
        }>
            <ConfirmationContent />
        </Suspense>
    );
}
