"use client";

import React, { useState, useEffect } from "react";
import { Activity, ChevronLeft, Loader2, XCircle, Eye, Clock, DollarSign } from "lucide-react";
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
    creator?: { username?: string; avatar_url?: string };
    participant_count?: number;
}

export default function AdminSessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [filter, setFilter] = useState<"active" | "ended">("active");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, [filter]);

    const fetchSessions = async () => {
        setIsLoading(true);
        const res = await fetch(`/api/v1/rooms/sessions?status=${filter}`);
        const data = await res.json();
        setSessions(data.sessions || []);
        setIsLoading(false);
    };

    const forceEnd = async (sessionId: string) => {
        if (!confirm("Force-end this session?")) return;
        const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, { method: "POST" });
        if (res.ok) {
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        }
    };

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    return (
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "30px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <Link href="/admin/rooms" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>
                    <ChevronLeft size={20} />
                </Link>
                <Activity size={24} color="hsl(0,90%,55%)" />
                <h1 style={{ color: "#fff", fontSize: "22px", fontWeight: 700, margin: 0 }}>Session Monitor</h1>
            </div>

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
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
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.5)" }}>
                    <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                </div>
            ) : sessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
                    No {filter} sessions found.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {sessions.map((s) => (
                        <div
                            key={s.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: "12px",
                                padding: "14px 18px",
                            }}
                        >
                            {/* Creator avatar */}
                            <div
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "50%",
                                    background: s.creator?.avatar_url
                                        ? `url(${s.creator.avatar_url}) center/cover`
                                        : "linear-gradient(135deg, hsl(280,100%,60%), hsl(330,90%,55%))",
                                    flexShrink: 0,
                                }}
                            />
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>{s.title}</div>
                                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", display: "flex", gap: "10px", marginTop: "2px" }}>
                                    <span>{s.creator?.username || "Unknown"}</span>
                                    <span>•</span>
                                    <span>{s.room_type}</span>
                                    <span>•</span>
                                    <span style={{ textTransform: "capitalize" }}>{s.session_type}</span>
                                </div>
                            </div>
                            {/* Stats */}
                            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
                                    <Eye size={13} /> {s.participant_count || s.viewer_count || 0}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "hsl(150,80%,60%)", fontSize: "12px" }}>
                                    <DollarSign size={13} /> {s.entry_fee}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>
                                    <Clock size={12} /> {formatTime(s.started_at)}
                                </div>
                                {s.status === "active" && (
                                    <button
                                        onClick={() => forceEnd(s.id)}
                                        title="Force end this session"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            padding: "4px 10px",
                                            borderRadius: "6px",
                                            border: "none",
                                            background: "rgba(239,68,68,0.15)",
                                            color: "#ef4444",
                                            fontSize: "11px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <XCircle size={12} /> End
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
