"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Play, Users, Lock, Globe, DollarSign, Clock, ArrowLeft,
    Zap, Loader2, CheckCircle2, XCircle, Flame, Eye,
    RefreshCw, Search,
} from "lucide-react";
import { toast } from "sonner";
import RoomEntryInfoModal, { isRoomEntryDismissed } from "./RoomEntryInfoModal";

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

interface RoomSessionsBrowseProps {
    roomType: string;
    roomEmoji: string;
    roomLabel: string;
    fanPageRoute: string;          // e.g. "/rooms/flash-drop"
    accentHsl: string;             // primary accent e.g. "280, 80%, 60%"
    accentHslSecondary?: string;
    backRoute?: string;
    backgroundImage?: string;      // optional URL to a bg image
    backgroundOverlay?: string;    // overlay tint, e.g. "rgba(0,0,0,0.55)"
}

/* ─────────── Helpers ─────────── */
function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

/* ═══════════════════════════════════════════════════
   RoomSessionsBrowse — Reusable fan-side active
   sessions browser for any room type
   ═══════════════════════════════════════════════════ */
export default function RoomSessionsBrowse({
    roomType,
    roomEmoji,
    roomLabel,
    fanPageRoute,
    accentHsl,
    accentHslSecondary,
    backRoute,
    backgroundImage,
    backgroundOverlay,
}: RoomSessionsBrowseProps) {
    const router = useRouter();
    const supabase = createClient();
    const accent2 = accentHslSecondary || accentHsl;

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
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
            const res = await fetch(`/api/v1/rooms/sessions/browse?room_type=${roomType}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSessions(data.sessions || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [roomType]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    /* ── Realtime ── */
    useEffect(() => {
        const channel = supabase
            .channel(`browse_sessions_${roomType}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "room_sessions",
            }, () => {
                fetchSessions();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchSessions, roomType]);

    /* ── Join ── */
    async function handleJoin(session: Session) {
        if (!user) {
            toast.error("Please sign in to join a session.");
            router.push("/login");
            return;
        }

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
        // Check if user previously dismissed the modal
        if (isRoomEntryDismissed(roomType)) {
            handleJoin(session);
            return;
        }
        // Show entry info modal
        setPendingSession(session);
        setShowEntryInfo(true);
    }

    /* ── Filter ── */
    const filteredSessions = searchQuery
        ? sessions.filter(
            (s) =>
                s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (s.creator?.full_name || s.creator?.username || "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
        )
        : sessions;

    /* ── CSS helpers ── */
    const accentColor = `hsl(${accentHsl})`;
    const accentLight = `hsla(${accentHsl}, 0.6)`;
    const accentBg = `hsla(${accentHsl}, 0.15)`;
    const accentBorder = `hsla(${accentHsl}, 0.3)`;
    const accentGlow = `0 0 20px hsla(${accentHsl}, 0.2)`;
    const accentGradient = `linear-gradient(135deg, hsl(${accentHsl}), hsl(${accent2}))`;

    /* ──────────────────── RENDER ──────────────────── */
    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundImage: backgroundImage
                    ? `url(${backgroundImage})`
                    : `linear-gradient(to bottom, rgba(13,4,21,0.85), rgba(45,11,63,0.8))`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
                color: "#fff",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Dark overlay for background image readability */}
            {backgroundImage && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: backgroundOverlay || "rgba(0,0,0,0.55)",
                        zIndex: 0,
                        pointerEvents: "none",
                    }}
                />
            )}
            {/* Animated background orbs */}
            <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
                <div
                    style={{
                        position: "absolute", top: "-20%", left: "-10%",
                        width: "600px", height: "600px",
                        background: `radial-gradient(circle, hsla(${accentHsl}, 0.12) 0%, transparent 60%)`,
                        borderRadius: "50%",
                        animation: "todBgFloat1 20s ease-in-out infinite",
                    }}
                />
                <div
                    style={{
                        position: "absolute", bottom: "-20%", right: "-10%",
                        width: "500px", height: "500px",
                        background: `radial-gradient(circle, hsla(${accent2}, 0.1) 0%, transparent 60%)`,
                        borderRadius: "50%",
                        animation: "todBgFloat2 25s ease-in-out infinite",
                    }}
                />
            </div>

            {/* ── Header ── */}
            <header
                style={{
                    position: "sticky", top: 0, zIndex: 50,
                    background: "rgba(13,4,21,0.75)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    borderBottom: `1px solid hsla(${accentHsl}, 0.15)`,
                    boxShadow: `0 4px 30px hsla(${accentHsl}, 0.05)`,
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
                                border: `1px solid ${accentBorder}`,
                                color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 500,
                                cursor: "pointer", transition: "all 0.2s ease",
                            }}
                        >
                            <ArrowLeft style={{ width: 16, height: 16 }} /> Back
                        </button>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "26px", filter: `drop-shadow(0 0 5px ${accentLight})` }}>
                                    {roomEmoji}
                                </span>
                                <h1
                                    style={{
                                        fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 800,
                                        background: `linear-gradient(135deg, #fff 0%, ${accentColor} 100%)`,
                                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                        letterSpacing: "-0.02em", margin: 0,
                                    }}
                                >
                                    {roomLabel}
                                </h1>
                            </div>
                            <p style={{ fontSize: "12px", color: accentLight, margin: "2px 0 0 36px", letterSpacing: "0.5px" }}>
                                Browse live sessions • Join the fun
                            </p>
                        </div>
                    </div>

                    {/* Search + Live Counter */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        {sessions.length > 0 && (
                            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <Search style={{ position: "absolute", left: "12px", width: 14, height: 14, color: accentLight }} />
                                <input
                                    type="text"
                                    placeholder="Search sessions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: "8px 12px 8px 34px", borderRadius: "10px",
                                        background: accentBg, border: `1px solid ${accentBorder}`,
                                        color: "#fff", fontSize: "13px", outline: "none",
                                        width: "180px", transition: "all 0.3s ease",
                                    }}
                                />
                            </div>
                        )}
                        <div
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                padding: "6px 14px", borderRadius: "20px",
                                background: sessions.length > 0 ? accentBg : "rgba(255,255,255,0.04)",
                                border: sessions.length > 0 ? `1px solid ${accentBorder}` : "1px solid rgba(255,255,255,0.08)",
                                boxShadow: sessions.length > 0 ? accentGlow : "none",
                            }}
                        >
                            {sessions.filter(s => s.live_started_at).length > 0 && (
                                <span
                                    style={{
                                        width: 7, height: 7, borderRadius: "50%",
                                        background: accentColor,
                                        boxShadow: `0 0 10px ${accentColor}`,
                                        animation: "todPulsePink 1.5s ease-in-out infinite",
                                    }}
                                />
                            )}
                            <span
                                style={{
                                    fontSize: "12px", fontWeight: 700,
                                    color: sessions.length > 0 ? accentColor : "rgba(255,255,255,0.4)",
                                    letterSpacing: "0.5px",
                                }}
                            >
                                {sessions.filter(s => s.live_started_at).length} LIVE • {sessions.length} ACTIVE
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Content ── */}
            <main style={{ position: "relative", zIndex: 1, maxWidth: "1400px", margin: "0 auto", padding: "32px 24px 64px" }}>
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 20px", gap: "20px" }}>
                        <div style={{ width: 64, height: 64, borderRadius: "20px", background: accentBg, border: `1px solid ${accentBorder}`, boxShadow: accentGlow, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Loader2 style={{ width: 28, height: 28, color: accentColor, animation: "spin 1s linear infinite" }} />
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <p style={{ fontSize: "16px", fontWeight: 600, color: accentColor, margin: "0 0 4px" }}>Finding live sessions...</p>
                            <p style={{ fontSize: "13px", color: accentLight }}>Scanning for active rooms...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 20px", gap: "16px" }}>
                        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(225,29,72,0.15)", border: "1px solid rgba(225,29,72,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <XCircle style={{ width: 32, height: 32, color: "#fb7185" }} />
                        </div>
                        <p style={{ fontSize: "16px", fontWeight: 600, color: "#fb7185" }}>Failed to load sessions</p>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", maxWidth: 400, textAlign: "center" }}>{error}</p>
                        <button onClick={fetchSessions} style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", padding: "10px 24px", borderRadius: "12px", background: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.2)", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                            <RefreshCw style={{ width: 14, height: 14 }} /> Retry
                        </button>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px", gap: "20px" }}>
                        <div style={{ position: "relative", width: 100, height: 100, borderRadius: "32px", background: accentBg, border: `1px solid ${accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: "48px", filter: `drop-shadow(0 0 10px ${accentLight})` }}>{roomEmoji}</span>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                                {searchQuery ? "No Signal Found" : "No Active Sessions"}
                            </h2>
                            <p style={{ fontSize: "14px", color: accentLight, maxWidth: 360, margin: "0 auto", lineHeight: 1.6 }}>
                                {searchQuery
                                    ? `No sessions match "${searchQuery}".`
                                    : `There are no active ${roomLabel} sessions right now. Check back soon!`}
                            </p>
                        </div>
                        {!searchQuery && (
                            <button
                                onClick={fetchSessions}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "8px",
                                    marginTop: "8px", padding: "12px 28px", borderRadius: "14px",
                                    background: accentBg, border: `1px solid ${accentBorder}`,
                                    boxShadow: accentGlow, color: accentColor,
                                    fontSize: "14px", fontWeight: 600, cursor: "pointer",
                                }}
                            >
                                <RefreshCw style={{ width: 15, height: 15 }} /> Refresh
                            </button>
                        )}
                    </div>
                ) : (
                    /* ── Sessions Grid ── */
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: "14px" }}>
                        {filteredSessions.map((session, i) => {
                            const isHovered = hoveredCard === session.id;
                            const price = Number(session.entry_fee) || 0;
                            const creatorName = session.creator?.full_name || session.creator?.username || "Creator";

                            return (
                                <div
                                    key={session.id}
                                    onMouseEnter={() => setHoveredCard(session.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    style={{
                                        position: "relative", borderRadius: "14px",
                                        background: isHovered
                                            ? "linear-gradient(145deg, rgba(45,15,55,0.9), rgba(30,10,40,0.95))"
                                            : "linear-gradient(145deg, rgba(28,10,35,0.7), rgba(20,5,30,0.8))",
                                        border: isHovered ? `1px solid ${accentBorder}` : `1px solid hsla(${accentHsl}, 0.1)`,
                                        overflow: "hidden",
                                        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                                        transform: isHovered ? "translateY(-3px)" : "translateY(0)",
                                        boxShadow: isHovered ? `0 20px 60px hsla(${accentHsl}, 0.15)` : "0 4px 20px rgba(0,0,0,0.3)",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => session.user_joined ? interceptJoin(session) : undefined}
                                >
                                    {/* Glow line on hover */}
                                    {isHovered && (
                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: accentGradient, boxShadow: `0 0 10px ${accentColor}` }} />
                                    )}

                                    {/* Card top */}
                                    <div style={{ padding: "12px 14px 0" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 7px", borderRadius: "6px", background: accentBg, border: `1px solid ${accentBorder}`, fontSize: "8px", fontWeight: 800, color: accentColor, letterSpacing: "1px", textTransform: "uppercase" as const }}>
                                                    {session.live_started_at ? (
                                                        <>
                                                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: accentColor, boxShadow: `0 0 8px ${accentColor}`, animation: "todPulsePink 1.5s ease-in-out infinite" }} />
                                                            Live
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock style={{ width: 8, height: 8 }} />
                                                            Waiting
                                                        </>
                                                    )}
                                                </span>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 6px", borderRadius: "6px", background: session.is_private ? "rgba(168,85,247,0.15)" : `hsla(${accent2}, 0.1)`, border: `1px solid ${session.is_private ? "rgba(168,85,247,0.3)" : `hsla(${accent2}, 0.2)`}`, fontSize: "8px", fontWeight: 700, color: session.is_private ? "#c084fc" : accentColor, textTransform: "uppercase" as const }}>
                                                    {session.is_private ? <><Lock style={{ width: 8, height: 8 }} /> Locked</> : <><Globe style={{ width: 8, height: 8 }} /> Open</>}
                                                </span>
                                            </div>
                                            {session.user_joined && (
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 7px", borderRadius: "6px", background: accentBg, border: `1px solid ${accentBorder}`, fontSize: "8px", fontWeight: 700, color: accentColor, textTransform: "uppercase" as const }}>
                                                    <CheckCircle2 style={{ width: 8, height: 8 }} /> Joined
                                                </span>
                                            )}
                                        </div>
                                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: isHovered ? accentColor : "#fff", margin: "0 0 4px", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                                            {session.title}
                                        </h3>
                                        {session.description && (
                                            <p style={{ fontSize: "11px", color: accentLight, margin: "0 0 8px", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" as const }}>
                                                {session.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Creator row */}
                                    <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px", borderTop: `1px solid hsla(${accentHsl}, 0.1)`, borderBottom: `1px solid hsla(${accentHsl}, 0.1)`, background: `hsla(${accentHsl}, 0.02)` }}>
                                        <div style={{ width: 28, height: 28, borderRadius: "8px", background: accentGradient, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, border: `2px solid ${accentBorder}` }}>
                                            {session.creator?.avatar_url ? (
                                                <img src={session.creator.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>{creatorName[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: "12px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{creatorName}</div>
                                            <div style={{ fontSize: "10px", color: accentLight, marginTop: "1px" }}>{timeAgo(session.started_at)}</div>
                                        </div>
                                        <Flame style={{ width: 13, height: 13, color: isHovered ? accentColor : `hsla(${accentHsl}, 0.3)`, transition: "all 0.3s ease" }} />
                                    </div>

                                    {/* Stats */}
                                    <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: accentLight, fontWeight: 500 }}>
                                            <Users style={{ width: 11, height: 11 }} />
                                            <span>{session.participant_count} viewers</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 800, color: price > 0 ? "#fcd34d" : accentColor }}>
                                            {price > 0 ? <><DollarSign style={{ width: 11, height: 11 }} /><span>€{price}</span></> : <><Zap style={{ width: 11, height: 11 }} /><span>Free Access</span></>}
                                        </div>
                                    </div>

                                    {/* Action Button */}
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
                @keyframes todBgFloat1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, 20px); } }
                @keyframes todBgFloat2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-20px, -30px); } }
                @keyframes todPulsePink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes todCardEntry { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            ` }} />

            {/* ── Room Entry Info Modal ── */}
            <RoomEntryInfoModal
                isOpen={showEntryInfo}
                onClose={() => { setShowEntryInfo(false); setPendingSession(null); }}
                onEnter={() => {
                    setShowEntryInfo(false);
                    if (pendingSession) {
                        handleJoin(pendingSession);
                        setPendingSession(null);
                    }
                }}
                roomType={roomType}
                roomLabel={roomLabel}
                roomEmoji={roomEmoji}
                accentHsl={accentHsl}
                accentHslSecondary={accentHslSecondary}
                sessionTitle={pendingSession?.title}
                sessionDescription={pendingSession?.description || undefined}
                sessionType={pendingSession?.is_private ? "private" : "public"}
                entryFee={pendingSession ? Number(pendingSession.entry_fee) || 0 : undefined}
                costPerMin={pendingSession ? Number(pendingSession.cost_per_min) || 0 : undefined}
            />
        </div>
    );
}
