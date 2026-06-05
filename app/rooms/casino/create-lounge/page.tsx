"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Loader2, Save, Calendar, Landmark, Settings, Flame } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import BrandLogo from "@/components/common/BrandLogo";
import { cs } from "@/utils/currency";

const getRoomTypeLabel = (type: string) => {
    switch (type) {
        case "x-chat": return "X-Chat";
        case "suga4u":
        case "suga-4-u": return "Suga 4 U";
        case "flash-drop": return "Flash Drop";
        case "confessions":
        case "confession": return "Confession";
        case "truth-or-dare": return "Truth or Dare";
        case "bar-lounge": return "Bar Lounge";
        default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
};

interface ActiveSession {
    id: string;
    room_type: string;
    title: string;
}

export default function CreateCasinoLoungePage() {
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const { balance: walletBalance } = useWallet();
    const supabase = createClient();

    const [submitting, setSubmitting] = useState(false);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);

    // Form fields
    const [tableName, setTableName] = useState("");
    const [gameId, setGameId] = useState("");
    const [minBet, setMinBet] = useState("20");
    const [maxBet, setMaxBet] = useState("10000");
    const [startTime, setStartTime] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("60");
    const [description, setDescription] = useState("");
    const [vipOnly, setVipOnly] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || role !== "creator")) {
            router.push("/rooms/casino");
        }
    }, [user, role, authLoading, router]);

    // Set default start time to now
    useEffect(() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setStartTime(now.toISOString().slice(0, 16));
    }, []);

    // Fetch active room sessions
    useEffect(() => {
        if (!user) return;
        const fetchActiveSessions = async () => {
            try {
                const res = await fetch(`/api/v1/rooms/sessions?status=active&creator_id=${user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    // Filter out casino itself to avoid recursive loops
                    const filtered = (data.sessions || []).filter((s: ActiveSession) => s.room_type !== "casino");
                    setActiveSessions(filtered);
                    if (filtered.length > 0) {
                        setGameId(filtered[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch active sessions:", err);
            } finally {
                setLoadingSessions(false);
            }
        };
        fetchActiveSessions();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tableName.trim()) {
            toast.error("Table name is required!");
            return;
        }

        const selectedSession = activeSessions.find(s => s.id === gameId);
        if (!selectedSession) {
            toast.error("Please select an active session.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/v1/rooms/casino/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tableName,
                    gameType: getRoomTypeLabel(selectedSession.room_type),
                    casinoGameId: selectedSession.id,
                    minBet: Number(minBet),
                    maxBet: Number(maxBet),
                    startTime: new Date(startTime).toISOString(),
                    durationMinutes: Number(durationMinutes),
                    description,
                    vipOnly,
                    coverImageUrl: `/casino/cover-${selectedSession.room_type}.png`
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create lounge");

            toast.success("Casino Table Lounge created successfully!");
            
            // Redirect to confirmation screen, passing details as state or query params
            router.push(`/rooms/casino/create-confirmation?loungeId=${data.lounge.id}`);
        } catch (err) {
            console.error("Create lounge failed:", err);
            const errorMsg = err instanceof Error ? err.message : "Something went wrong";
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#06020a] flex items-center justify-center text-pink-500 font-bold">
                <Loader2 className="w-8 h-8 animate-spin text-pink-500 mr-2" /> Loading Setup...
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
                    <button onClick={() => router.push("/rooms/casino/host-lobby")} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-500/20 bg-black/40 text-purple-300 hover:bg-purple-950/20 transition-all text-xs font-semibold">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Lobby
                    </button>
                    <div className="flex items-center gap-2">
                        <BrandLogo showBadge={false} />
                        <span className="text-white/40 text-xs font-normal border-l border-white/20 pl-3">Create Table</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#120824]/80 border border-purple-500/20 px-4 py-2 rounded-2xl">
                        <span className="text-yellow-400 text-sm">🪙</span>
                        <span className="font-mono text-sm font-bold text-yellow-200">{cs()}{walletBalance.toFixed(2)}</span>
                    </div>
                </div>
            </header>

            {/* Main Form Container */}
            <main className="flex-1 max-w-[800px] mx-auto w-full px-6 py-10 z-10">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black uppercase tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
                        Create Live Table Lounge
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Configure stakes, select a game table, and invite fans to your live session.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 rounded-3xl border border-purple-500/15 bg-black/40 backdrop-blur-md space-y-6">
                    {/* Table Name */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">Table Name</label>
                        <input
                            type="text"
                            required
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            placeholder="e.g. Sophia's High Rollers Club"
                            className="w-full px-4 py-3 bg-[#0f071a] border border-purple-500/20 rounded-xl text-sm placeholder-white/20 outline-none focus:border-pink-500/50 transition"
                        />
                    </div>

                    {/* Game Selection */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">Select Active Room Session</label>
                        {loadingSessions ? (
                            <div className="flex items-center gap-2 text-white/50 text-sm py-4">
                                <Loader2 className="w-4 h-4 animate-spin text-pink-500" /> Loading active sessions...
                            </div>
                        ) : activeSessions.length === 0 ? (
                            <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-center">
                                <p className="text-red-400 text-sm font-semibold">⚠️ No active room sessions found!</p>
                                <p className="text-gray-400 text-xs mt-1">
                                    You must first start a session (e.g., X-Chat, Suga 4 U) in the Creator Studio before you can link it to a Casino Lounge.
                                </p>
                                <Link 
                                    href="/rooms/creator-studio" 
                                    className="inline-block mt-3 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition"
                                >
                                    Go to Creator Studio
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {activeSessions.map((session) => (
                                    <button
                                        key={session.id}
                                        type="button"
                                        onClick={() => setGameId(session.id)}
                                        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer min-h-[100px] ${
                                            gameId === session.id
                                                ? "border-pink-500 bg-pink-500/10 text-white"
                                                : "border-purple-500/20 bg-[#0f071a] text-gray-400"
                                        }`}
                                    >
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-600/20 text-pink-400 border border-pink-500/30">
                                                {getRoomTypeLabel(session.room_type)}
                                            </span>
                                            <span className="font-bold text-sm block mt-2 text-white">{session.title}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 block leading-tight mt-2">
                                            Session ID: {session.id.substring(0, 8)}...
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stakes Min / Max */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">Min Bet ({cs()})</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={minBet}
                                onChange={(e) => setMinBet(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0f071a] border border-purple-500/20 rounded-xl text-sm outline-none focus:border-pink-500/50 transition font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">Max Bet ({cs()})</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={maxBet}
                                onChange={(e) => setMaxBet(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0f071a] border border-purple-500/20 rounded-xl text-sm outline-none focus:border-pink-500/50 transition font-mono"
                            />
                        </div>
                    </div>

                    {/* Start Time & Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">Start Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0f071a] border border-purple-500/20 rounded-xl text-sm outline-none focus:border-pink-500/50 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">Duration (Minutes)</label>
                            <select
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0f071a] border border-purple-500/20 rounded-xl text-sm outline-none focus:border-pink-500/50 transition"
                            >
                                <option value="30">30 Minutes</option>
                                <option value="60">1 Hour</option>
                                <option value="120">2 Hours</option>
                                <option value="240">4 Hours</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-pink-300 mb-2">Lounge Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell fans what makes this table special..."
                            rows={3}
                            className="w-full px-4 py-3 bg-[#0f071a] border border-purple-500/20 rounded-xl text-sm placeholder-white/20 outline-none focus:border-pink-500/50 transition resize-none"
                        />
                    </div>

                    {/* VIP Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#0f071a] border border-purple-500/10">
                        <div>
                            <span className="block text-sm font-bold text-white">VIP-Only Access</span>
                            <span className="block text-[10px] text-gray-500 mt-0.5">Only subscribers/VIP badge owners can enter.</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={vipOnly}
                            onChange={(e) => setVipOnly(e.target.checked)}
                            className="w-5 h-5 rounded border-purple-500/30 text-pink-600 focus:ring-pink-500 bg-[#0f071a] cursor-pointer"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting || activeSessions.length === 0}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(236,72,153,0.4)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Creating Table...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Create Lounge Table
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
}
