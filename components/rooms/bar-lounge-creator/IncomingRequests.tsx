"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle, X } from "lucide-react";

interface Request {
    id: string;
    fan_name: string;
    message: string;
    label: string;
    status: "pending" | "accepted" | "declined";
    amount: number;
    type: string;
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

const IncomingRequests = ({ roomId }: { roomId?: string }) => {
    const supabase = createClient();
    const [requests, setRequests] = useState<Request[]>([]);
    const { toasts, push: showToast, dismiss } = useCreatorToasts();

    useEffect(() => {
        if (!roomId) return;

        const TIP_TYPES = ["drink", "tip", "champagne", "vip_bottle", "vip", "pin"];

        const fetchRequests = async () => {
            const { data } = await supabase
                .from("bar_lounge_requests")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(40);
            
            if (data) {
                const filtered = (data as Request[]).filter(r => !TIP_TYPES.includes(r.type));
                setRequests(filtered);
            }
        };
        fetchRequests();

        const channel = supabase
            .channel(`bar-lounge-requests-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "bar_lounge_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const req = payload.new as Request;

                if (!TIP_TYPES.includes(req.type)) {
                    setRequests((prev) => [req, ...prev]);
                }

                // Creator toast notification works for ALL types (including tips!)
                const emoji = req.type === "drink" ? "🍸" : req.type === "tip" ? "💰" : req.type === "vip" ? "👑" : req.type === "booth" ? "🛋️" : req.type === "pin" ? "📌" : "⚡";
                showToast(`${emoji} ${req.fan_name || "A fan"} ${req.type === "tip" ? "sent" : "bought"} ${req.label || req.type} — +€${req.amount}`);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    const handleAction = async (id: string, action: "accepted" | "declined") => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: action } : r))
        );
        if (roomId) {
            await fetch(`/api/v1/rooms/${roomId}/bar-lounge/request`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: id, status: action }),
            });
        }
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

            <div className="glass-panel p-4 h-full flex flex-col w-full">
                <h2 className="text-lg font-semibold text-gold font-title mb-3">Incoming Requests</h2>
                <div className="space-y-3">
                    {requests.length === 0 && (
                        <p className="text-sm text-white/40">No requests yet</p>
                    )}
                    {requests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/50">{req.fan_name} · ${req.amount}</p>
                                <p className="text-sm" style={{ color: "hsla(300, 20%, 95%, 0.9)" }}>{req.label || req.message}</p>
                            </div>
                            {req.status === "pending" ? (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleAction(req.id, "accepted")}
                                        className="px-3 py-1 rounded text-xs font-medium border hover:opacity-80 transition-colors"
                                        style={{ borderColor: "hsla(45, 90%, 55%, 0.5)", color: "hsl(45, 90%, 55%)", background: "hsla(45, 90%, 55%, 0.1)" }}
                                    >
                                        Accept
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
                                <button
                                    className="px-3 py-1 rounded text-xs font-medium border"
                                    style={req.status === "accepted"
                                        ? { borderColor: "hsla(45, 90%, 55%, 0.5)", color: "hsl(45, 90%, 55%)", background: "hsla(45, 90%, 55%, 0.1)" }
                                        : { borderColor: "hsla(320, 80%, 60%, 0.5)", color: "hsl(320, 80%, 60%)", background: "hsla(320, 80%, 60%, 0.1)" }
                                    }
                                >
                                    {req.status === "accepted" ? "Accepted" : "Declined"}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default IncomingRequests;
