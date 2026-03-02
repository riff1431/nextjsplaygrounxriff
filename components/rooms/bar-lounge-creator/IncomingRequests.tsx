"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface Request {
    id: string;
    fan_name: string;
    message: string;
    status: "pending" | "accepted" | "declined";
    amount: number;
}

const IncomingRequests = ({ roomId }: { roomId?: string }) => {
    const supabase = createClient();
    const [requests, setRequests] = useState<Request[]>([]);

    useEffect(() => {
        if (!roomId) return;

        async function fetchRequests() {
            const { data } = await supabase
                .from("bar_lounge_requests")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(20);
            if (data) setRequests(data as Request[]);
        }
        fetchRequests();

        const channel = supabase
            .channel(`bar-lounge-requests-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "bar_lounge_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                setRequests((prev) => [payload.new as Request, ...prev]);
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
                            <p className="text-sm" style={{ color: "hsla(300, 20%, 95%, 0.9)" }}>{req.message}</p>
                        </div>
                        {req.status === "pending" ? (
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleAction(req.id, "accepted")}
                                    className="px-3 py-1 rounded text-xs font-medium border hover:opacity-80 transition-colors"
                                    style={{
                                        borderColor: "hsla(45, 90%, 55%, 0.5)",
                                        color: "hsl(45, 90%, 55%)",
                                        background: "hsla(45, 90%, 55%, 0.1)",
                                    }}
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => handleAction(req.id, "declined")}
                                    className="px-3 py-1 rounded text-xs font-medium border hover:opacity-80 transition-colors"
                                    style={{
                                        borderColor: "hsla(320, 80%, 60%, 0.5)",
                                        color: "hsl(320, 80%, 60%)",
                                        background: "hsla(320, 80%, 60%, 0.1)",
                                    }}
                                >
                                    Decline
                                </button>
                            </div>
                        ) : (
                            <button
                                className="px-3 py-1 rounded text-xs font-medium border"
                                style={
                                    req.status === "accepted"
                                        ? {
                                            borderColor: "hsla(45, 90%, 55%, 0.5)",
                                            color: "hsl(45, 90%, 55%)",
                                            background: "hsla(45, 90%, 55%, 0.1)",
                                        }
                                        : {
                                            borderColor: "hsla(320, 80%, 60%, 0.5)",
                                            color: "hsl(320, 80%, 60%)",
                                            background: "hsla(320, 80%, 60%, 0.1)",
                                        }
                                }
                            >
                                {req.status === "accepted" ? "Accepted" : "Declined"}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IncomingRequests;
