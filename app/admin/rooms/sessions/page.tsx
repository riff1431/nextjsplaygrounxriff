"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Activity, ChevronLeft, Loader2, XCircle, Eye, Clock, DollarSign,
    RefreshCw, Users, Radio, CheckCircle2, AlertTriangle, Search, Hash
} from "lucide-react";
import Link from "next/link";

interface Session {
    id: string;
    title: string;
    room_type: string;
    session_type: string;
    status: string;
    entry_fee: number;
    viewer_count: number;
    started_at: string;
    ended_at: string | null;
    creator?: { id?: string; username?: string; avatar_url?: string; full_name?: string };
    participant_count?: number;
    description?: string;
    agora_channel?: string;
    room_id?: string;
}

interface Toast {
    id: number;
    message: string;
    type: "success" | "error" | "info";
}

export default function AdminSessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [filter, setFilter] = useState<"active" | "ended">("active");
    const [isLoading, setIsLoading] = useState(true);
    const [endingIds, setEndingIds] = useState<Set<string>>(new Set());
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    const [confirmEndId, setConfirmEndId] = useState<string | null>(null);
    const [confirmEndTitle, setConfirmEndTitle] = useState("");
    const [endingAll, setEndingAll] = useState(false);
    const [confirmEndAll, setConfirmEndAll] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const toastId = useRef(0);

    // ── Toast system ─────────────────────────────────
    const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
        const id = ++toastId.current;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }, []);

    // ── Fetch sessions ───────────────────────────────
    const fetchSessions = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/rooms/sessions?status=${filter}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setSessions(data.sessions || []);
            setLastRefreshed(new Date());
        } catch (err: any) {
            showToast(`Failed to load sessions: ${err.message}`, "error");
        } finally {
            setIsLoading(false);
        }
    }, [filter, showToast]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // ── Auto-refresh every 15s for active tab ────────
    useEffect(() => {
        if (autoRefresh && filter === "active") {
            intervalRef.current = setInterval(() => fetchSessions(true), 15000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, filter, fetchSessions]);

    // ── Force end session ────────────────────────────
    const forceEnd = async (sessionId: string) => {
        setConfirmEndId(null);
        setEndingIds((prev) => new Set(prev).add(sessionId));
        try {
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            showToast("Session ended successfully", "success");
        } catch (err: any) {
            showToast(`Failed to end session: ${err.message}`, "error");
        } finally {
            setEndingIds((prev) => {
                const next = new Set(prev);
                next.delete(sessionId);
                return next;
            });
        }
    };

    const openConfirmEnd = (session: Session) => {
        setConfirmEndId(session.id);
        setConfirmEndTitle(session.title);
    };

    // ── Force end ALL sessions ───────────────────────
    const forceEndAll = async () => {
        setConfirmEndAll(false);
        setEndingAll(true);
        try {
            const res = await fetch(`/api/v1/rooms/sessions/end-all`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            showToast(`Ended ${data.ended_count} session(s) successfully`, "success");
            await fetchSessions();
        } catch (err: any) {
            showToast(`Failed to end all sessions: ${err.message}`, "error");
        } finally {
            setEndingAll(false);
        }
    };

    // ── Helpers ──────────────────────────────────────
    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const getDuration = (started: string, ended?: string | null) => {
        const start = new Date(started).getTime();
        const end = ended ? new Date(ended).getTime() : Date.now();
        const mins = Math.floor((end - start) / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m`;
    };

    const roomTypeLabel = (rt: string) => {
        const map: Record<string, string> = {
            "confessions": "Confessions",
            "x-chat": "X-Chat",
            "bar-lounge": "Bar Lounge",
            "suga-4-u": "Suga4U",
            "flash-drop": "Flash Drop",
            "truth-or-dare": "Truth or Dare",
        };
        return map[rt] || rt;
    };

    const roomTypeColor = (rt: string) => {
        const map: Record<string, string> = {
            "confessions": "hsl(280,100%,65%)",
            "x-chat": "hsl(340,85%,60%)",
            "bar-lounge": "hsl(30,90%,55%)",
            "suga-4-u": "hsl(45,100%,60%)",
            "flash-drop": "hsl(200,90%,60%)",
            "truth-or-dare": "hsl(150,80%,50%)",
        };
        return map[rt] || "hsl(220,70%,60%)";
    };

    // ── Filter by search ─────────────────────────────
    const filtered = sessions.filter((s) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            s.title.toLowerCase().includes(q) ||
            s.creator?.username?.toLowerCase().includes(q) ||
            s.room_type.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q)
        );
    });

    return (
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "30px 20px", position: "relative" }}>
            {/* ── Toast notifications ── */}
            <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px" }}>
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        style={{
                            padding: "12px 18px",
                            borderRadius: "10px",
                            background: t.type === "success" ? "rgba(34,197,94,0.15)" : t.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)",
                            border: `1px solid ${t.type === "success" ? "rgba(34,197,94,0.3)" : t.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
                            color: t.type === "success" ? "#22c55e" : t.type === "error" ? "#ef4444" : "#3b82f6",
                            fontSize: "13px",
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            backdropFilter: "blur(12px)",
                            animation: "slideIn 0.3s ease-out",
                            minWidth: "220px",
                        }}
                    >
                        {t.type === "success" ? <CheckCircle2 size={14} /> : t.type === "error" ? <AlertTriangle size={14} /> : <Activity size={14} />}
                        {t.message}
                    </div>
                ))}
            </div>

            {/* ── Confirmation Modal ── */}
            {confirmEndId && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 9998,
                        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onClick={() => setConfirmEndId(null)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(135deg, rgba(20,20,30,0.98), rgba(30,15,25,0.98))",
                            border: "1px solid rgba(239,68,68,0.2)",
                            borderRadius: "16px",
                            padding: "28px",
                            maxWidth: "400px",
                            width: "90%",
                            textAlign: "center",
                        }}
                    >
                        <div style={{
                            width: "48px", height: "48px", borderRadius: "50%",
                            background: "rgba(239,68,68,0.12)", display: "flex",
                            alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                        }}>
                            <AlertTriangle size={24} color="#ef4444" />
                        </div>
                        <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 8px" }}>
                            Force End Session?
                        </h3>
                        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: "0 0 24px", lineHeight: 1.5 }}>
                            This will immediately end <strong style={{ color: "#fff" }}>&quot;{confirmEndTitle}&quot;</strong> and
                            disconnect all participants. This action cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button
                                onClick={() => setConfirmEndId(null)}
                                style={{
                                    padding: "10px 24px", borderRadius: "10px",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: "rgba(255,255,255,0.05)",
                                    color: "rgba(255,255,255,0.7)", fontSize: "13px",
                                    fontWeight: 600, cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => forceEnd(confirmEndId)}
                                style={{
                                    padding: "10px 24px", borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                    color: "#fff", fontSize: "13px",
                                    fontWeight: 600, cursor: "pointer",
                                }}
                            >
                                End Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── End All Confirmation Modal ── */}
            {confirmEndAll && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 9998,
                        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onClick={() => setConfirmEndAll(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(135deg, rgba(20,20,30,0.98), rgba(30,15,25,0.98))",
                            border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "16px",
                            padding: "28px",
                            maxWidth: "420px",
                            width: "90%",
                            textAlign: "center",
                        }}
                    >
                        <div style={{
                            width: "48px", height: "48px", borderRadius: "50%",
                            background: "rgba(239,68,68,0.15)", display: "flex",
                            alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                        }}>
                            <AlertTriangle size={24} color="#ef4444" />
                        </div>
                        <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 8px" }}>
                            End All Active Sessions?
                        </h3>
                        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: "0 0 24px", lineHeight: 1.5 }}>
                            This will immediately end <strong style={{ color: "#ef4444" }}>all {sessions.length} active session(s)</strong> and
                            disconnect every participant across the platform. This action cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                            <button
                                onClick={() => setConfirmEndAll(false)}
                                style={{
                                    padding: "10px 24px", borderRadius: "10px",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    background: "rgba(255,255,255,0.05)",
                                    color: "rgba(255,255,255,0.7)", fontSize: "13px",
                                    fontWeight: 600, cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={forceEndAll}
                                style={{
                                    padding: "10px 24px", borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                    color: "#fff", fontSize: "13px",
                                    fontWeight: 600, cursor: "pointer",
                                }}
                            >
                                End All Sessions
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                <Link href="/admin/rooms" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                    <ChevronLeft size={20} />
                </Link>
                <Activity size={24} color="hsl(0,90%,55%)" />
                <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: 0 }}>Session Monitor</h1>
                <div style={{ flex: 1 }} />
                {/* Live indicator */}
                {filter === "active" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                        <div style={{
                            width: "6px", height: "6px", borderRadius: "50%",
                            background: autoRefresh ? "#22c55e" : "rgba(255,255,255,0.2)",
                            boxShadow: autoRefresh ? "0 0 6px #22c55e" : "none",
                            animation: autoRefresh ? "pulse 2s ease-in-out infinite" : "none",
                        }} />
                        {autoRefresh ? "Live" : "Paused"}
                    </div>
                )}
            </div>

            {/* ── Sub-header: last refreshed + controls ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", paddingLeft: "56px" }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
                    Updated {lastRefreshed.toLocaleTimeString()}
                </span>
                <button
                    onClick={() => fetchSessions()}
                    disabled={isLoading}
                    style={{
                        background: "none", border: "none", color: "rgba(255,255,255,0.4)",
                        cursor: "pointer", padding: "2px", display: "flex", alignItems: "center",
                    }}
                    title="Refresh now"
                >
                    <RefreshCw size={13} style={isLoading ? { animation: "spin 1s linear infinite" } : {}} />
                </button>
                {filter === "active" && (
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        style={{
                            background: "none", border: "none", fontSize: "11px",
                            color: autoRefresh ? "hsl(150,80%,50%)" : "rgba(255,255,255,0.3)",
                            cursor: "pointer", textDecoration: "underline",
                        }}
                    >
                        {autoRefresh ? "Pause auto-refresh" : "Enable auto-refresh"}
                    </button>
                )}
            </div>

            {/* ── Filter tabs + search ── */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
                {(["active", "ended"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: "8px 18px",
                            borderRadius: "10px",
                            border: filter === f ? "2px solid hsl(280,100%,65%)" : "1px solid rgba(255,255,255,0.1)",
                            background: filter === f ? "rgba(159,90,253,0.12)" : "rgba(255,255,255,0.04)",
                            color: filter === f ? "hsl(280,100%,75%)" : "rgba(255,255,255,0.5)",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            textTransform: "capitalize",
                        }}
                    >
                        {f}
                        {!isLoading && filter === f && (
                            <span style={{ marginLeft: "6px", opacity: 0.6 }}>({sessions.length})</span>
                        )}
                    </button>
                ))}
                {/* End All button */}
                {filter === "active" && sessions.length > 0 && (
                    <button
                        onClick={() => setConfirmEndAll(true)}
                        disabled={endingAll}
                        style={{
                            display: "flex", alignItems: "center", gap: "5px",
                            padding: "7px 14px", borderRadius: "8px", border: "none",
                            background: endingAll ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.12)",
                            color: endingAll ? "rgba(239,68,68,0.4)" : "#ef4444",
                            fontSize: "12px", fontWeight: 600,
                            cursor: endingAll ? "not-allowed" : "pointer",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {endingAll ? (
                            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                            <XCircle size={13} />
                        )}
                        {endingAll ? "Ending..." : "End All"}
                    </button>
                )}
                <div style={{ flex: 1 }} />
                <div style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px", padding: "6px 12px",
                }}>
                    <Search size={13} color="rgba(255,255,255,0.3)" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search sessions..."
                        style={{
                            background: "none", border: "none", color: "#fff",
                            fontSize: "12px", outline: "none", width: "140px",
                        }}
                    />
                </div>
            </div>

            {/* ── Session list ── */}
            {isLoading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.5)" }}>
                    <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                    <div style={{ marginTop: "12px", fontSize: "13px" }}>Loading sessions...</div>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
                    {search ? `No sessions matching "${search}"` : `No ${filter} sessions found.`}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {filtered.map((s) => {
                        const isEnding = endingIds.has(s.id);
                        const isExpanded = expandedId === s.id;
                        const typeColor = roomTypeColor(s.room_type);

                        return (
                            <div key={s.id}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "14px",
                                        background: isExpanded ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                                        border: `1px solid ${isExpanded ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
                                        borderRadius: isExpanded ? "12px 12px 0 0" : "12px",
                                        padding: "14px 18px",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                    }}
                                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                >
                                    {/* Creator avatar */}
                                    <div
                                        style={{
                                            width: "40px",
                                            height: "40px",
                                            borderRadius: "50%",
                                            background: s.creator?.avatar_url
                                                ? `url(${s.creator.avatar_url}) center/cover`
                                                : "linear-gradient(135deg, hsl(280,100%,60%), hsl(330,90%,55%))",
                                            flexShrink: 0,
                                            border: `2px solid ${s.status === "active" ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`,
                                        }}
                                    />
                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ color: "#fff", fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {s.title}
                                            </span>
                                            {s.status === "active" && (
                                                <span style={{
                                                    padding: "2px 6px", borderRadius: "4px",
                                                    background: "rgba(34,197,94,0.15)", color: "#22c55e",
                                                    fontSize: "9px", fontWeight: 700, textTransform: "uppercase",
                                                    letterSpacing: "0.5px",
                                                }}>
                                                    Live
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", display: "flex", gap: "8px", marginTop: "3px", flexWrap: "wrap" }}>
                                            <span>{s.creator?.username || s.creator?.full_name || "Unknown"}</span>
                                            <span>•</span>
                                            <span style={{ color: typeColor, fontWeight: 500 }}>{roomTypeLabel(s.room_type)}</span>
                                            <span>•</span>
                                            <span style={{ textTransform: "capitalize" }}>{s.session_type}</span>
                                        </div>
                                    </div>
                                    {/* Stats */}
                                    <div style={{ display: "flex", gap: "14px", alignItems: "center", flexShrink: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(255,255,255,0.5)", fontSize: "12px" }} title="Participants">
                                            <Eye size={13} /> {s.participant_count || s.viewer_count || 0}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "hsl(150,80%,60%)", fontSize: "12px" }} title="Entry fee">
                                            <DollarSign size={13} /> {s.entry_fee}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(255,255,255,0.4)", fontSize: "11px" }} title="Started at">
                                            <Clock size={12} /> {formatTime(s.started_at)}
                                        </div>
                                        {s.status === "active" && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openConfirmEnd(s); }}
                                                disabled={isEnding}
                                                title="Force end this session"
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    padding: "5px 12px",
                                                    borderRadius: "6px",
                                                    border: "none",
                                                    background: isEnding ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.15)",
                                                    color: isEnding ? "rgba(239,68,68,0.5)" : "#ef4444",
                                                    fontSize: "11px",
                                                    fontWeight: 600,
                                                    cursor: isEnding ? "not-allowed" : "pointer",
                                                    transition: "all 0.2s ease",
                                                    minWidth: "60px",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {isEnding ? (
                                                    <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                                                ) : (
                                                    <>
                                                        <XCircle size={12} /> End
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        {s.status === "ended" && (
                                            <span style={{
                                                padding: "4px 10px", borderRadius: "6px",
                                                background: "rgba(255,255,255,0.04)",
                                                color: "rgba(255,255,255,0.3)",
                                                fontSize: "11px", fontWeight: 500,
                                            }}>
                                                Ended
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* ── Expanded detail panel ── */}
                                {isExpanded && (
                                    <div style={{
                                        background: "rgba(255,255,255,0.02)",
                                        border: "1px solid rgba(255,255,255,0.06)",
                                        borderTop: "none",
                                        borderRadius: "0 0 12px 12px",
                                        padding: "16px 20px",
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr 1fr",
                                        gap: "14px",
                                    }}>
                                        <DetailItem icon={<Hash size={12} />} label="Session ID" value={s.id.substring(0, 12) + "..."} />
                                        <DetailItem icon={<Radio size={12} />} label="Room Type" value={roomTypeLabel(s.room_type)} color={typeColor} />
                                        <DetailItem icon={<Users size={12} />} label="Session Type" value={s.session_type} />
                                        <DetailItem icon={<Clock size={12} />} label="Duration" value={getDuration(s.started_at, s.ended_at)} />
                                        <DetailItem icon={<DollarSign size={12} />} label="Entry Fee" value={`$${s.entry_fee}`} color="hsl(150,80%,60%)" />
                                        <DetailItem icon={<Eye size={12} />} label="Participants" value={String(s.participant_count || s.viewer_count || 0)} />
                                        {s.ended_at && (
                                            <DetailItem icon={<CheckCircle2 size={12} />} label="Ended At" value={formatTime(s.ended_at)} />
                                        )}
                                        {s.description && (
                                            <div style={{ gridColumn: "1 / -1" }}>
                                                <DetailItem icon={<Activity size={12} />} label="Description" value={s.description} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── CSS keyframes ── */}
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes slideIn {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// ── Sub-component: detail row ────────────────────
function DetailItem({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "rgba(255,255,255,0.35)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {icon} {label}
            </div>
            <div style={{ color: color || "rgba(255,255,255,0.75)", fontSize: "13px", fontWeight: 500 }}>
                {value}
            </div>
        </div>
    );
}
