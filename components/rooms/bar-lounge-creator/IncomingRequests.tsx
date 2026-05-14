"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle, X } from "lucide-react";
import CreatorReplyModal from "./CreatorReplyModal";
import { cs } from "@/utils/currency";

interface Request {
    id: string;
    fan_name: string;
    message: string;
    label: string;
    status: "pending" | "accepted" | "declined";
    amount: number;
    type: string;
    created_at?: string;
}

/* ── Minimal toast for creator side ─── */
interface CreatorToast { id: number; msg: string; }
function useCreatorToasts() {
    const [toasts, setToasts] = useState<CreatorToast[]>([]);
    const push = useCallback((msg: string) => {
        const id = Date.now() + Math.random();
        setToasts(p => [...p, { id, msg }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
    }, []);
    const dismiss = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);
    return { toasts, push, dismiss };
}

/* ── Emoji for request type ─── */
function typeEmoji(type: string): string {
    switch (type) {
        case "drink": return "🍸";
        case "tip": return "💰";
        case "vip": return "👑";
        case "booth": return "🛋️";
        case "pin": return "📌";
        case "champagne": return "🥂";
        case "vip_bottle": return "🍾";
        case "song": return "🎵";
        case "custom": return "📩";
        default: return "⚡";
    }
}

/* ── Types that are auto-completed (no accept/decline needed) ─── */
const AUTO_COMPLETED_TYPES = new Set(["drink", "tip", "champagne", "vip_bottle", "pin"]);

interface IncomingRequestsProps {
    roomId?: string;
    sessionId?: string | null;
    pendingPrivateCalls?: any[];
    onAcceptPrivateCall?: (callId: string) => void;
    onDeclinePrivateCall?: (callId: string) => void;
}

const IncomingRequests = ({ roomId, sessionId, pendingPrivateCalls = [], onAcceptPrivateCall, onDeclinePrivateCall }: IncomingRequestsProps) => {
    const supabase = createClient();
    const [requests, setRequests] = useState<Request[]>([]);
    const { toasts, push: showToast, dismiss } = useCreatorToasts();
    
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    useEffect(() => {
        if (!roomId) return;

        const fetchRequests = async () => {
            let query = supabase
                .from("bar_lounge_requests")
                .select("*")
                .eq("room_id", roomId)
                .not("type", "in", '("drink","tip","champagne","vip_bottle","pin")')
                .order("created_at", { ascending: false })
                .limit(50);
            
            // Scope to current session
            if (sessionId) query = query.eq("session_id", sessionId);

            const { data } = await query;
            if (data) {
                setRequests(data as Request[]);
            }
        };
        fetchRequests();

        const channel = supabase
            .channel(`bar-lounge-requests-${roomId}-${sessionId || 'all'}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "bar_lounge_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const req = payload.new as Request;

                // Ignore requests from other sessions
                if (sessionId && (req as any).session_id && (req as any).session_id !== sessionId) return;

                // Ignore drink/tip/etc from visual list
                if (!AUTO_COMPLETED_TYPES.has(req.type)) {
                    // Add to list, keeping only the 50 most recent
                    setRequests((prev) => [req, ...prev].slice(0, 50));
                }

                // Creator toast notification (still show for everything)
                const emoji = typeEmoji(req.type);
                showToast(`${emoji} ${req.fan_name || "A fan"} ${req.type === "tip" ? "sent" : "bought"} ${req.label || req.type} — +${cs()}${req.amount}`);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, sessionId]);

    const handleAction = async (id: string, action: "accepted" | "declined", creatorReply?: any) => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: action } : r))
        );
        if (roomId) {
            await fetch(`/api/v1/rooms/${roomId}/bar-lounge/request`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: id, status: action, creatorReply }),
            });
        }
    };

    const handleSendReply = (requestId: string, replyData: { text?: string; mediaUrl?: string; mediaType?: string }) => {
        handleAction(requestId, "accepted", replyData);
    };

    const formatTimeAgo = (dateStr?: string) => {
        if (!dateStr) return "";
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    return (
        <>
            {/* Creator toast stack — fixed top-left so it doesn't overlap other UI */}
            {toasts.length > 0 && (
                <div style={{
                    position: "fixed", top: "80px", left: "24px", zIndex: 9999,
                    display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "none",
                }}>
                    {toasts.map(t => (
                        <div key={t.id} style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            padding: "12px 16px", borderRadius: "0.75rem",
                            backdropFilter: "blur(16px)",
                            background: "hsla(42,60%,15%,0.95)",
                            border: "1px solid hsla(42,90%,55%,0.5)",
                            boxShadow: "0 0 20px hsla(42,90%,55%,0.3)",
                            color: "hsl(45,100%,95%)",
                            fontFamily: "'Montserrat', sans-serif",
                            fontSize: "14px", fontWeight: 500,
                            minWidth: "280px", maxWidth: "380px",
                            animation: "slideInLeft 0.3s ease",
                            pointerEvents: "all",
                        }}>
                            <CheckCircle style={{ width: "18px", height: "18px", color: "hsl(42,90%,55%)", flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{t.msg}</span>
                            <button onClick={() => dismiss(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsla(45,100%,95%,0.5)", padding: "2px", display: "flex" }}>
                                <X style={{ width: "14px", height: "14px" }} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <style>{`@keyframes slideInLeft { from { opacity:0; transform: translateX(-24px); } to { opacity:1; transform: translateX(0); } }`}</style>

            <div className="glass-panel p-4 h-full flex flex-col w-full overflow-hidden">
                <h2 className="text-lg font-semibold text-gold font-title mb-3">Incoming</h2>
                <div className="space-y-2 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "hsla(42,90%,55%,0.3) transparent" }}>
                    {requests.length === 0 && pendingPrivateCalls.length === 0 && (
                        <p className="text-sm text-white/40">No requests yet</p>
                    )}
                    
                    {/* Private calls at the top */}
                    {pendingPrivateCalls.map((call) => (
                        <div key={call.callId} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all" style={{
                            background: "hsla(320,40%,20%,0.3)",
                            border: "1px solid hsla(320,60%,45%,0.3)",
                        }}>
                            <span style={{ fontSize: "20px", flexShrink: 0 }}>📞</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold truncate" style={{ color: "hsla(45,100%,95%,0.9)" }}>
                                        {call.fanName || "A fan"}
                                    </span>
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{
                                        background: "hsla(320,80%,60%,0.15)",
                                        color: "hsl(320,80%,70%)",
                                        border: "1px solid hsla(320,80%,60%,0.25)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                    }}>
                                        1-on-1
                                    </span>
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: "hsla(45,100%,95%,0.5)", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    Private Video Call
                                    <span style={{ color: "hsl(42,90%,55%)", fontWeight: 700, marginLeft: "6px" }}>{cs()}500</span>
                                </p>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                                <button
                                    onClick={() => onAcceptPrivateCall?.(call.callId)}
                                    className="px-3 py-1 rounded text-xs font-medium border hover:opacity-80 transition-colors"
                                    style={{ borderColor: "hsla(45, 90%, 55%, 0.5)", color: "hsl(45, 90%, 55%)", background: "hsla(45, 90%, 55%, 0.1)" }}
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => onDeclinePrivateCall?.(call.callId)}
                                    className="px-3 py-1 rounded text-xs font-medium border hover:opacity-80 transition-colors"
                                    style={{ borderColor: "hsla(320, 80%, 60%, 0.5)", color: "hsl(320, 80%, 60%)", background: "hsla(320, 80%, 60%, 0.1)" }}
                                >
                                    Decline
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Standard Requests */}
                    {requests.map((req) => {
                        const isAutoCompleted = AUTO_COMPLETED_TYPES.has(req.type);
                        const emoji = typeEmoji(req.type);

                        return (
                            <div key={req.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all" style={{
                                background: isAutoCompleted
                                    ? "hsla(42,60%,20%,0.15)"
                                    : "hsla(280,40%,20%,0.2)",
                                border: `1px solid ${isAutoCompleted ? "hsla(42,90%,55%,0.15)" : "hsla(280,60%,45%,0.2)"}`,
                            }}>
                                {/* Emoji icon */}
                                <span style={{ fontSize: "20px", flexShrink: 0 }}>{emoji}</span>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold truncate" style={{ color: "hsla(45,100%,95%,0.9)" }}>
                                            {req.fan_name || "A fan"}
                                        </span>
                                        {req.type !== 'custom' && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{
                                                background: isAutoCompleted ? "hsla(42,90%,55%,0.15)" : "hsla(280,80%,60%,0.15)",
                                                color: isAutoCompleted ? "hsl(42,90%,55%)" : "hsl(280,80%,70%)",
                                                border: `1px solid ${isAutoCompleted ? "hsla(42,90%,55%,0.25)" : "hsla(280,80%,60%,0.25)"}`,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                            }}>
                                                {req.type === 'tip' ? 'Drink' : req.type}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs mt-0.5" style={{ color: "hsla(45,100%,95%,0.5)", display: "-webkit-box", WebkitLineClamp: req.type === 'custom' ? 3 : 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                        {req.label || req.message || req.type}
                                        {req.amount != null && req.amount > 0 && (
                                            <span style={{ color: "hsl(42,90%,55%)", fontWeight: 700, marginLeft: "6px" }}>{cs()}{req.amount}</span>
                                        )}
                                        {req.created_at && (
                                            <span style={{ marginLeft: "6px", color: "hsla(45,100%,95%,0.3)" }}>· {formatTimeAgo(req.created_at)}</span>
                                        )}
                                    </p>
                                </div>

                                {/* Action / Status */}
                                {isAutoCompleted ? (
                                    <CheckCircle style={{ width: "16px", height: "16px", color: "hsl(140,70%,55%)", flexShrink: 0 }} />
                                ) : req.status === "pending" ? (
                                    <div className="flex flex-col gap-1 shrink-0">
                                        <button
                                            onClick={() => {
                                                if (req.type === "custom") {
                                                    setSelectedRequest(req);
                                                    setReplyModalOpen(true);
                                                } else {
                                                    handleAction(req.id, "accepted");
                                                }
                                            }}
                                            className="px-3 py-1 rounded text-xs font-medium border hover:opacity-80 transition-colors"
                                            style={{ borderColor: "hsla(45, 90%, 55%, 0.5)", color: "hsl(45, 90%, 55%)", background: "hsla(45, 90%, 55%, 0.1)" }}
                                        >
                                            {req.type === "custom" ? "Reply" : "Accept"}
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, "declined")}
                                            className="px-3 py-1 rounded text-xs font-medium border hover:opacity-80 transition-colors"
                                            style={{ borderColor: "hsla(320, 80%, 60%, 0.5)", color: "hsl(320, 80%, 60%)", background: "hsla(320, 80%, 60%, 0.1)" }}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                ) : (
                                    <span
                                        className="px-3 py-1 rounded text-xs font-medium border shrink-0"
                                        style={req.status === "accepted"
                                            ? { borderColor: "hsla(45, 90%, 55%, 0.5)", color: "hsl(45, 90%, 55%)", background: "hsla(45, 90%, 55%, 0.1)" }
                                            : { borderColor: "hsla(320, 80%, 60%, 0.5)", color: "hsl(320, 80%, 60%)", background: "hsla(320, 80%, 60%, 0.1)" }
                                        }
                                    >
                                        {req.status === "accepted" ? "Accepted" : "Declined"}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <CreatorReplyModal
                isOpen={replyModalOpen}
                onClose={() => { setReplyModalOpen(false); setSelectedRequest(null); }}
                request={selectedRequest}
                onSend={handleSendReply}
            />
        </>
    );
};

export default IncomingRequests;
