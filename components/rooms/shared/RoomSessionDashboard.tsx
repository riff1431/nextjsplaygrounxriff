"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Play, Plus, ChevronLeft, Clock, Calendar, Loader2, Users,
    TrendingUp, Video, Globe, Lock, StopCircle, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import WalletPill from "@/components/common/WalletPill";
import { useRealtimePresence } from "@/hooks/useRealtimePresence";
import { useAuth } from "@/app/context/AuthContext";
import { cs } from "@/utils/currency";

/* ─────────── Types ─────────── */
interface RoomSession {
    id: string;
    title: string;
    description: string | null;
    session_type: string;
    entry_fee: number;
    cost_per_min: number;
    status: string;
    started_at: string;
    live_started_at: string | null;
    ended_at: string | null;
    room_id: string;
    room_type: string;
    viewer_count: number;
    participant_count?: number;
}

interface RoomSessionDashboardProps {
    roomType: string;
    roomEmoji: string;
    roomLabel: string;
    creatorPageRoute: string;      // e.g. "/rooms/flash-drop-creator"
    accentHsl: string;             // e.g. "280, 80%, 60%"
    accentHslSecondary?: string;   // optional second gradient stop
    backRoute?: string;
    backgroundImage?: string;
    offlinePageRoute?: string;     // e.g. "/creator/rooms/confessions"
    offlineLabel?: string;         // e.g. "Manage Wall Offline"
    offlineDescription?: string;   // e.g. "Add to your permanent collection without broadcasting"
    onSessionStarted?: (session: RoomSession) => void;
    className?: string;
    logoNode?: React.ReactNode;
    roomIcon?: string;
}

/* ─────────── Helpers ─────────── */
function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return (
        d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " · " +
        d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    );
}

/** Mini component so each active session card can use its own presence hook */
function LiveViewerBadge({ roomId }: { roomId: string }) {
    const { count } = useRealtimePresence(roomId);
    if (count === 0) return null;
    return (
        <span
            className="text-xs flex items-center gap-1 ml-2"
            style={{ color: "hsl(150, 80%, 60%)" }}
        >
            <Users className="w-3 h-3" /> {count}
        </span>
    );
}

/* ═══════════════════════════════════════════════════
   RoomSessionDashboard — Reusable creator session
   management: start new session + history + resume
   ═══════════════════════════════════════════════════ */
