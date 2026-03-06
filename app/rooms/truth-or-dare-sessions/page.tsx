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
            backgroundImage: "linear-gradient(to bottom, rgba(13, 4, 21, 0.85), rgba(45, 11, 63, 0.8)), url('/images/truth-or-dare-custom-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            color: "#fff",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Animated background orbs - Cyberpunk Pink */}
            <div style={{
                position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
            }}>
                <div style={{
                    position: "absolute", top: "-20%", left: "-10%",
                    width: "600px", height: "600px",
                    background: "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 60%)",
                    borderRadius: "50%",
                    animation: "todBgFloat1 20s ease-in-out infinite",
                }} />
                <div style={{
                    position: "absolute", bottom: "-20%", right: "-10%",
                    width: "500px", height: "500px",
                    background: "radial-gradient(circle, rgba(217,70,239,0.1) 0%, transparent 60%)",
                    borderRadius: "50%",
                    animation: "todBgFloat2 25s ease-in-out infinite",
                }} />
                <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    width: "400px", height: "400px",
                    background: "radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 60%)",
                    borderRadius: "50%",
                    transform: "translate(-50%, -50%)",
                    animation: "todBgFloat3 15s ease-in-out infinite",
                }} />
            </div>

            {/* Header */}
            <header style={{
                position: "sticky", top: 0, zIndex: 50,
                background: "rgba(13,4,21,0.75)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderBottom: "1px solid rgba(236,72,153,0.15)",
                boxShadow: "0 4px 30px rgba(236,72,153,0.05)",
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
                                border: "1px solid rgba(236,72,153,0.15)",
                                color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 500,
                                cursor: "pointer", transition: "all 0.2s ease",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(236,72,153,0.15)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.boxShadow = "0 0 10px rgba(236,72,153,0.2)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                            <ArrowLeft style={{ width: 16, height: 16 }} /> Back
                        </button>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "26px", filter: "drop-shadow(0 0 5px rgba(236,72,153,0.5))" }}>🎭</span>
                                <h1 style={{
                                    fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 800,
                                    background: "linear-gradient(135deg, #fff 0%, #fbcfe8 50%, #ec4899 100%)",
                                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                    letterSpacing: "-0.02em", margin: 0,
                                    textShadow: "0 0 20px rgba(236,72,153,0.4)",
                                }}>
                                    Truth & Dare
                                </h1>
                            </div>
                            <p style={{
                                fontSize: "12px", color: "rgba(251,207,232,0.6)",
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
                                    width: 14, height: 14, color: "rgba(244,114,182,0.5)",
                                }} />
                                <input
                                    type="text"
                                    placeholder="Search sessions..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        padding: "8px 12px 8px 34px", borderRadius: "10px",
                                        background: "rgba(236,72,153,0.04)",
                                        border: "1px solid rgba(236,72,153,0.2)",
                                        color: "#fff", fontSize: "13px", outline: "none",
                                        width: "180px", transition: "all 0.3s ease",
                                    }}
                                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(236,72,153,0.8)"; e.currentTarget.style.width = "220px"; e.currentTarget.style.boxShadow = "0 0 15px rgba(236,72,153,0.2)"; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(236,72,153,0.2)"; e.currentTarget.style.width = "180px"; e.currentTarget.style.boxShadow = "none"; }}
                                />
                            </div>
                        )}
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            padding: "6px 14px", borderRadius: "20px",
                            background: sessions.length > 0
                                ? "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(217,70,239,0.1))"
                                : "rgba(255,255,255,0.04)",
                            border: sessions.length > 0
                                ? "1px solid rgba(236,72,153,0.4)"
                                : "1px solid rgba(255,255,255,0.08)",
                            boxShadow: sessions.length > 0 ? "0 0 15px rgba(236,72,153,0.2)" : "none",
                        }}>
                            {sessions.length > 0 && (
                                <span style={{
                                    width: 7, height: 7, borderRadius: "50%",
                                    background: "#f472b6",
                                    boxShadow: "0 0 10px rgba(244,114,182,0.8), 0 0 20px rgba(236,72,153,0.6)",
                                    animation: "todPulsePink 1.5s ease-in-out infinite",
                                }} />
                            )}
                            <span style={{
                                fontSize: "12px", fontWeight: 700,
                                color: sessions.length > 0 ? "#fbcfe8" : "rgba(255,255,255,0.4)",
                                letterSpacing: "0.5px",
                                textShadow: sessions.length > 0 ? "0 0 10px rgba(236,72,153,0.5)" : "none",
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
                            background: "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(217,70,239,0.2))",
                            border: "1px solid rgba(236,72,153,0.3)",
                            boxShadow: "0 0 30px rgba(236,72,153,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            animation: "todPulsePink 2s ease-in-out infinite",
                        }}>
                            <Loader2 style={{ width: 28, height: 28, color: "#f472b6", animation: "spin 1s linear infinite" }} />
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <p style={{ fontSize: "16px", fontWeight: 600, color: "#fbcfe8", margin: "0 0 4px", textShadow: "0 0 10px rgba(236,72,153,0.3)" }}>
                                Finding live sessions...
                            </p>
                            <p style={{ fontSize: "13px", color: "rgba(244,114,182,0.6)" }}>
                                Scanning the neon grid...
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
                            background: "rgba(225,29,72,0.15)", border: "1px solid rgba(225,29,72,0.3)",
                            boxShadow: "0 0 30px rgba(225,29,72,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <XCircle style={{ width: 32, height: 32, color: "#fb7185" }} />
                        </div>
                        <p style={{ fontSize: "16px", fontWeight: 600, color: "#fb7185", textShadow: "0 0 10px rgba(225,29,72,0.3)" }}>Failed to load sessions</p>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", maxWidth: 400, textAlign: "center" }}>{error}</p>
                        <button
                            onClick={fetchSessions}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: "6px",
                                marginTop: "8px", padding: "10px 24px", borderRadius: "12px",
                                background: "rgba(225,29,72,0.1)", border: "1px solid rgba(225,29,72,0.2)",
                                color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(225,29,72,0.2)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(225,29,72,0.3)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(225,29,72,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                            <RefreshCw style={{ width: 14, height: 14 }} /> Reboot Grid
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
                            background: "linear-gradient(135deg, rgba(236,72,153,0.1), rgba(217,70,239,0.1))",
                            border: "1px solid rgba(236,72,153,0.2)",
                            boxShadow: "0 0 40px rgba(236,72,153,0.1)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <span style={{ fontSize: "48px", filter: "drop-shadow(0 0 10px rgba(236,72,153,0.4))" }}>🎭</span>
                            <div style={{
                                position: "absolute", top: -4, right: -4,
                                width: 24, height: 24, borderRadius: "50%",
                                background: "rgba(236,72,153,0.2)",
                                border: "1px solid rgba(236,72,153,0.3)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                                <span style={{ fontSize: "10px" }}>💤</span>
                            </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{
                                fontSize: "22px", fontWeight: 800, color: "#fff",
                                margin: "0 0 8px", letterSpacing: "-0.02em",
                                textShadow: "0 0 15px rgba(236,72,153,0.3)",
                            }}>
                                {searchQuery ? "No Signal Found" : "Grid is Quiet"}
                            </h2>
                            <p style={{
                                fontSize: "14px", color: "rgba(244,114,182,0.5)",
                                maxWidth: 360, margin: "0 auto", lineHeight: 1.6,
                            }}>
                                {searchQuery
                                    ? `No sessions match "${searchQuery}". Adjust your frequency.`
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
                                    background: "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(217,70,239,0.2))",
                                    border: "1px solid rgba(236,72,153,0.4)",
                                    boxShadow: "0 0 20px rgba(236,72,153,0.2)",
                                    color: "#fbcfe8", fontSize: "14px", fontWeight: 600,
                                    cursor: "pointer", transition: "all 0.3s ease",
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(236,72,153,0.3), rgba(217,70,239,0.3))";
                                    e.currentTarget.style.boxShadow = "0 0 30px rgba(236,72,153,0.4)";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(217,70,239,0.2))";
                                    e.currentTarget.style.boxShadow = "0 0 20px rgba(236,72,153,0.2)";
                                    e.currentTarget.style.transform = "translateY(0)";
                                }}
                            >
                                <RefreshCw style={{ width: 15, height: 15 }} /> Scan Network
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
                                            ? "linear-gradient(145deg, rgba(45,15,55,0.9), rgba(30,10,40,0.95))"
                                            : "linear-gradient(145deg, rgba(28,10,35,0.7), rgba(20,5,30,0.8))",
                                        border: isHovered
                                            ? "1px solid rgba(236,72,153,0.4)"
                                            : "1px solid rgba(236,72,153,0.1)",
                                        overflow: "hidden",
                                        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                                        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
                                        boxShadow: isHovered
                                            ? "0 20px 60px rgba(236,72,153,0.15), 0 0 0 1px rgba(236,72,153,0.2)"
                                            : "0 4px 20px rgba(0,0,0,0.3)",
                                        cursor: "pointer",
                                        animation: `todCardEntry 0.5s ease-out ${i * 0.08}s both`,
                                    }}
                                    onClick={() => session.user_joined ? handleJoin(session) : undefined}
                                >
                                    {/* Cyberpunk Glow effect on hover */}
                                    {isHovered && (
                                        <div style={{
                                            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                                            background: "linear-gradient(90deg, transparent, #ec4899, #d946ef, transparent)",
                                            boxShadow: "0 0 10px #ec4899",
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
                                                    background: "rgba(236,72,153,0.15)",
                                                    border: "1px solid rgba(236,72,153,0.3)",
                                                    fontSize: "10px", fontWeight: 800,
                                                    color: "#f472b6", letterSpacing: "1px",
                                                    textTransform: "uppercase" as const,
                                                    boxShadow: "0 0 10px rgba(236,72,153,0.15)",
                                                }}>
                                                    <span style={{
                                                        width: 5, height: 5, borderRadius: "50%",
                                                        background: "#ec4899",
                                                        boxShadow: "0 0 8px rgba(236,72,153,0.8)",
                                                        animation: "todPulsePink 1.5s ease-in-out infinite",
                                                    }} />
                                                    Active
                                                </span>
                                                {/* Access badge */}
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                                    padding: "4px 8px", borderRadius: "8px",
                                                    background: session.is_private
                                                        ? "rgba(168,85,247,0.15)"
                                                        : "rgba(217,70,239,0.1)",
                                                    border: `1px solid ${session.is_private ? "rgba(168,85,247,0.3)" : "rgba(217,70,239,0.2)"}`,
                                                    fontSize: "10px", fontWeight: 700,
                                                    color: session.is_private ? "#c084fc" : "#f0abfc",
                                                    textTransform: "uppercase" as const,
                                                    letterSpacing: "0.5px",
                                                }}>
                                                    {session.is_private
                                                        ? <><Lock style={{ width: 9, height: 9 }} /> Locked</>
                                                        : <><Globe style={{ width: 9, height: 9 }} /> Open</>
                                                    }
                                                </span>
                                            </div>
                                            {/* User status badge */}
                                            {session.user_joined && (
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                                    padding: "4px 10px", borderRadius: "8px",
                                                    background: "rgba(236,72,153,0.15)",
                                                    border: "1px solid rgba(236,72,153,0.3)",
                                                    fontSize: "10px", fontWeight: 700,
                                                    color: "#f472b6", textTransform: "uppercase" as const,
                                                    boxShadow: "0 0 10px rgba(236,72,153,0.2)",
                                                }}>
                                                    <CheckCircle2 style={{ width: 10, height: 10 }} /> Joined
                                                </span>
                                            )}
                                            {session.user_request_status === "pending" && (
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                                    padding: "4px 10px", borderRadius: "8px",
                                                    background: "rgba(245,158,11,0.15)",
                                                    border: "1px solid rgba(245,158,11,0.3)",
                                                    fontSize: "10px", fontWeight: 700,
                                                    color: "#fcd34d", textTransform: "uppercase" as const,
                                                    boxShadow: "0 0 10px rgba(245,158,11,0.2)",
                                                }}>
                                                    <Clock style={{ width: 10, height: 10 }} /> Pending
                                                </span>
                                            )}
                                            {session.user_request_status === "rejected" && (
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: "4px",
                                                    padding: "4px 10px", borderRadius: "8px",
                                                    background: "rgba(225,29,72,0.15)",
                                                    border: "1px solid rgba(225,29,72,0.3)",
                                                    fontSize: "10px", fontWeight: 700,
                                                    color: "#fb7185", textTransform: "uppercase" as const,
                                                    boxShadow: "0 0 10px rgba(225,29,72,0.2)",
                                                }}>
                                                    <XCircle style={{ width: 10, height: 10 }} /> Denied
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 style={{
                                            fontSize: "18px", fontWeight: 700,
                                            color: isHovered ? "#fbcfe8" : "#fff",
                                            margin: "0 0 6px", lineHeight: 1.3,
                                            transition: "color 0.3s ease",
                                            overflow: "hidden", textOverflow: "ellipsis",
                                            whiteSpace: "nowrap" as const,
                                            textShadow: isHovered ? "0 0 10px rgba(236,72,153,0.5)" : "none",
                                        }}>
                                            {session.title}
                                        </h3>

                                        {/* Description */}
                                        {session.description && (
                                            <p style={{
                                                fontSize: "13px", color: "rgba(244,114,182,0.6)",
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
                                        borderTop: "1px solid rgba(236,72,153,0.1)",
                                        borderBottom: "1px solid rgba(236,72,153,0.1)",
                                        background: "rgba(236,72,153,0.02)",
                                    }}>
                                        <div style={{
                                            width: 38, height: 38, borderRadius: "12px",
                                            background: "linear-gradient(135deg, #ec4899, #8b5cf6)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            overflow: "hidden", flexShrink: 0,
                                            border: "2px solid rgba(244,114,182,0.3)",
                                            boxShadow: "0 0 15px rgba(236,72,153,0.3)",
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
                                                textShadow: "0 0 5px rgba(236,72,153,0.3)",
                                            }}>
                                                {creatorName}
                                            </div>
                                            <div style={{
                                                fontSize: "11px", color: "rgba(244,114,182,0.6)",
                                                marginTop: "2px",
                                            }}>
                                                Uplink {timeAgo(session.started_at)}
                                            </div>
                                        </div>
                                        <Flame style={{
                                            width: 16, height: 16,
                                            color: isHovered ? "#f472b6" : "rgba(236,72,153,0.3)",
                                            filter: isHovered ? "drop-shadow(0 0 5px #ec4899)" : "none",
                                            transition: "all 0.3s ease",
                                        }} />
                                    </div>

                                    {/* Stats row */}
                                    <div style={{
                                        padding: "12px 20px",
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                    }}>
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: "6px",
                                            fontSize: "12px", color: "rgba(244,114,182,0.7)", fontWeight: 500,
                                        }}>
                                            <Users style={{ width: 13, height: 13 }} />
                                            <span>{session.participant_count} viewers</span>
                                        </div>
                                        <div style={{
                                            display: "flex", alignItems: "center", gap: "6px",
                                            fontSize: "12px", fontWeight: 800,
                                            color: price > 0 ? "#fcd34d" : "#f472b6",
                                            textShadow: price > 0 ? "0 0 10px rgba(251,191,36,0.3)" : "0 0 10px rgba(236,72,153,0.3)",
                                        }}>
                                            {price > 0 ? (
                                                <>
                                                    <DollarSign style={{ width: 13, height: 13 }} />
                                                    <span>${price}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Zap style={{ width: 13, height: 13 }} />
                                                    <span>Free Access</span>
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
                                                    borderRadius: "14px", border: "1px solid rgba(236,72,153,0.5)",
                                                    background: "linear-gradient(135deg, rgba(219,39,119,0.8), rgba(190,24,93,0.9))",
                                                    color: "#fff", fontSize: "14px", fontWeight: 700,
                                                    cursor: "pointer", transition: "all 0.3s ease",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                    boxShadow: "0 0 20px rgba(236,72,153,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                                                    letterSpacing: "0.5px", textTransform: "uppercase",
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(236,72,153,0.5), inset 0 1px 0 rgba(255,255,255,0.2)"; e.currentTarget.style.background = "linear-gradient(135deg, rgba(236,72,153,0.9), rgba(219,39,119,1))"; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(236,72,153,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"; e.currentTarget.style.background = "linear-gradient(135deg, rgba(219,39,119,0.8), rgba(190,24,93,0.9))"; }}
                                            >
                                                <Play style={{ width: 16, height: 16, fill: "#fff" }} /> Enter Server
                                            </button>
                                        ) : session.user_request_status === "pending" ? (
                                            <button
                                                disabled
                                                style={{
                                                    width: "100%", padding: "13px",
                                                    borderRadius: "14px",
                                                    background: "rgba(245,158,11,0.1)",
                                                    border: "1px solid rgba(245,158,11,0.3)",
                                                    color: "#fcd34d", fontSize: "14px", fontWeight: 600,
                                                    cursor: "not-allowed",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                    boxShadow: "0 0 15px rgba(245,158,11,0.1)", textTransform: "uppercase",
                                                }}
                                            >
                                                <Clock style={{ width: 15, height: 15 }} /> Connecting...
                                            </button>
                                        ) : session.user_request_status === "rejected" ? (
                                            <button
                                                disabled
                                                style={{
                                                    width: "100%", padding: "13px",
                                                    borderRadius: "14px",
                                                    background: "rgba(225,29,72,0.1)",
                                                    border: "1px solid rgba(225,29,72,0.3)",
                                                    color: "#fb7185", fontSize: "14px", fontWeight: 600,
                                                    cursor: "not-allowed",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                    boxShadow: "0 0 15px rgba(225,29,72,0.1)", textTransform: "uppercase",
                                                }}
                                            >
                                                <XCircle style={{ width: 15, height: 15 }} /> Access Denied
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleJoin(session); }}
                                                disabled={joiningSessionId === session.id}
                                                style={{
                                                    width: "100%", padding: "13px",
                                                    borderRadius: "14px", border: "1px solid rgba(236,72,153,0.3)",
                                                    background: session.is_private
                                                        ? "linear-gradient(135deg, rgba(168,85,247,0.8), rgba(147,51,234,0.9))"
                                                        : price > 0
                                                            ? "linear-gradient(135deg, rgba(219,39,119,0.8), rgba(190,24,93,0.9))"
                                                            : "linear-gradient(135deg, rgba(236,72,153,0.8), rgba(219,39,119,0.9))",
                                                    color: "#fff", fontSize: "14px", fontWeight: 800,
                                                    cursor: joiningSessionId === session.id ? "wait" : "pointer",
                                                    transition: "all 0.3s ease",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                                    boxShadow: session.is_private
                                                        ? "0 0 20px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                                                        : price > 0
                                                            ? "0 0 20px rgba(236,72,153,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                                                            : "0 0 20px rgba(236,72,153,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                                                    opacity: joiningSessionId === session.id ? 0.7 : 1,
                                                    letterSpacing: "0.5px", textTransform: "uppercase",
                                                }}
                                                onMouseEnter={e => {
                                                    if (joiningSessionId !== session.id) {
                                                        e.currentTarget.style.transform = "translateY(-2px)";
                                                        e.currentTarget.style.boxShadow = session.is_private
                                                            ? "0 0 30px rgba(168,85,247,0.5), inset 0 1px 0 rgba(255,255,255,0.2)"
                                                            : "0 0 30px rgba(236,72,153,0.5), inset 0 1px 0 rgba(255,255,255,0.2)";
                                                        e.currentTarget.style.background = session.is_private
                                                            ? "linear-gradient(135deg, rgba(168,85,247,0.9), rgba(147,51,234,1))"
                                                            : price > 0
                                                                ? "linear-gradient(135deg, rgba(236,72,153,0.9), rgba(219,39,119,1))"
                                                                : "linear-gradient(135deg, rgba(244,114,182,0.9), rgba(236,72,153,1))";
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                    e.currentTarget.style.boxShadow = session.is_private
                                                        ? "0 0 20px rgba(168,85,247,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                                                        : price > 0
                                                            ? "0 0 20px rgba(236,72,153,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                                                            : "0 0 20px rgba(236,72,153,0.4), inset 0 1px 0 rgba(255,255,255,0.2)";
                                                    e.currentTarget.style.background = session.is_private
                                                        ? "linear-gradient(135deg, rgba(168,85,247,0.8), rgba(147,51,234,0.9))"
                                                        : price > 0
                                                            ? "linear-gradient(135deg, rgba(219,39,119,0.8), rgba(190,24,93,0.9))"
                                                            : "linear-gradient(135deg, rgba(236,72,153,0.8), rgba(219,39,119,0.9))";
                                                }}
                                            >
                                                {joiningSessionId === session.id ? (
                                                    <><Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} /> Initialize...</>
                                                ) : session.is_private ? (
                                                    <><Lock style={{ width: 15, height: 15 }} /> Request Access</>
                                                ) : price > 0 ? (
                                                    <><DollarSign style={{ width: 15, height: 15 }} /> Connect — ${price}</>
                                                ) : (
                                                    <><Zap style={{ width: 15, height: 15, fill: "#fff" }} /> Connect Grid</>
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
                @keyframes todPulsePink {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
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
