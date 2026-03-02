"use client";

import { useState, useEffect } from "react";
import { Diamond } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface SugaRequest {
    id: string;
    fan_name: string;
    message: string;
    amount: number;
    type: string;
    status: "pending" | "accepted" | "declined";
}

const S4uPendingRequests = ({ roomId }: { roomId?: string }) => {
    const supabase = createClient();
    const [requests, setRequests] = useState<SugaRequest[]>([]);

    useEffect(() => {
        if (!roomId) return;

        async function fetchRequests() {
            const { data } = await supabase
                .from("suga_requests")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(20);
            if (data) setRequests(data as SugaRequest[]);
        }
        fetchRequests();

        const channel = supabase
            .channel(`suga-requests-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "suga_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                setRequests((prev) => [payload.new as SugaRequest, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    const handleAction = async (id: string, action: "accepted" | "declined") => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: action } : r))
        );
        if (roomId) {
            await fetch(`/api/v1/rooms/${roomId}/suga/request`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: id, status: action }),
            });
        }
    };

    return (
        <div className="s4u-creator-glass-panel p-4">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3">Pending Requests</h3>
            <div className="space-y-3">
                {requests.length === 0 && (
                    <p className="text-xs text-white/40 text-center py-2">No requests yet</p>
                )}
                {requests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🌸</span>
                            <div>
                                <p className="text-sm font-semibold text-white">{req.fan_name}</p>
                                <p className="text-xs text-white/50">{req.message}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold s4u-creator-text-gold flex items-center gap-1">
                                ${req.amount} <Diamond className="w-3 h-3" />
                            </span>
                            {req.status === "pending" ? (
                                <>
                                    <button
                                        onClick={() => handleAction(req.id, "accepted")}
                                        className="text-xs bg-pink-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, "declined")}
                                        className="text-xs bg-white/10 text-white/60 px-3 py-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                    >
                                        Decline
                                    </button>
                                </>
                            ) : (
                                <span className={`text-xs font-semibold ${req.status === "accepted" ? "text-green-400" : "text-red-400"}`}>
                                    {req.status === "accepted" ? "✓ Accepted" : "✗ Declined"}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default S4uPendingRequests;
