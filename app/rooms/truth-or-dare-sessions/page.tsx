"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Play,
    Users,
    Lock,
    Globe,
    DollarSign,
    Clock,
    ArrowLeft,
    Zap,
    Loader2,
    CheckCircle2,
    XCircle,
    Send,
    Flame,
    Sparkles,
    Eye,
    RefreshCw,
    Search,
} from "lucide-react";
import { toast } from "sonner";

interface Session {
    id: string;
    title: string;
    description: string | null;
    session_type: string;
    is_private: boolean;
    price: number;
    status: string;
    started_at: string;
    creator_id: string;
    room_id: string;
    creator?: {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
    participant_count: number;
    user_request_status: string | null;
    user_joined: boolean;
}

/* ────── Time Ago Formatter ────── */
function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function TruthOrDareSessionsBrowse() {
    const router = useRouter();
    const supabase = createClient();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    useEffect(() => {
        async function getUser() {
            const { data: { user: u } } = await supabase.auth.getUser();
            setUser(u);
        }
        getUser();
    }, []);

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/rooms/truth-dare-sessions/browse");
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

    // Realtime updates for sessions
    useEffect(() => {
        const channel = supabase
            .channel("browse_sessions")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "truth_dare_sessions",
            }, () => {
                fetchSessions();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchSessions]);

    async function handleJoin(session: Session) {
        if (!user) {
            toast.error("Please sign in to join a session.");
            router.push("/login");
            return;
        }

        if (session.user_joined) {
            router.push(`/rooms/truth-or-dare?roomId=${session.room_id}`);
            return;
        }

        setJoiningSessionId(session.id);
        try {
            const res = await fetch(`/api/v1/rooms/truth-dare-sessions/${session.id}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.already_joined) {
                    router.push(`/rooms/truth-or-dare?roomId=${session.room_id}`);
                    return;
                }
                throw new Error(data.error);
            }

            if (data.status === "pending") {
                toast.success("Join request sent! Waiting for creator approval.");
                setSessions(prev => prev.map(s =>
                    s.id === session.id ? { ...s, user_request_status: "pending" } : s
                ));
            } else if (data.status === "joined") {
                toast.success(data.message || "Joined successfully!");
                router.push(`/rooms/truth-or-dare?roomId=${session.room_id}`);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to join session.");
        } finally {
            setJoiningSessionId(null);
        }
    }

    const filteredSessions = searchQuery
        ? sessions.filter(s =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.creator?.full_name || s.creator?.username || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        : sessions;

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(160deg, #0a0a0f 0%, #0d0821 30%, #120a2e 50%, #0d0821 70%, #0a0a0f 100%)",
            color: "#fff",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Animated background orbs */}
            <div style={{
                position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
            }}>
                <div style={{
                    position: "absolute", top: "-20%", left: "-10%",
                    width: "600px", height: "600px",
                    background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
                    borderRadius: "50%",
                    animation: "todBgFloat1 20s ease-in-out infinite",
                }} />
                <div style={{
                    position: "absolute", bottom: "-20%", right: "-10%",
                    width: "500px", height: "500px",
                    background: "radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)",
                    borderRadius: "50%",
                    animation: "todBgFloat2 25s ease-in-out infinite",
                }} />
                <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    width: "400px", height: "400px",
                    background: "radial-gradient(circle, rgba(34,197,94,0.04) 0%, transparent 70%)",
                    borderRadius: "50%",
                    transform: "translate(-50%, -50%)",
                    animation: "todBgFloat3 15s ease-in-out infinite",
                }} />
            </div>

            {/* Header */}
            <header style={{
                position: "sticky", top: 0, zIndex: 50,
                background: "rgba(10,10,15,0.75)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
                <div style={{
                    maxWidth: "1400px", margin: "0 auto",
                    padding: "16px 24px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: "16px", flexWrap: "wrap",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <button
                            onClick={() => router.back()}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                padding: "8px 14px", borderRadius: "12px",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 500,
                                cursor: "pointer", transition: "all 0.2s ease",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                        >
                            <ArrowLeft style={{ width: 16, height: 16 }} /> Back
                        </button>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "26px" }}>🎭</span>
                                <h1 style={{
                                    fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 800,
                                    background: "linear-gradient(135deg, #fff 0%, #c4b5fd 50%, #f9a8d4 100%)",
                                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                    letterSpacing: "-0.02em", margin: 0,
                                }}>
                                    Truth & Dare
                                </h1>
                            </div>
                            <p style={{
                                fontSize: "12px", color: "rgba(255,255,255,0.35)",
                                margin: "2px 0 0 36px", letterSpacing: "0.5px",
                            }}>
                                Browse live sessions • Join the fun
                            </p>
                        </div>
                    </div>

                    {/* Search + Live Counter */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        {sessions.length > 0 && (
                            <div style={{
                                position: "relative", display: "flex", alignItems: "center",
                            }}>
                                <Search style={{
                                    position: "absolute", left: "12px",
                                    width: 14, height: 14, color: "rgba(255,255,255,0.3)",
                                }} />
                                <input
                                    type="text"
                                    placeholder="Search sessions..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: "8px 12px 8px 34px", borderRadius: "10px",
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                        color: "#fff", fontSize: "13px", outline: "none",
                                        width: "180px", transition: "all 0.3s ease",
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)"; e.currentTarget.style.width = "220px"; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.width = "180px"; }}
                                />
                            </div>
                        )}
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            padding: "6px 14px", borderRadius: "20px",
                            background: sessions.length > 0
                                ? "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))"
                                : "rgba(255,255,255,0.04)",
                            border: sessions.length > 0
                                ? "1px solid rgba(34,197,94,0.25)"
                                : "1px solid rgba(255,255,255,0.08)",
                        }}>
                            {sessions.length > 0 && (
                                <span style={{
                                    width: 7, height: 7, borderRadius: "50%",
                                    background: "#22c55e",
                                    boxShadow: "0 0 8px rgba(34,197,94,0.6)",
                                    animation: "todPulse 2s ease-in-out infinite",
                                }} />
                            )}
                            <span style={{
                                fontSize: "12px", fontWeight: 700,
                                color: sessions.length > 0 ? "#4ade80" : "rgba(255,255,255,0.4)",
                                letterSpacing: "0.5px",
                            }}>
                                {sessions.length} LIVE
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main style={{
                position: "relative", zIndex: 1,
                maxWidth: "1400px", margin: "0 auto",
                padding: "32px 24px 64px",
            }}>
                {loading ? (
                    /* ── Loading State ── */
                    <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", padding: "120px 20px", gap: "20px",
                    }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: "20px",
                            background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            animation: "todPulse 2s ease-in-out infinite",
                        }}>
                            <Loader2 style={{ width: 28, height: 28, color: "#a78bfa", animation: "spin 1s linear infinite" }} />
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <p style={{ fontSize: "16px", fontWeight: 600, color: "rgba(255,255,255,0.7)", margin: "0 0 4px" }}>
                                Finding live sessions...
                            </p>
                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
                                Scanning for active Truth & Dare rooms
                            </p>
                        </div>
                    </div>
                ) : error ? (
                    /* ── Error State ── */
                    <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", padding: "120px 20px", gap: "16px",
                    }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: "50%",
                            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <XCircle style={{ width: 32, height: 32, color: "#f87171" }} />
                        </div>
                        <p style={{ fontSize: "16px", fontWeight: 600, color: "#f87171" }}>Failed to load sessions</p>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", maxWidth: 400, textAlign: "center" }}>{error}</p>
                        <button
                            onClick={fetchSessions}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                marginTop: "8px", padding: "10px 24px", borderRadius: "12px",
                                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                                color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                        >
                            <RefreshCw style={{ width: 14, height: 14 }} /> Try Again
                        </button>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    /* ── Empty State ── */
                    <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "center", padding: "100px 20px", gap: "20px",
                    }}>
                        <div style={{
                            position: "relative",
                            width: 100, height: 100, borderRadius: "32px",
                            background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))",
                            border: "1px solid rgba(139,92,246,0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <span style={{ fontSize: "48px" }}>🎭</span>
                            <div style={{
                                position: "absolute", top: -4, right: -4,
                                width: 24, height: 24, borderRadius: "50%",
                                background: "rgba(100,100,120,0.3)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <span style={{ fontSize: "10px" }}>💤</span>
                            </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{
                                fontSize: "22px", fontWeight: 800, color: "#fff",
                                margin: "0 0 8px", letterSpacing: "-0.02em",
                            }}>
                                {searchQuery ? "No Matching Sessions" : "No Live Sessions"}
                            </h2>
                            <p style={{
                                fontSize: "14px", color: "rgba(255,255,255,0.4)",
                                maxWidth: 360, margin: "0 auto", lineHeight: 1.6,
                            }}>
                                {searchQuery
                                    ? `No sessions match "${searchQuery}". Try a different search.`
                                    : "There are no active Truth or Dare sessions right now. Check back soon for live action!"
                                }
                            </p>
                        </div>
                        {!searchQuery && (
                            <button
                                onClick={fetchSessions}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: "8px",
                                    marginTop: "8px", padding: "12px 28px", borderRadius: "14px",
                                    background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))",
                                    border: "1px solid rgba(139,92,246,0.25)",
                                    color: "#c4b5fd", fontSize: "14px", fontWeight: 600,
                                    cursor: "pointer", transition: "all 0.3s ease",
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.25))";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))";
                                    e.currentTarget.style.transform = "translateY(0)";
                                }}
                            >
                                <RefreshCw style={{ width: 15, height: 15 }} /> Refresh
                            </button>
                        )}
                    </div>
                ) : (
                    /* ── Sessions Grid ── */
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))",
                        gap: "20px",
                    }}>
                        {filteredSessions.map((session, i) => {
                            const isHovered = hoveredCard === session.id;
                            const price = Number(session.price) || 0;
                            const creatorName = session.creator?.full_name || session.creator?.username || "Creator";

                            return (
                                <div
                                    key={session.id}
                                    onMouseEnter={() => setHoveredCard(session.id)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    style={{
                                        position: "relative",
                                        borderRadius: "20px",
                                        background: isHovered
                                            ? "linear-gradient(145deg, rgba(30,20,60,0.9), rgba(20,15,45,0.95))"
                                            : "linear-gradient(145deg, rgba(22,15,45,0.7), rgba(15,12,30,0.8))",
                                        border: isHovered
                                            ? "1px solid rgba(139,92,246,0.35)"
                                            : "1px solid rgba(255,255,255,0.06)",
                                        overflow: "hidden",
                                        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                                        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                                        boxShadow: isHovered
                                            ? "0 20px 60px rgba(139,92,246,0.12), 0 0 0 1px rgba(139,92,246,0.1)"
                                            : "0 4px 20px rgba(0,0,0,0.3)",
                                        cursor: "pointer",
                                        animation: `todCardEntry 0.5s ease-out ${i * 0.08}s both`,
                                    }}
                                    onClick={() => session.user_joined ? handleJoin(session) : undefined}
                                >
                                    {/* Glow effect on hover */}
                                    {isHovered && (
                                        <div style={{
                                            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                                            background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(236,72,153,0.6), transparent)",
                                        }} />
                                    )}

                                    {/* Card top section */}
                                    <div style={{ padding: "20px 20px 0" }}>
                                        {/* Status row */}
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                {/* Live badge */}
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "5px",
                                                    padding: "4px 10px", borderRadius: "8px",
                                                    background: "rgba(34,197,94,0.12)",
                                                    border: "1px solid rgba(34,197,94,0.2)",
                                                    fontSize: "10px", fontWeight: 800,
                                                    color: "#4ade80", letterSpacing: "1px",
                                                    textTransform: "uppercase" as const,
                                                }}>
                                                    <span style={{
                                                        width: 5, height: 5, borderRadius: "50%",
                                                        background: "#22c55e",
                                                        boxShadow: "0 0 6px rgba(34,197,94,0.8)",
                                                        animation: "todPulse 2s ease-in-out infinite",
                                                    }} />
                                                    Live
                                                </span>
                                                {/* Access badge */}
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                                    padding: "4px 8px", borderRadius: "8px",
                                                    background: session.is_private
                                                        ? "rgba(168,85,247,0.1)"
                                                        : "rgba(255,255,255,0.04)",
                                                    border: `1px solid ${session.is_private ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)"}`,
                                                    fontSize: "10px", fontWeight: 700,
                                                    color: session.is_private ? "#c084fc" : "rgba(255,255,255,0.4)",
                                                    textTransform: "uppercase" as const,
                                                    letterSpacing: "0.5px",
                                                }}>
                                                    {session.is_private
                                                        ? <><Lock style={{ width: 9, height: 9 }} /> Private</>
                                                        : <><Globe style={{ width: 9, height: 9 }} /> Public</>
                                                    }
                                                </span>
                                            </div>
                                            {/* User status badge */}
                                            {session.user_joined && (
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                                    padding: "4px 10px", borderRadius: "8px",
                                                    background: "rgba(34,197,94,0.1)",
                                                    border: "1px solid rgba(34,197,94,0.2)",
                                                    fontSize: "10px", fontWeight: 700,
                                                    color: "#4ade80", textTransform: "uppercase" as const,
                                                }}>
                                                    <CheckCircle2 style={{ width: 10, height: 10 }} /> Joined
                                                </span>
                                            )}
                                            {session.user_request_status === "pending" && (
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                                    padding: "4px 10px", borderRadius: "8px",
                                                    background: "rgba(245,158,11,0.1)",
                                                    border: "1px solid rgba(245,158,11,0.2)",
                                                    fontSize: "10px", fontWeight: 700,
                                                    color: "#fbbf24", textTransform: "uppercase" as const,
                                                }}>
                                                    <Clock style={{ width: 10, height: 10 }} /> Pending
                                                </span>
                                            )}
                                            {session.user_request_status === "rejected" && (
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                                    padding: "4px 10px", borderRadius: "8px",
                                                    background: "rgba(239,68,68,0.1)",
                                                    border: "1px solid rgba(239,68,68,0.2)",
                                                    fontSize: "10px", fontWeight: 700,
                                                    color: "#f87171", textTransform: "uppercase" as const,
                                                }}>
                                                    <XCircle style={{ width: 10, height: 10 }} /> Declined
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 style={{
                                            fontSize: "18px", fontWeight: 700,
                                            color: isHovered ? "#e9d5ff" : "#fff",
                                            margin: "0 0 6px", lineHeight: 1.3,
                                            transition: "color 0.3s ease",
                                            overflow: "hidden", textOverflow: "ellipsis",
                                            whiteSpace: "nowrap" as const,
                                        }}>
                                            {session.title}
                                        </h3>

                                        {/* Description */}
                                        {session.description && (
                                            <p style={{
                                                fontSize: "13px", color: "rgba(255,255,255,0.35)",
                                                margin: "0 0 14px", lineHeight: 1.5,
                                                overflow: "hidden", display: "-webkit-box",
                                                WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                                            }}>
                                                {session.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Creator row */}
                                    <div style={{
                                        padding: "12px 20px",
                                        display: "flex", alignItems: "center", gap: "12px",
                                        borderTop: "1px solid rgba(255,255,255,0.04)",
                                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                                    }}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: "12px",
                                            background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            overflow: "hidden", flexShrink: 0,
                                            border: "2px solid rgba(255,255,255,0.1)",
                                            boxShadow: "0 4px 12px rgba(139,92,246,0.2)",
                                        }}>
                                            {session.creator?.avatar_url ? (
                                                <img src={session.creator.avatar_url} alt=""
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                                <span style={{ color: "#fff", fontSize: "14px", fontWeight: 700 }}>
                                                    {creatorName[0]?.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: "14px", fontWeight: 600, color: "#fff",
                                                overflow: "hidden", textOverflow: "ellipsis",
                                                whiteSpace: "nowrap" as const,
                                            }}>
                                                {creatorName}
                                            </div>
                                            <div style={{
                                                fontSize: "11px", color: "rgba(255,255,255,0.3)",
                                                marginTop: "2px",
                                            }}>
                                                Started {timeAgo(session.started_at)}
                                            </div>
                                        </div>
                                        <Flame style={{
                                            width: 16, height: 16,
                                            color: isHovered ? "#f97316" : "rgba(255,255,255,0.15)",
                                            transition: "color 0.3s ease",
                                        }} />
                                    </div>

                                    {/* Stats row */}
                                    <div style={{
                                        padding: "12px 20px",
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                    }}>
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: "6px",
                                            fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 500,
                                        }}>
                                            <Users style={{ width: 13, height: 13 }} />
                                            <span>{session.participant_count} watching</span>
                                        </div>
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: "6px",
                                            fontSize: "12px", fontWeight: 700,
                                            color: price > 0 ? "#fbbf24" : "#4ade80",
                                        }}>
                                            {price > 0 ? (
                                                <>
                                                    <DollarSign style={{ width: 13, height: 13 }} />
                                                    <span>${price}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles style={{ width: 13, height: 13 }} />
                                                    <span>Free</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div style={{ padding: "0 16px 16px" }}>
                                        {session.user_joined ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleJoin(session); }}
                                                style={{
                                                    width: "100%", padding: "13px",
                                                    borderRadius: "14px", border: "none",
                                                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                                                    color: "#fff", fontSize: "14px", fontWeight: 700,
                                                    cursor: "pointer", transition: "all 0.3s ease",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                    boxShadow: "0 4px 20px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                                                    letterSpacing: "0.3px",
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(34,197,94,0.35), inset 0 1px 0 rgba(255,255,255,0.15)"; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"; }}
                                            >
                                                <Play style={{ width: 16, height: 16, fill: "#fff" }} /> Enter Session
                                            </button>
                                        ) : session.user_request_status === "pending" ? (
                                            <button
                                                disabled
                                                style={{
                                                    width: "100%", padding: "13px",
                                                    borderRadius: "14px",
                                                    background: "rgba(245,158,11,0.08)",
                                                    border: "1px solid rgba(245,158,11,0.15)",
                                                    color: "#fbbf24", fontSize: "14px", fontWeight: 600,
                                                    cursor: "not-allowed",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                }}
                                            >
                                                <Clock style={{ width: 15, height: 15 }} /> Awaiting Approval
                                            </button>
                                        ) : session.user_request_status === "rejected" ? (
                                            <button
                                                disabled
                                                style={{
                                                    width: "100%", padding: "13px",
                                                    borderRadius: "14px",
                                                    background: "rgba(239,68,68,0.08)",
                                                    border: "1px solid rgba(239,68,68,0.15)",
                                                    color: "#f87171", fontSize: "14px", fontWeight: 600,
                                                    cursor: "not-allowed",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                }}
                                            >
                                                <XCircle style={{ width: 15, height: 15 }} /> Request Declined
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleJoin(session); }}
                                                disabled={joiningSessionId === session.id}
                                                style={{
                                                    width: "100%", padding: "13px",
                                                    borderRadius: "14px", border: "none",
                                                    background: session.is_private
                                                        ? "linear-gradient(135deg, #8b5cf6, #d946ef)"
                                                        : price > 0
                                                            ? "linear-gradient(135deg, #f59e0b, #f97316)"
                                                            : "linear-gradient(135deg, #22c55e, #10b981)",
                                                    color: "#fff", fontSize: "14px", fontWeight: 700,
                                                    cursor: joiningSessionId === session.id ? "wait" : "pointer",
                                                    transition: "all 0.3s ease",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                    boxShadow: session.is_private
                                                        ? "0 4px 20px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
                                                        : price > 0
                                                            ? "0 4px 20px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.15)"
                                                            : "0 4px 20px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                                                    opacity: joiningSessionId === session.id ? 0.7 : 1,
                                                    letterSpacing: "0.3px",
                                                }}
                                                onMouseEnter={e => { if (joiningSessionId !== session.id) { e.currentTarget.style.transform = "translateY(-1px)"; } }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                                            >
                                                {joiningSessionId === session.id ? (
                                                    <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Joining...</>
                                                ) : session.is_private ? (
                                                    <><Send style={{ width: 15, height: 15 }} /> Request to Join</>
                                                ) : price > 0 ? (
                                                    <><DollarSign style={{ width: 15, height: 15 }} /> Join — ${price}</>
                                                ) : (
                                                    <><Play style={{ width: 15, height: 15, fill: "#fff" }} /> Join Free</>
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

            {/* Keyframes */}
            <style>{`
                @keyframes todBgFloat1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.05); }
                    66% { transform: translate(-20px, 20px) scale(0.95); }
                }
                @keyframes todBgFloat2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-40px, -20px) scale(1.1); }
                }
                @keyframes todBgFloat3 {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); }
                    50% { transform: translate(-45%, -55%) scale(1.15); }
                }
                @keyframes todPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes todCardEntry {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
