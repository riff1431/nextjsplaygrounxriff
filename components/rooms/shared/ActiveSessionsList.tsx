"use client";

import React, { useState } from "react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { Users, Lock, Globe, Eye, Loader2 } from "lucide-react";
import RoomEntryInfoModal, { isRoomEntryDismissed } from "./RoomEntryInfoModal";

interface ActiveSessionsListProps {
    roomType: string;
    roomDisplayName?: string;
    roomLabel?: string;
    roomEmoji?: string;
    accentHsl?: string;
    accentHslSecondary?: string;
    onJoinSession?: (session: any) => void;
    onRequestJoin?: (session: any) => void;
}

/**
 * Shared component listing active sessions for any room type.
 * Shows session cards with type badge, viewer count, creator info, and entry fee.
 */
export default function ActiveSessionsList({
    roomType,
    roomDisplayName,
    roomLabel,
    roomEmoji,
    accentHsl,
    accentHslSecondary,
    onJoinSession,
    onRequestJoin,
}: ActiveSessionsListProps) {
    const { sessions, isLoading, error, refresh } = useRoomSession({ roomType, status: "active" });
    const [showEntryInfo, setShowEntryInfo] = useState(false);
    const [pendingSession, setPendingSession] = useState<any>(null);
    const [pendingAction, setPendingAction] = useState<"join" | "request">("join");

    function interceptAction(session: any, action: "join" | "request") {
        if (isRoomEntryDismissed(roomType)) {
            if (action === "join") onJoinSession?.(session);
            else onRequestJoin?.(session);
            return;
        }
        setPendingSession(session);
        setPendingAction(action);
        setShowEntryInfo(true);
    }

    if (isLoading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "rgba(255,255,255,0.5)" }}>
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ marginLeft: "10px", fontSize: "14px" }}>Loading sessions...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ textAlign: "center", padding: "40px", color: "#f87171", fontSize: "14px" }}>
                {error}
                <button onClick={refresh} style={{ display: "block", margin: "12px auto 0", color: "hsl(280,100%,70%)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    Retry
                </button>
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div
                style={{
                    textAlign: "center",
                    padding: "60px 20px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>📡</div>
                <h3 style={{ color: "rgba(255,255,255,0.8)", fontSize: "16px", fontWeight: 600, margin: "0 0 6px" }}>
                    No Live Sessions
                </h3>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", margin: 0 }}>
                    {roomDisplayName ? `No ${roomDisplayName} sessions are live right now.` : "No sessions are live right now."} Check back soon!
                </p>
            </div>
        );
    }

    return (
        <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
            {sessions.map((session) => (
                <div
                    key={session.id}
                    style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "14px",
                        padding: "16px",
                        transition: "all 0.2s",
                        cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                >
                    {/* Creator info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <div
                            style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                background: session.creator?.avatar_url
                                    ? `url(${session.creator.avatar_url}) center/cover`
                                    : "linear-gradient(135deg, hsl(280,100%,60%), hsl(330,90%,55%))",
                                flexShrink: 0,
                            }}
                        />
                        <div style={{ minWidth: 0 }}>
                            <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {session.creator?.username || session.creator?.full_name || "Creator"}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {/* Live badge */}
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        background: "rgba(239,68,68,0.2)",
                                        color: "#ef4444",
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: "999px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
                                    LIVE
                                </span>
                                {/* Type badge */}
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", color: session.session_type === "private" ? "hsl(280,100%,70%)" : "hsl(150,80%,60%)", fontSize: "10px", fontWeight: 600 }}>
                                    {session.session_type === "private" ? <Lock size={10} /> : <Globe size={10} />}
                                    {session.session_type === "private" ? "Private" : "Public"}
                                </span>
                            </div>
                        </div>
                        {/* Viewer count */}
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
                            <Eye size={14} />
                            {session.participant_count || session.viewer_count || 0}
                        </div>
                    </div>

                    {/* Title */}
                    <h4 style={{ color: "#fff", fontSize: "14px", fontWeight: 600, margin: "0 0 8px", lineHeight: 1.3 }}>
                        {session.title}
                    </h4>
                    {session.description && (
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", margin: "0 0 12px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {session.description}
                        </p>
                    )}

                    {/* Action button */}
                    {session.session_type === "public" ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); interceptAction(session, "join"); }}
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "10px",
                                border: "none",
                                background: "linear-gradient(135deg, hsl(150,80%,40%), hsl(180,100%,40%))",
                                color: "#fff",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            Enter Room
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); interceptAction(session, "request"); }}
                            style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "10px",
                                border: "none",
                                background: "linear-gradient(135deg, hsl(280,100%,55%), hsl(330,90%,50%))",
                                color: "#fff",
                                fontSize: "13px",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            <Lock size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                            Enter Room
                        </button>
                    )}
                </div>
            ))}
        </div>

        {/* Room Entry Info Modal */}
        <RoomEntryInfoModal
            isOpen={showEntryInfo}
            onClose={() => { setShowEntryInfo(false); setPendingSession(null); }}
            onEnter={() => {
                setShowEntryInfo(false);
                if (pendingSession) {
                    if (pendingAction === "join") onJoinSession?.(pendingSession);
                    else onRequestJoin?.(pendingSession);
                    setPendingSession(null);
                }
            }}
            roomType={roomType}
            roomLabel={roomLabel || roomDisplayName || roomType}
            roomEmoji={roomEmoji}
            accentHsl={accentHsl || "280, 80%, 60%"}
            accentHslSecondary={accentHslSecondary}
        />
        </>
    );
}
