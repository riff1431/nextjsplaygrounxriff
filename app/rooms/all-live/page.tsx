"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Play, Users, Lock, Globe, DollarSign, Clock, ArrowLeft,
    Zap, Loader2, CheckCircle2, XCircle, Flame, Search, RefreshCw, Radio, HelpCircle, Shuffle
} from "lucide-react";
import { toast } from "sonner";
import RoomEntryInfoModal, { isRoomEntryDismissed } from "@/components/rooms/shared/RoomEntryInfoModal";
import CreatorProfileHover from "@/components/shared/CreatorProfileHover";
import { cs } from "@/utils/currency";

/* ─────────── Types ─────────── */
interface Session {
    id: string;
    title: string;
    description: string | null;
    session_type: string;
    is_private: boolean;
    entry_fee: number;
    cost_per_min: number;
    status: string;
    started_at: string;
    live_started_at: string | null;
    creator_id: string;
    room_id: string;
    room_type: string;
    creator?: {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
    participant_count: number;
    user_request_status: string | null;
    user_joined: boolean;
}

/* ─── Room Type Metadata for Dynamic Styling ─── */
const ROOM_TYPE_META: Record<string, { label: string; emoji: string; accentHsl: string; accentHslSecondary: string }> = {
    "flash-drop": {
        label: "Flash Drops",
        emoji: "⚡",
        accentHsl: "330, 100%, 55%", // Bright magenta/pink
        accentHslSecondary: "280, 80%, 60%"
    },
    "confessions": {
        label: "Confessions",
        emoji: "💜",
        accentHsl: "340, 82%, 52%",
        accentHslSecondary: "330, 80%, 60%"
    },
    "x-chat": {
        label: "X Chat",
        emoji: "💬",
        accentHsl: "45, 90%, 55%", // Neon yellow
        accentHslSecondary: "35, 85%, 50%"
    },
    "bar-lounge": {
        label: "Bar Lounge",
        emoji: "🍸",
        accentHsl: "280, 80%, 60%", // Neon purple
        accentHslSecondary: "300, 75%, 50%"
    },
    "truth-or-dare": {
        label: "Truth or Dare",
        emoji: "🎭",
        accentHsl: "142, 70%, 45%", // Emerald
        accentHslSecondary: "160, 60%, 50%"
    },
    "suga-4-u": {
        label: "Suga 4 U",
        emoji: "🍬",
        accentHsl: "340, 75%, 55%",
        accentHslSecondary: "320, 70%, 50%"
    },
    "casino": {
        label: "Casino",
        emoji: "🎰",
        accentHsl: "45, 100%, 50%", // Gold
        accentHslSecondary: "35, 90%, 45%"
    }
};

/* ─────────── Time Ago Formatter ─────────── */
function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

/* ─────────── Fan Page Route Helper ─────────── */
function getFanPageRoute(roomType: string) {
    switch (roomType) {
        case "flash-drop":
            return "/rooms/flash-drop";
        case "confessions":
            return "/rooms/confessions";
        case "x-chat":
            return "/rooms/x-chat";
        case "bar-lounge":
            return "/rooms/bar-lounge";
        case "truth-or-dare":
            return "/rooms/truth-or-dare";
        case "suga-4-u":
            return "/rooms/suga4u";
        case "casino":
            return "/rooms/casino";
        default:
            return `/rooms/${roomType}`;
    }
}

export default function AllLiveRoomsBrowse() {
    const router = useRouter();
    const supabase = createClient();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRoomType, setSelectedRoomType] = useState<string>("all");
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [showEntryInfo, setShowEntryInfo] = useState(false);
    const [pendingSession, setPendingSession] = useState<Session | null>(null);

