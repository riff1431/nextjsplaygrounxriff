"use client";

import React, { useState } from "react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { useJoinRequest } from "@/hooks/useJoinRequest";
import { useAuth } from "@/app/context/AuthContext";
import SessionChatPanel from "./SessionChatPanel";
import CreatorStream from "@/components/rooms/CreatorStream";
import { DollarSign, Users, X, Check, Clock, MessageSquare } from "lucide-react";

interface CreatorSessionViewProps {
    sessionId: string;
    roomType: string;
    /** If provided, renders extra room-specific panels/controls below the main layout */
    children?: React.ReactNode;
}

/**
 * Complete creator live session view — shared across all rooms.
 * Composes: CreatorStream + Chat + Tips/Reactions feed + Join Requests + Earnings
 * Room-specific panels can be injected via children.
 */
export default function CreatorSessionView({
    sessionId,
    roomType,
    children,
}: CreatorSessionViewProps) {
    const { user } = useAuth();
    const { session, endSession } = useRoomSession({ sessionId });
    const { tipEvents, reactionEvents, customRequests, totalEarnings } = useSessionInteractions(sessionId, roomType);
    const { pendingRequests, respondToRequest } = useJoinRequest(sessionId);
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    if (!session) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh", color: "rgba(255,255,255,0.5)" }}>
                Loading session...
            </div>
        );
    }

    if (session.status === "ended") {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: "12px" }}>
                <div style={{ fontSize: "48px" }}>🎬</div>
                <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: 700 }}>Session Ended</h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
                    Total Earnings: <span style={{ color: "hsl(150,80%,60%)", fontWeight: 700 }}>€{totalEarnings.toFixed(2)}</span>
                </p>
            </div>
        );
    }

    const handleEndSession = async () => {
        await endSession();
        setShowEndConfirm(false);
    };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0612 0%, #1a0d2e 50%, #0d0520 100%)" }}>
            <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "16px" }}>

                {/* Top bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                        <h1 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: 0 }}>{session.title}</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                            <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
                                LIVE
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Users size={12} /> {session.viewer_count} viewers
                            </span>
                        </div>
                    </div>

                    {/* Earnings + End */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                            style={{
                                background: "rgba(72,187,120,0.15)",
                                borderRadius: "10px",
                                padding: "8px 16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                            }}
                        >
                            <DollarSign size={16} color="hsl(150,80%,60%)" />
                            <span style={{ color: "hsl(150,80%,60%)", fontSize: "16px", fontWeight: 700 }}>
                                ${totalEarnings.toFixed(2)}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowEndConfirm(true)}
                            style={{
                                background: "rgba(239,68,68,0.15)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                borderRadius: "10px",
                                padding: "8px 16px",
                                color: "#ef4444",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            End Session
                        </button>
                    </div>
                </div>

                {/* Main grid: Stream | Chat + Activity */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "16px" }}>

                    {/* Left: Stream */}
                    <div>
                        <div
                            style={{
                                borderRadius: "14px",
                                overflow: "hidden",
                                background: "#000",
                                aspectRatio: "16/9",
                            }}
                        >
                            <CreatorStream
                                appId={process.env.NEXT_PUBLIC_AGORA_APP_ID || ""}
                                channelName={session.agora_channel}
                                uid={user?.id || "0"}
                            />
                        </div>

                        {/* Pending join requests */}
                        {pendingRequests.length > 0 && (
                            <div style={{ marginTop: "12px" }}>
                                <h3 style={{ color: "#fff", fontSize: "13px", fontWeight: 600, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Clock size={14} color="hsl(45,100%,60%)" />
                                    Pending Join Requests ({pendingRequests.length})
                                </h3>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                    {pendingRequests.map((req) => (
                                        <div
                                            key={req.id}
                                            style={{
                                                background: "rgba(255,255,255,0.05)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: "10px",
                                                padding: "10px 14px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "28px",
                                                    height: "28px",
                                                    borderRadius: "50%",
                                                    background: req.user?.avatar_url
                                                        ? `url(${req.user.avatar_url}) center/cover`
                                                        : "linear-gradient(135deg, hsl(200,80%,50%), hsl(280,80%,60%))",
                                                }}
                                            />
                                            <span style={{ color: "#fff", fontSize: "13px", fontWeight: 600 }}>
                                                {req.user?.username || "Fan"}
                                            </span>
                                            <button
                                                onClick={() => respondToRequest(req.id, "approve")}
                                                style={{
                                                    background: "rgba(72,187,120,0.2)",
                                                    border: "none",
                                                    borderRadius: "6px",
                                                    padding: "4px",
                                                    cursor: "pointer",
                                                    color: "hsl(150,80%,60%)",
                                                }}
                                            >
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => respondToRequest(req.id, "reject")}
                                                style={{
                                                    background: "rgba(239,68,68,0.2)",
                                                    border: "none",
                                                    borderRadius: "6px",
                                                    padding: "4px",
                                                    cursor: "pointer",
                                                    color: "#ef4444",
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Room-specific content */}
                        {children}
                    </div>

                    {/* Right sidebar: Chat + Activity feed */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "calc(100vh - 80px)" }}>
                        {/* Chat */}
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <SessionChatPanel sessionId={sessionId} currentUserId={user?.id} maxHeight="100%" />
                        </div>

                        {/* Activity feed (tips, reactions, requests) */}
                        <div
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                borderRadius: "14px",
                                border: "1px solid rgba(255,255,255,0.08)",
                                padding: "12px",
                                maxHeight: "200px",
                                overflowY: "auto",
                            }}
                        >
                            <h4 style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                                Activity Feed
                            </h4>
                            {[...tipEvents.map(t => ({ type: "tip" as const, ...t })),
                            ...reactionEvents.map(r => ({ type: "reaction" as const, ...r })),
                            ...customRequests.map(r => ({ type: "request" as const, ...r }))]
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .slice(0, 20)
                                .map((event, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                        <span style={{ fontSize: "14px" }}>
                                            {event.type === "tip" ? "💰" : event.type === "reaction" ? (event as any).emoji : "📩"}
                                        </span>
                                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", flex: 1 }}>
                                            <b style={{ color: "#fff" }}>{event.fan_name}</b>
                                            {event.type === "tip" && ` tipped €${event.amount}`}
                                            {event.type === "reaction" && ` sent ${(event as any).emoji}`}
                                            {event.type === "request" && ` requested (€${event.amount})`}
                                        </span>
                                    </div>
                                ))
                            }
                            {tipEvents.length === 0 && reactionEvents.length === 0 && customRequests.length === 0 && (
                                <div style={{ textAlign: "center", padding: "10px", color: "rgba(255,255,255,0.25)", fontSize: "12px" }}>
                                    No activity yet
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* End session confirmation */}
            {showEndConfirm && (
                <div
                    style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, background: "rgba(0,0,0,0.7)" }}
                    onClick={() => setShowEndConfirm(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(145deg, rgba(30,20,50,0.98), rgba(15,10,30,0.99))",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "16px",
                            padding: "28px",
                            maxWidth: "380px",
                            textAlign: "center",
                        }}
                    >
                        <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
                        <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 8px" }}>End Session?</h3>
                        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: "0 0 20px" }}>
                            This will end the live stream for all viewers.
                        </p>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                onClick={() => setShowEndConfirm(false)}
                                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEndSession}
                                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
                            >
                                End Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
