"use client";

import React, { useState } from "react";
import { useRoomSession } from "@/hooks/useRoomSession";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SessionChatPanel from "./SessionChatPanel";
import FanStream from "@/components/rooms/FanStream";
import { DollarSign, Heart, Send, Wallet, Loader2, Flag } from "lucide-react";
import ReportModal from "@/components/common/ReportModal";

interface FanSessionViewProps {
    sessionId: string;
    roomType: string;
    /** Room-specific panels */
    children?: React.ReactNode;
}

/**
 * Complete fan watching session view — shared across all rooms.
 * Composes: FanStream + Chat + Tips/Reactions/Custom-Request buttons
 */
export default function FanSessionView({
    sessionId,
    roomType,
    children,
}: FanSessionViewProps) {
    const { user } = useAuth();
    const { session } = useRoomSession({ sessionId });
    const { reactions, sendTip, sendReaction, sendCustomRequest, isLoading: interactionLoading } = useSessionInteractions(sessionId, roomType);
    const { balance } = useWallet();
    const [showTipModal, setShowTipModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [tipAmount, setTipAmount] = useState("5");
    const [requestText, setRequestText] = useState("");
    const [requestAmount, setRequestAmount] = useState("10");
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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
                    Thanks for watching!
                </p>
            </div>
        );
    }

    const showFeedback = (msg: string) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(null), 3000);
    };

    const handleTip = async () => {
        const result = await sendTip(Number(tipAmount));
        if (result?.success) {
            showFeedback(`💰 Tipped €${tipAmount}!`);
            setShowTipModal(false);
        } else {
            showFeedback(result?.error || "Tip failed");
        }
    };

    const handleReaction = async (reactionId: string, emoji: string) => {
        const result = await sendReaction(reactionId);
        if (result?.success) {
            showFeedback(`${emoji} Sent!`);
        } else {
            showFeedback(result?.error || "Reaction failed");
        }
    };

    const handleCustomRequest = async () => {
        if (!requestText.trim()) return;
        const result = await sendCustomRequest(requestText.trim(), Number(requestAmount));
        if (result?.success) {
            showFeedback(`📩 Request sent for €${requestAmount}!`);
            setShowRequestModal(false);
            setRequestText("");
        } else {
            showFeedback(result?.error || "Request failed");
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0612 0%, #1a0d2e 50%, #0d0520 100%)" }}>
            <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "16px" }}>

                {/* Top bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                        <h1 style={{ color: "#fff", fontSize: "18px", fontWeight: 700, margin: 0 }}>{session.title}</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                            <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
                                LIVE
                            </span>
                            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
                                by {session.creator?.username || "Creator"}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "10px", padding: "6px 14px" }}>
                        <Wallet size={14} color="hsl(150,80%,60%)" />
                        <span style={{ color: "hsl(150,80%,60%)", fontSize: "14px", fontWeight: 600 }}>€{(balance || 0).toFixed(2)}</span>
                    </div>
                </div>

                {/* Main grid: Stream | Chat */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "16px" }}>

                    {/* Left: Stream + Actions */}
                    <div>
                        <div style={{ borderRadius: "14px", overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
                            <FanStream
                                appId={process.env.NEXT_PUBLIC_AGORA_APP_ID || ""}
                                channelName={session.agora_channel}
                                uid={user?.id || "0"}
                                hostId={session.creator_id}
                            />
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                            {/* Tip */}
                            <button
                                onClick={() => setShowTipModal(true)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "10px 18px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, hsl(45,100%,50%), hsl(25,100%,50%))",
                                    color: "#fff",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                <DollarSign size={14} /> Send Tip
                            </button>

                            {/* Custom Request */}
                            <button
                                onClick={() => setShowRequestModal(true)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "10px 18px",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, hsl(280,100%,55%), hsl(330,90%,50%))",
                                    color: "#fff",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                <Send size={14} /> Custom Request
                            </button>

                            {/* Reaction buttons */}
                            {reactions.map((rx) => (
                                <button
                                    key={rx.id}
                                    onClick={() => handleReaction(rx.id, rx.emoji)}
                                    disabled={interactionLoading}
                                    title={`${rx.name} — €${rx.price}`}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "8px 12px",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        background: "rgba(255,255,255,0.05)",
                                        color: "#fff",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <span style={{ fontSize: "16px" }}>{rx.emoji}</span>
                                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>€{rx.price}</span>
                                </button>
                            ))}
                            
                            {/* Report */}
                            <button
                                onClick={() => setIsReportModalOpen(true)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "8px 12px",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(239,68,68,0.2)",
                                    background: "rgba(239,68,68,0.05)",
                                    color: "#ef4444",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    marginLeft: "auto"
                                }}
                            >
                                <Flag size={14} /> Report
                            </button>
                        </div>

                        {/* Room-specific content */}
                        {children}
                    </div>

                    {/* Right: Chat */}
                    <div style={{ maxHeight: "calc(100vh - 80px)" }}>
                        <SessionChatPanel sessionId={sessionId} currentUserId={user?.id} maxHeight="100%" />
                    </div>
                </div>
            </div>

            {/* Feedback toast */}
            {feedback && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "30px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(30,20,50,0.95)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        padding: "12px 24px",
                        color: "#fff",
                        fontSize: "14px",
                        fontWeight: 600,
                        zIndex: 10001,
                        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                    }}
                >
                    {feedback}
                </div>
            )}

            {/* Tip modal */}
            {showTipModal && (
                <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, background: "rgba(0,0,0,0.7)" }} onClick={() => setShowTipModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: "linear-gradient(145deg, rgba(30,20,50,0.98), rgba(15,10,30,0.99))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "360px" }}>
                        <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 16px", textAlign: "center" }}>💰 Send a Tip</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px" }}>
                            {[2, 5, 10, 20].map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => setTipAmount(String(amt))}
                                    style={{
                                        padding: "10px",
                                        borderRadius: "10px",
                                        border: tipAmount === String(amt) ? "2px solid hsl(45,100%,55%)" : "1px solid rgba(255,255,255,0.12)",
                                        background: tipAmount === String(amt) ? "rgba(255,200,0,0.12)" : "rgba(255,255,255,0.04)",
                                        color: "#fff",
                                        fontSize: "15px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    ${amt}
                                </button>
                            ))}
                        </div>
                        <input
                            type="number"
                            value={tipAmount}
                            onChange={(e) => setTipAmount(e.target.value)}
                            min={1}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px 14px", color: "#fff", fontSize: "14px", outline: "none", marginBottom: "16px", boxSizing: "border-box" }}
                        />
                        <button onClick={handleTip} disabled={interactionLoading} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, hsl(45,100%,50%), hsl(25,100%,50%))", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
                            {interactionLoading ? "Sending..." : `Send €${tipAmount} Tip`}
                        </button>
                    </div>
                </div>
            )}

            {/* Custom request modal */}
            {showRequestModal && (
                <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, background: "rgba(0,0,0,0.7)" }} onClick={() => setShowRequestModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: "linear-gradient(145deg, rgba(30,20,50,0.98), rgba(15,10,30,0.99))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "440px" }}>
                        <h3 style={{ color: "#fff", fontSize: "16px", fontWeight: 700, margin: "0 0 16px", textAlign: "center" }}>📩 Custom Request</h3>
                        <textarea
                            value={requestText}
                            onChange={(e) => setRequestText(e.target.value)}
                            placeholder="What would you like the creator to do?"
                            maxLength={500}
                            rows={3}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "12px 14px", color: "#fff", fontSize: "14px", outline: "none", resize: "none", fontFamily: "inherit", marginBottom: "12px", boxSizing: "border-box" }}
                        />
                        <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>Amount ($)</label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px" }}>
                            {[5, 10, 25, 50].map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => setRequestAmount(String(amt))}
                                    style={{
                                        padding: "8px",
                                        borderRadius: "10px",
                                        border: requestAmount === String(amt) ? "2px solid hsl(280,100%,65%)" : "1px solid rgba(255,255,255,0.12)",
                                        background: requestAmount === String(amt) ? "rgba(159,90,253,0.12)" : "rgba(255,255,255,0.04)",
                                        color: "#fff",
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                    }}
                                >
                                    ${amt}
                                </button>
                            ))}
                        </div>
                        <button onClick={handleCustomRequest} disabled={interactionLoading || !requestText.trim()} style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, hsl(280,100%,55%), hsl(330,90%,50%))", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: "pointer", opacity: requestText.trim() ? 1 : 0.5 }}>
                            {interactionLoading ? "Sending..." : `Send Request — €${requestAmount}`}
                        </button>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {session && (
                 <ReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    targetId={session.id}
                    targetType="room"
                    targetName={session.title}
                 />
            )}
        </div>
    );
}