    /* ── Auth ── */
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    }, []);

    /* ── Fetch sessions ── */
    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/rooms/sessions/browse");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSessions(data.sessions || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    /* ── Realtime & Polling ── */
    useEffect(() => {
        const channel = supabase
            .channel("browse_all_sessions")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "room_sessions",
            }, () => {
                fetchSessions();
            })
            .subscribe();

        const interval = setInterval(() => {
            fetchSessions();
        }, 20000);

        return () => { 
            supabase.removeChannel(channel); 
            clearInterval(interval);
        };
    }, [fetchSessions]);

    /* ── Join ── */
    async function handleJoin(session: Session) {
        if (!user) {
            toast.error("Please sign in to join a session.");
            router.push("/login");
            return;
        }

        const fanPageRoute = getFanPageRoute(session.room_type);

        if (session.user_joined) {
            router.push(`${fanPageRoute}?roomId=${session.room_id}&sessionId=${session.id}`);
            return;
        }

        setJoiningSessionId(session.id);
        try {
            const res = await fetch(`/api/v1/rooms/sessions/${session.id}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.already_joined) {
                    router.push(`${fanPageRoute}?roomId=${session.room_id}&sessionId=${session.id}`);
                    return;
                }
                throw new Error(data.error);
            }

            toast.success(data.message || "Joined successfully!");
            router.push(`${fanPageRoute}?roomId=${session.room_id}&sessionId=${session.id}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to join session.");
        } finally {
            setJoiningSessionId(null);
        }
    }

    /* ── Entry Info Intercept ── */
    function interceptJoin(session: Session) {
        if (isRoomEntryDismissed(session.room_type)) {
            handleJoin(session);
            return;
        }
        setPendingSession(session);
        setShowEntryInfo(true);
    }

    /* ── Filter & Search Logic ── */
    const filteredSessions = useMemo(() => {
        return sessions.filter((s) => {
            // Room type filter
            if (selectedRoomType !== "all" && s.room_type !== selectedRoomType) return false;

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const titleMatch = s.title.toLowerCase().includes(query);
                const creatorMatch = (s.creator?.full_name || s.creator?.username || "")
                    .toLowerCase()
                    .includes(query);
                const descMatch = (s.description || "").toLowerCase().includes(query);
                return titleMatch || creatorMatch || descMatch;
            }

            return true;
        });
    }, [sessions, selectedRoomType, searchQuery]);

    /* ── Pick Random Room Feature ── */
    const handlePickRandom = () => {
        if (filteredSessions.length === 0) {
            toast.error("No active rooms match your current filters.");
            return;
        }
        const randomIndex = Math.floor(Math.random() * filteredSessions.length);
        const randomSession = filteredSessions[randomIndex];
        toast.info(`Selected room: "${randomSession.title}"! Entering...`);
        interceptJoin(randomSession);
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundImage: "linear-gradient(to bottom, rgba(13,4,21,0.95), rgba(20,5,35,0.90)), url('/images/all-live-bg.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
                color: "#fff",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Animated background neon orbs */}
            <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
                <div
                    style={{
                        position: "absolute", top: "-10%", left: "20%",
                        width: "600px", height: "600px",
                        background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 60%)",
                        borderRadius: "50%",
                        animation: "allLiveBgFloat1 22s ease-in-out infinite",
                    }}
                />
                <div
                    style={{
                        position: "absolute", bottom: "-15%", right: "15%",
                        width: "500px", height: "500px",
                        background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 60%)",
                        borderRadius: "50%",
                        animation: "allLiveBgFloat2 28s ease-in-out infinite",
                    }}
                />
            </div>

            {/* Header */}
            <header
                style={{
                    position: "sticky", top: 0, zIndex: 50,
                    background: "rgba(13,4,21,0.85)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    borderBottom: "1px solid rgba(59, 130, 246, 0.15)",
                    boxShadow: "0 4px 30px rgba(59, 130, 246, 0.04)",
                }}
            >
                <div
                    style={{
                        maxWidth: "1400px", margin: "0 auto", padding: "16px 24px",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: "16px", flexWrap: "wrap",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <button
                            onClick={() => router.back()}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                padding: "8px 14px", borderRadius: "12px",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                                color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 500,
                                cursor: "pointer", transition: "all 0.2s ease",
                            }}
                        >
                            <ArrowLeft style={{ width: 16, height: 16 }} /> Back
                        </button>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <Radio 
                                    style={{ 
                                        width: "28px", 
                                        height: "28px", 
                                        color: "#3b82f6",
                                        filter: "drop-shadow(0 0 5px rgba(59,130,246,0.6))" 
                                    }} 
                                />
                                <h1
                                    style={{
                                        fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 800,
                                        background: "linear-gradient(135deg, #fff 0%, #3b82f6 100%)",
                                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                        letterSpacing: "-0.02em", margin: 0,
                                    }}
                                >
                                    All Live Rooms
                                </h1>
                            </div>
                            <p style={{ fontSize: "12px", color: "rgba(156,163,175,0.8)", margin: "2px 0 0 36px", letterSpacing: "0.5px" }}>
                                Combined active sessions • Find and choose your vibe
                            </p>
                        </div>
                    </div>

                    {/* Search, Random & Live Counter */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <Search style={{ position: "absolute", left: "12px", width: 14, height: 14, color: "rgba(59,130,246,0.5)" }} />
                            <input
                                type="text"
                                placeholder="Search creator or room..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: "8px 12px 8px 34px", borderRadius: "10px",
                                    background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.25)",
                                    color: "#fff", fontSize: "13px", outline: "none",
                                    width: "200px", transition: "all 0.3s ease",
                                }}
                            />
                        </div>

                        {/* Pick Random Button */}
                        <button
                            onClick={handlePickRandom}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "8px",
                                padding: "8px 16px", borderRadius: "10px",
                                background: "linear-gradient(135deg, rgba(236,72,153,0.9), rgba(59,130,246,0.9))",
                                border: "1px solid rgba(255,255,255,0.15)",
                                boxShadow: "0 0 15px rgba(236,72,153,0.25), 0 0 30px rgba(59,130,246,0.15)",
                                color: "#fff", fontSize: "13px", fontWeight: 700,
                                cursor: "pointer", transition: "transform 0.2s ease, hover 0.2s ease",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        >
                            <Shuffle style={{ width: 14, height: 14 }} /> Choose Randomly
                        </button>

                        <div
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                padding: "6px 14px", borderRadius: "20px",
                                background: "rgba(59,130,246,0.12)",
                                border: "1px solid rgba(59,130,246,0.30)",
                                boxShadow: "0 0 20px rgba(59,130,246,0.1)",
                            }}
                        >
                            {sessions.length > 0 && (
                                <span
                                    style={{
                                        width: 7, height: 7, borderRadius: "50%",
                                        background: "#3b82f6",
                                        boxShadow: "0 0 10px #3b82f6",
                                        animation: "allLivePulse 1.5s ease-in-out infinite",
                                    }}
                                />
                            )}
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#93c5fd", letterSpacing: "0.5px" }}>
                                {sessions.length} LIVE SESSIONS
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Filters Navigation (Room Type Pills) */}
            <div className="max-w-[1400px] mx-auto px-6 pt-6">
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px" }} className="custom-scrollbar">
                    <button
                        onClick={() => setSelectedRoomType("all")}
                        style={{
                            padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
                            background: selectedRoomType === "all" ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.04)",
                            border: selectedRoomType === "all" ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                            color: selectedRoomType === "all" ? "#93c5fd" : "rgba(255,255,255,0.6)",
                            cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap"
                        }}
                    >
                        🌐 All Rooms
                    </button>
                    {Object.entries(ROOM_TYPE_META).map(([typeKey, meta]) => (
                        <button
                            key={typeKey}
                            onClick={() => setSelectedRoomType(typeKey)}
                            style={{
                                padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 700,
                                background: selectedRoomType === typeKey ? `hsla(${meta.accentHsl}, 0.2)` : "rgba(255,255,255,0.04)",
                                border: selectedRoomType === typeKey ? `1px solid hsla(${meta.accentHsl}, 0.45)` : "1px solid rgba(255,255,255,0.08)",
                                color: selectedRoomType === typeKey ? `hsl(${meta.accentHsl})` : "rgba(255,255,255,0.6)",
                                cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap"
                            }}
                        >
                            {meta.emoji} {meta.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <main style={{ position: "relative", zIndex: 1, maxWidth: "1400px", margin: "0 auto", padding: "16px 24px 64px" }}>
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 20px", gap: "20px" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "20px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Loader2 style={{ width: 28, height: 28, color: "#3b82f6", animation: "spin 1s linear infinite" }} />
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <p style={{ fontSize: "16px", fontWeight: 600, color: "#93c5fd", margin: "0 0 4px" }}>Retrieving live rooms...</p>
                            <p style={{ fontSize: "13px", color: "rgba(156,163,175,0.6)" }}>Scanning platform nodes...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 20px", gap: "16px" }}>
                        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(225,29,72,0.15)", border: "1px solid rgba(225,29,72,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <XCircle style={{ width: 32, height: 32, color: "#fb7185" }} />
                        </div>
                        <p style={{ fontSize: "16px", fontWeight: 600, color: "#fb7185" }}>Failed to load live sessions</p>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", maxWidth: 400, textAlign: "center" }}>{error}</p>
                        <button onClick={fetchSessions} style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", padding: "10px 24px", borderRadius: "12px", background: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.2)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                            <RefreshCw style={{ width: 14, height: 14 }} /> Retry
                        </button>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", gap: "20px" }}>
                        <div style={{ position: "relative", width: 100, height: 100, borderRadius: "32px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: "48px" }}>📡</span>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                                {searchQuery ? "No Signal Found" : "No Active Rooms"}
                            </h2>
                            <p style={{ fontSize: "14px", color: "rgba(156,163,175,0.6)", maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
                                {searchQuery
                                    ? `No active sessions match "${searchQuery}".`
                                    : "There are no active sessions at the moment. Check back in a few minutes!"}
                            </p>
                        </div>
                        {!searchQuery && (
                            <button
                                onClick={fetchSessions}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "8px",
                                    marginTop: "8px", padding: "12px 28px", borderRadius: "14px",
                                    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)",
                                    boxShadow: "0 0 15px rgba(59,130,246,0.1)", color: "#93c5fd",
                                    fontSize: "14px", fontWeight: 600, cursor: "pointer",
                                }}
                            >
                                <RefreshCw style={{ width: 15, height: 15 }} /> Refresh list
                            </button>
                        )}
                    </div>
                ) : (
                    /* Sessions Grid */
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredSessions.map((session) => {
                            const isHovered = hoveredCard === session.id;
                            const price = Number(session.entry_fee) || 0;
                            const creatorName = session.creator?.full_name || session.creator?.username || "Creator";

                            // Get metadata for styling card specific to its room type
                            const meta = ROOM_TYPE_META[session.room_type] || {
                                label: "Room",
                                emoji: "📺",
                                accentHsl: "340, 75%, 55%",
                                accentHslSecondary: "320, 70%, 50%"
                            };

                            const accentColor = `hsl(${meta.accentHsl})`;
                            const accentLight = `hsla(${meta.accentHsl}, 0.6)`;
                            const accentBg = `hsla(${meta.accentHsl}, 0.15)`;
                            const accentBorder = `hsla(${meta.accentHsl}, 0.3)`;
                            const accentGlow = `0 0 20px hsla(${meta.accentHsl}, 0.2)`;
                            const accentGradient = `linear-gradient(135deg, hsl(${meta.accentHsl}), hsl(${meta.accentHslSecondary || meta.accentHsl}))`;

                            return (
                                <div
                                    key={session.id}
                                    onMouseEnter={() => setHoveredCard(session.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    style={{
                                        position: "relative", borderRadius: "14px",
                                        background: isHovered
                                            ? "linear-gradient(145deg, rgba(45,15,55,0.9), rgba(30,10,40,0.95))"
                                            : "linear-gradient(145deg, rgba(20,8,30,0.75), rgba(15,4,22,0.85))",
                                        border: isHovered ? `1px solid ${accentBorder}` : "1px solid rgba(255,255,255,0.06)",
                                        overflow: "hidden",
                                        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                                        transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                                        boxShadow: isHovered ? `0 20px 60px hsla(${meta.accentHsl}, 0.15)` : "0 4px 20px rgba(0,0,0,0.3)",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => interceptJoin(session)}
                                >
                                    {/* Top glow stripe */}
                                    {isHovered && (
                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: accentGradient, boxShadow: `0 0 10px ${accentColor}` }} />
                                    )}

                                    {/* Card Header details */}
                                    <div style={{ padding: "12px 14px 0" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 7px", borderRadius: "6px", background: accentBg, border: `1px solid ${accentBorder}`, fontSize: "8px", fontWeight: 800, color: accentColor, letterSpacing: "1px", textTransform: "uppercase" }}>
                                                    {session.live_started_at ? (
                                                        <>
                                                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: accentColor, boxShadow: `0 0 8px ${accentColor}`, animation: "allLivePulse 1.5s ease-in-out infinite" }} />
                                                            Live
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock style={{ width: 8, height: 8 }} />
                                                            Waiting
                                                        </>
                                                    )}
                                                </span>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "6px", background: session.is_private ? "rgba(168,85,247,0.15)" : `hsla(${meta.accentHslSecondary || meta.accentHsl}, 0.1)`, border: `1px solid ${session.is_private ? "rgba(168,85,247,0.3)" : `hsla(${meta.accentHslSecondary || meta.accentHsl}, 0.2)`}`, fontSize: "8px", fontWeight: 700, color: session.is_private ? "#c084fc" : accentColor, textTransform: "uppercase" }}>
                                                    {session.is_private ? <><Lock style={{ width: 8, height: 8 }} /> Locked</> : <><Globe style={{ width: 8, height: 8 }} /> Open</>}
                                                </span>
                                            </div>
                                            
                                            {/* Room Type Label Badge */}
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "8px", fontWeight: 700, color: "#e5e7eb" }}>
                                                {meta.emoji} {meta.label}
                                            </span>
                                        </div>

                                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: isHovered ? accentColor : "#fff", margin: "0 0 4px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {session.title}
                                        </h3>
                                        <div style={{ minHeight: "32px", marginBottom: "8px" }}>
                                            <p style={{
                                                fontSize: "11px",
                                                color: "rgba(255,255,255,0.5)",
                                                margin: 0,
                                                lineHeight: 1.4,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical"
                                            }}>
                                                {session.description || "No session description provided."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Creator info row */}
                                    <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px", borderTop: `1px solid hsla(${meta.accentHsl}, 0.1)`, borderBottom: `1px solid hsla(${meta.accentHsl}, 0.1)`, background: `hsla(${meta.accentHsl}, 0.04)` }}>
                                        <div style={{ width: 28, height: 28, borderRadius: "8px", background: accentGradient, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, border: `2px solid ${accentBorder}` }}>
                                            {session.creator?.avatar_url ? (
                                                <img src={session.creator.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>{creatorName[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <CreatorProfileHover
                                                creatorId={session.creator_id}
                                                creatorName={creatorName}
                                                avatarUrl={session.creator?.avatar_url}
                                            >
                                                <div style={{ fontSize: "12px", fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "4px" }}>
                                                    {creatorName}
                                                </div>
                                            </CreatorProfileHover>
                                            <div style={{ fontSize: "10px", color: accentLight, marginTop: "1px" }}>{timeAgo(session.started_at)}</div>
                                        </div>
                                        <Flame style={{ width: 13, height: 13, color: isHovered ? accentColor : `hsla(${meta.accentHsl}, 0.3)`, transition: "all 0.3s ease" }} />
                                    </div>

                                    {/* Participant Stats */}
                                    <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: accentLight, fontWeight: 500 }}>
                                            <Users style={{ width: 11, height: 11 }} />
                                            <span>{session.participant_count} viewers</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 800, color: price > 0 ? "#fcd34d" : accentColor }}>
                                            {price > 0 ? <span>{cs()}{price}</span> : <><Zap style={{ width: 11, height: 11 }} /><span>Free</span></>}
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <div style={{ padding: "0 12px 12px" }}>
                                        {session.user_joined ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); interceptJoin(session); }}
                                                style={{ width: "100%", padding: "9px", borderRadius: "10px", border: `1px solid ${accentBorder}`, background: accentGradient, color: "#fff", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: accentGlow, letterSpacing: "0.5px", textTransform: "uppercase" }}
                                            >
                                                <Play style={{ width: 12, height: 12, fill: "#fff" }} /> Enter Room
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); interceptJoin(session); }}
                                                disabled={joiningSessionId === session.id}
                                                style={{
                                                    width: "100%", padding: "9px", borderRadius: "10px",
                                                    border: `1px solid ${accentBorder}`,
                                                    background: session.is_private
                                                        ? "linear-gradient(135deg, rgba(168,85,247,0.8), rgba(147,51,234,0.9))"
                                                        : accentGradient,
                                                    color: "#fff", fontSize: "11px", fontWeight: 800,
                                                    cursor: joiningSessionId === session.id ? "wait" : "pointer",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                    opacity: joiningSessionId === session.id ? 0.7 : 1,
                                                    letterSpacing: "0.5px", textTransform: "uppercase",
                                                    boxShadow: accentGlow,
                                                }}
                                            >
                                                {joiningSessionId === session.id ? (
                                                    <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Joining...</>
                                                ) : session.is_private ? (
                                                    <><Lock style={{ width: 12, height: 12 }} /> Enter Room</>
                                                ) : price > 0 ? (
                                                    <><DollarSign style={{ width: 12, height: 12 }} /> Enter Room</>
                                                ) : (
                                                    <><Zap style={{ width: 12, height: 12, fill: "#fff" }} /> Enter Room</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes allLiveBgFloat1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(25px, 20px); } }
                @keyframes allLiveBgFloat2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-20px, -25px); } }
                @keyframes allLivePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            ` }} />

            {/* Room Entry Info Modal */}
            {pendingSession && (
                <RoomEntryInfoModal
                    isOpen={showEntryInfo}
                    onClose={() => { setShowEntryInfo(false); setPendingSession(null); }}
                    onEnter={() => {
                        setShowEntryInfo(false);
                        handleJoin(pendingSession);
                        setPendingSession(null);
                    }}
                    roomType={pendingSession.room_type}
                    roomLabel={(ROOM_TYPE_META[pendingSession.room_type] || ROOM_TYPE_META["flash-drop"]).label}
                    roomEmoji={(ROOM_TYPE_META[pendingSession.room_type] || ROOM_TYPE_META["flash-drop"]).emoji}
                    accentHsl={(ROOM_TYPE_META[pendingSession.room_type] || ROOM_TYPE_META["flash-drop"]).accentHsl}
                    accentHslSecondary={(ROOM_TYPE_META[pendingSession.room_type] || ROOM_TYPE_META["flash-drop"]).accentHslSecondary}
                    sessionTitle={pendingSession.title}
                    sessionDescription={pendingSession.description || undefined}
                    sessionType={pendingSession.is_private ? "private" : "public"}
                    entryFee={Number(pendingSession.entry_fee) || 0}
                    costPerMin={Number(pendingSession.cost_per_min) || 0}
                />
            )}
        </div>
    );
}