export default function RoomSessionDashboard({
    roomType,
    roomEmoji,
    roomLabel,
    creatorPageRoute,
    accentHsl,
    accentHslSecondary,
    backRoute = "/rooms/creator-studio",
    backgroundImage,
    offlinePageRoute,
    offlineLabel = "Manage Offline",
    offlineDescription = "Add permanent content without going live",
    onSessionStarted,
    className,
    logoNode,
    roomIcon,
}: RoomSessionDashboardProps) {
    const router = useRouter();
    const supabase = createClient();
    const { user } = useAuth();
    const accent2 = accentHslSecondary || accentHsl;

    /* ── State ── */
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<RoomSession[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [dbSettings, setDbSettings] = useState<any>(null);
    const [sessionForm, setSessionForm] = useState({
        title: "",
        description: "",
        isPrivate: false,
        price: 20,
        costPerMin: 4,
    });

    /* ── Fetch sessions ── */
    const fetchSessions = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/v1/rooms/sessions?room_type=${roomType}&status=all&creator_id=${user.id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSessions(data.sessions || []);
        } catch (err: any) {
            console.error("Fetch sessions error:", err);
        } finally {
            setLoading(false);
        }
    }, [roomType, user]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Fetch dynamic room settings from DB
    useEffect(() => {
        async function fetchSettings() {
            try {
                const { data, error } = await supabase
                    .from("room_settings")
                    .select("*")
                    .eq("room_type", roomType)
                    .single();
                if (data && !error) {
                    setDbSettings(data);
                    
                    const isPrivateDefault = data.public_sessions_enabled === false && data.private_sessions_enabled !== false;
                    
                    setSessionForm(prev => ({
                        ...prev,
                        isPrivate: isPrivateDefault,
                        price: isPrivateDefault ? (data.min_private_entry_fee ?? 20) : (data.public_entry_fee ?? 10),
                        costPerMin: data.min_private_cost_per_min ?? 4,
                    }));
                }
            } catch (err) {
                console.error("Fetch room settings error:", err);
            }
        }
        fetchSettings();
    }, [roomType, supabase]);

    /* ── Derived ── */
    const activeSessions = sessions.filter((s) => s.status === "active");
    const pastSessions = sessions.filter((s) => s.status !== "active");

    /* ── Create session ── */
    async function handleStartSession() {
        if (!sessionForm.title.trim()) return;
        setIsCreating(true);
        try {
            const minPrivateFee = dbSettings ? Number(dbSettings.min_private_entry_fee) : 20;
            const publicFee = dbSettings ? Number(dbSettings.public_entry_fee) : 10;
            const finalPrice = sessionForm.isPrivate ? Math.max(minPrivateFee, Number(sessionForm.price)) : publicFee;
            
            const minCostPerMin = dbSettings ? Number(dbSettings.min_private_cost_per_min) : 4;
            const finalCostPerMin = sessionForm.isPrivate ? Math.max(minCostPerMin, Number(sessionForm.costPerMin)) : 0;

            const res = await fetch("/api/v1/rooms/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    room_type: roomType,
                    title: sessionForm.title.trim(),
                    description: sessionForm.description || undefined,
                    session_type: sessionForm.isPrivate ? "private" : "public",
                    price: finalPrice,
                    cost_per_min: finalCostPerMin,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(`"${sessionForm.title}" is now live! ${roomEmoji}`);
            onSessionStarted?.(data.session);
            router.push(creatorPageRoute + `?sessionId=${data.session.id}`);
        } catch (err: any) {
            toast.error("Failed to start session: " + err.message);
        } finally {
            setIsCreating(false);
        }
    }

    /* ── End session ── */
    async function handleEndSession(sessionId: string) {
        try {
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, {
                method: "POST",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            toast.success("Session ended.");
            setSessions((prev) =>
                prev.map((s) => (s.id === sessionId ? { ...s, status: "ended" } : s))
            );
        } catch (err: any) {
            toast.error(err.message);
        }
    }

    /* ── Resume session ── */
    function handleResume(session: RoomSession) {
        router.push(creatorPageRoute + `?sessionId=${session.id}`);
    }

    /* ── CSS helpers ── */
    const accentColor = `hsl(${accentHsl})`;
    const accentBg = `hsla(${accentHsl}, 0.15)`;
    const accentBorder = `hsla(${accentHsl}, 0.3)`;
    const accentGlow = `0 0 20px hsla(${accentHsl}, 0.15)`;
    const accentGradient = `linear-gradient(135deg, hsl(${accentHsl}), hsl(${accent2}))`;

    /* ──────────────────── RENDER ──────────────────── */
    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center relative"
                style={{
                    backgroundImage: backgroundImage ? `url('${backgroundImage}')` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: "hsl(270, 40%, 6%)",
                }}
            >
                {backgroundImage && <div className="absolute inset-0 bg-black/70" />}
                <Loader2
                    className="w-8 h-8 animate-spin relative z-10"
                    style={{ color: accentColor }}
                />
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen relative ${className || ""}`}
            style={{
                backgroundImage: backgroundImage ? `url('${backgroundImage}')` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
                backgroundColor: "hsl(270, 40%, 6%)",
                color: "#fff",
                fontFamily: "'Inter', sans-serif",
            }}
        >
            {backgroundImage && <div className="absolute inset-0 bg-black/75" />}

            <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {/* ── Header ── */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-10">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <button
                            onClick={() => router.push(backRoute)}
                            className="px-2.5 sm:px-3 py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 text-sm font-medium transition-colors hover:bg-white/10 shrink-0"
                            style={{
                                background: "rgba(255,255,255,0.04)",
                                border: `1px solid ${accentBorder}`,
                                color: accentColor,
                            }}
                        >
                            <ChevronLeft className="w-[18px] h-[18px]" />
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        {logoNode ? (
                            <div className="min-w-0 flex items-center">
                                {logoNode}
                            </div>
                        ) : (
                            <div className="min-w-0">
                                <h1
                                    className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3"
                                    style={{
                                        color: accentColor,
                                        textShadow: `0 0 20px hsla(${accentHsl}, 0.4)`,
                                    }}
                                >
                                    {roomIcon ? (
                                        <img 
                                            src={roomIcon} 
                                            alt={roomLabel}
                                            className={roomType === "flash-drop" ? "w-[70px] h-[70px] object-contain shrink-0" : "w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0"} 
                                        />
                                    ) : (
                                        <span className="text-2xl sm:text-3xl shrink-0">{roomEmoji}</span>
                                    )}
                                    <span className="truncate">{roomLabel}</span>
                                </h1>
                                <p
                                    className="text-xs sm:text-sm mt-0.5 sm:mt-1"
                                    style={{ color: `hsla(${accentHsl}, 0.6)` }}
                                >
                                    Manage your live sessions
                                </p>
                            </div>
                        )}
                    </div>
                    <WalletPill />
                </div>

                {/* ── Start New Session ── */}
                {!showForm ? (
                    <>
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full group relative overflow-hidden rounded-2xl p-5 sm:p-8 flex items-center gap-4 sm:gap-6 transition-all mb-4 sm:mb-8 hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                            background: "hsla(270, 40%, 12%, 0.6)",
                            border: `2px dashed ${accentBorder}`,
                        }}
                    >
                        <div
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                            style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                        >
                            <Plus className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: accentColor }} />
                        </div>
                        <div className="text-left min-w-0">
                            <div className="text-base sm:text-xl font-bold text-white">
                                Start New Session
                            </div>
                            <div className="text-xs sm:text-sm mt-0.5 sm:mt-1" style={{ color: "hsl(280, 15%, 60%)" }}>
                                Create a new {roomLabel} session and go live
                            </div>
                        </div>
                    </button>
                    {offlinePageRoute && (
                        <button
                            onClick={() => router.push(offlinePageRoute)}
                            className="w-full group relative overflow-hidden rounded-2xl p-5 sm:p-8 flex items-center gap-4 sm:gap-6 transition-all mb-4 sm:mb-8 hover:scale-[1.01] active:scale-[0.99]"
                            style={{
                                background: "hsla(270, 40%, 12%, 0.6)",
                                border: `2px dashed ${accentBorder}`,
                            }}
                        >
                            <div
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                            >
                                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: accentColor }} />
                            </div>
                            <div className="text-left min-w-0">
                                <div className="text-base sm:text-xl font-bold text-white">
                                    {offlineLabel}
                                </div>
                                <div className="text-xs sm:text-sm mt-0.5 sm:mt-1" style={{ color: "hsl(280, 15%, 60%)" }}>
                                    {offlineDescription}
                                </div>
                            </div>
                        </button>
                    )}
                    </>
                ) : (
                    <div
                        className="w-full rounded-2xl p-4 sm:p-6 mb-4 sm:mb-8"
                        style={{
                            background: "hsla(270, 40%, 12%, 0.8)",
                            border: `1px solid ${accentBorder}`,
                            boxShadow: accentGlow,
                        }}
                    >
                        <div className="flex items-center gap-3 mb-4 sm:mb-5">
                            <Video className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
                            <h2 className="text-base sm:text-lg font-bold text-white">New Session</h2>
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                            {/* Title */}
                            <div>
                                <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">
                                    Session Title
                                </label>
                                <input
                                    autoFocus
                                    value={sessionForm.title}
                                    onChange={(e) =>
                                        setSessionForm({ ...sessionForm, title: e.target.value })
                                    }
                                    placeholder={`e.g. Late Night ${roomLabel} 🔥`}
                                    className="w-full rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 text-white placeholder-gray-500 focus:outline-none text-sm"
                                    style={{
                                        background: "hsla(270, 30%, 18%, 0.5)",
                                        border: `1px solid hsla(280, 40%, 35%, 0.4)`,
                                    }}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">
                                    Description (optional)
                                </label>
                                <textarea
                                    value={sessionForm.description}
                                    onChange={(e) =>
                                        setSessionForm({ ...sessionForm, description: e.target.value })
                                    }
                                    placeholder="Tell fans what to expect..."
                                    className="w-full rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 text-white placeholder-gray-500 focus:outline-none text-sm h-20 resize-none"
                                    style={{
                                        background: "hsla(270, 30%, 18%, 0.5)",
                                        border: "1px solid hsla(280, 40%, 35%, 0.4)",
                                    }}
                                />
                            </div>

                            {/* Session Type Toggle */}
                            <div>
                                <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1.5 block">
                                    Session Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(dbSettings === null || dbSettings.public_sessions_enabled !== false) && (
                                        <button
                                            onClick={() =>
                                                setSessionForm({ ...sessionForm, isPrivate: false, price: dbSettings ? Number(dbSettings.public_entry_fee) : 10 })
                                            }
                                            className={`py-3 rounded-lg text-sm font-bold transition border flex items-center justify-center gap-2 ${!sessionForm.isPrivate
                                                    ? "bg-green-500/20 border-green-500/50 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                                }`}
                                        >
                                            <Globe className="w-4 h-4" /> Public
                                        </button>
                                    )}
                                    {(dbSettings === null || dbSettings.private_sessions_enabled !== false) && (
                                        <button
                                            onClick={() => {
                                                const minPrivateFee = dbSettings ? Number(dbSettings.min_private_entry_fee) : 20;
                                                setSessionForm({
                                                    ...sessionForm,
                                                    isPrivate: true,
                                                    price: Math.max(minPrivateFee, sessionForm.price),
                                                });
                                            }}
                                            className={`py-3 rounded-lg text-sm font-bold transition border flex items-center justify-center gap-2 ${sessionForm.isPrivate
                                                    ? "bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                                }`}
                                        >
                                            <Lock className="w-4 h-4" /> Private
                                        </button>
                                    )}
                                </div>
                                {sessionForm.isPrivate && (
                                    <p className="text-[10px] text-white/30 mt-1 px-1">
                                        Fans must request access. You approve or decline each request.
                                    </p>
                                )}
                            </div>

                            {/* Private-only fields */}
                            {sessionForm.isPrivate && (
                                <>
                                    <div>
                                        <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">
                                            Fan Entry Price ({cs()})
                                        </label>
                                        <input
                                            type="number"
                                            value={sessionForm.price}
                                            min={dbSettings ? Number(dbSettings.min_private_entry_fee) : 20}
                                            onChange={(e) => {
                                                const minFee = dbSettings ? Number(dbSettings.min_private_entry_fee) : 20;
                                                setSessionForm({
                                                    ...sessionForm,
                                                    price: Math.max(minFee, Number(e.target.value)),
                                                });
                                            }}
                                            className="w-full rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 text-white focus:outline-none text-sm"
                                            style={{
                                                background: "hsla(270, 30%, 18%, 0.5)",
                                                border: "1px solid hsla(280, 40%, 35%, 0.4)",
                                            }}
                                        />
                                        <p className="text-[10px] text-white/30 mt-1 px-1">
                                            Minimum {cs()}{dbSettings ? Number(dbSettings.min_private_entry_fee) : 20}. Fans pay this to join your private session.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/60 font-semibold uppercase tracking-wider mb-1 block">
                                            Cost Per Min ({cs()})
                                        </label>
                                        <input
                                            type="number"
                                            value={sessionForm.costPerMin}
                                            min={dbSettings ? Number(dbSettings.min_private_cost_per_min) : 4}
                                            onChange={(e) => {
                                                const minCost = dbSettings ? Number(dbSettings.min_private_cost_per_min) : 4;
                                                setSessionForm({
                                                    ...sessionForm,
                                                    costPerMin: Math.max(minCost, Number(e.target.value)),
                                                });
                                            }}
                                            className="w-full rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 text-white focus:outline-none text-sm"
                                            style={{
                                                background: "hsla(270, 30%, 18%, 0.5)",
                                                border: "1px solid hsla(280, 40%, 35%, 0.4)",
                                            }}
                                        />
                                        <p className="text-[10px] text-white/30 mt-1 px-1">
                                            Minimum {cs()}{dbSettings ? Number(dbSettings.min_private_cost_per_min) : 4}. Fans are charged per minute in your private session.
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-1">
                                <button
                                    onClick={() => {
                                        setShowForm(false);
                                        setSessionForm({
                                            title: "",
                                            description: "",
                                            isPrivate: false,
                                            price: 20,
                                            costPerMin: 4,
                                        });
                                    }}
                                    className="flex-1 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors hover:bg-white/5"
                                    style={{
                                        border: "1px solid hsla(280, 40%, 35%, 0.4)",
                                        color: "hsl(280, 15%, 60%)",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartSession}
                                    disabled={!sessionForm.title.trim() || isCreating}
                                    className="flex-1 rounded-xl px-4 py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: accentGradient,
                                        color: "#fff",
                                        boxShadow: `0 0 15px hsla(${accentHsl}, 0.3)`,
                                    }}
                                >
                                    {isCreating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Play className="w-4 h-4" />
                                    )}
                                    Go Live
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Active / Live Sessions ── */}
                {activeSessions.length > 0 && (
                    <div className="mb-4 sm:mb-8">
                        <h2
                            className="text-sm font-bold uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2"
                            style={{ color: accentColor }}
                        >
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Active Sessions
                        </h2>
                        <div className="space-y-3">
                            {activeSessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all"
                                    style={{
                                        background: "hsla(270, 40%, 12%, 0.6)",
                                        border: "1px solid hsla(150, 80%, 45%, 0.3)",
                                        boxShadow: "0 0 20px hsla(150, 80%, 45%, 0.08)",
                                    }}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            {session.live_started_at ? (
                                                <>
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-green-400 text-xs font-medium uppercase tracking-wide">
                                                        Live
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Clock className="w-3 h-3 text-yellow-500" />
                                                    <span className="text-yellow-500 text-xs font-medium uppercase tracking-wide">
                                                        Waiting
                                                    </span>
                                                </>
                                            )}
                                            <span
                                                className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase"
                                                style={{
                                                    background:
                                                        session.session_type === "private"
                                                            ? "rgba(168,85,247,0.15)"
                                                            : "rgba(34,197,94,0.15)",
                                                    color:
                                                        session.session_type === "private"
                                                            ? "#c084fc"
                                                            : "#86efac",
                                                    border: `1px solid ${session.session_type === "private"
                                                            ? "rgba(168,85,247,0.3)"
                                                            : "rgba(34,197,94,0.3)"
                                                        }`,
                                                }}
                                            >
                                                {session.session_type === "private" ? "🔒 Private" : "🌐 Public"}
                                            </span>
                                        </div>
                                        <div className="text-base sm:text-lg font-semibold text-white truncate">
                                            {session.title || "Untitled Session"}
                                        </div>
                                        <div
                                            className="text-xs mt-1 flex flex-wrap items-center gap-1.5"
                                            style={{ color: "hsl(280, 15%, 60%)" }}
                                        >
                                            <Clock className="w-3 h-3" />
                                            Started {formatDate(session.started_at)}
                                            <LiveViewerBadge roomId={session.room_id} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleEndSession(session.id)}
                                            className="flex-1 sm:flex-none rounded-xl px-3 sm:px-4 py-2.5 text-xs font-medium transition-colors hover:bg-red-900/30"
                                            style={{
                                                border: "1px solid hsla(320, 80%, 60%, 0.4)",
                                                color: "hsl(320, 80%, 60%)",
                                            }}
                                        >
                                            End
                                        </button>
                                        <button
                                            onClick={() => handleResume(session)}
                                            className="flex-1 sm:flex-none rounded-xl px-4 sm:px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110"
                                            style={{
                                                background: accentGradient,
                                                color: "#fff",
                                                boxShadow: `0 0 15px hsla(${accentHsl}, 0.3)`,
                                            }}
                                        >
                                            <Play className="w-4 h-4" /> Resume
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Past Sessions History ── */}
                <div className="pb-6">
                    <h2
                        className="text-sm font-bold uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2"
                        style={{ color: "hsl(280, 15%, 60%)" }}
                    >
                        <Calendar className="w-4 h-4" /> Session History
                    </h2>
                    {pastSessions.length === 0 ? (
                        <div
                            className="rounded-2xl p-8 sm:p-10 text-center"
                            style={{
                                background: "hsla(270, 40%, 12%, 0.4)",
                                border: "1px solid hsla(280, 40%, 25%, 0.3)",
                            }}
                        >
                            <Sparkles
                                className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3"
                                style={{ color: "hsl(280, 15%, 40%)" }}
                            />
                            <p style={{ color: "hsl(280, 15%, 50%)" }} className="text-sm">
                                No past sessions yet. Start your first one above!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pastSessions.slice(0, 20).map((session) => (
                                <div
                                    key={session.id}
                                    className="rounded-xl p-3 sm:p-4 flex items-center justify-between gap-2 transition-colors hover:bg-white/5"
                                    style={{
                                        background: "hsla(270, 40%, 12%, 0.3)",
                                        border: "1px solid hsla(280, 40%, 25%, 0.25)",
                                    }}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium text-white/80 truncate text-sm">
                                            {session.title || "Untitled Session"}
                                        </div>
                                        <div
                                            className="text-xs mt-0.5 flex flex-wrap items-center gap-1"
                                            style={{ color: "hsl(280, 15%, 50%)" }}
                                        >
                                            <Clock className="w-3 h-3" />
                                            {formatDate(session.started_at)}
                                            {session.viewer_count > 0 && (
                                                <>
                                                    <span className="mx-0.5">·</span>
                                                    <Users className="w-3 h-3" />
                                                    {session.viewer_count} viewers
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <span
                                        className="text-[10px] px-2 sm:px-2.5 py-1 rounded-full font-medium uppercase tracking-wider shrink-0"
                                        style={{
                                            background: "hsla(280, 40%, 25%, 0.3)",
                                            color: "hsl(280, 15%, 55%)",
                                        }}
                                    >
                                        Ended
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
