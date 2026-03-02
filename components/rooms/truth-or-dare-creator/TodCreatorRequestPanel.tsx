"use client";

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface TodRequest {
    id: string;
    fan_name: string;
    content: string;
    type: string;
    tier: string;
    amount: number;
    status: "pending" | "accepted" | "declined";
}

interface TodCreatorRequestPanelProps {
    title: string;
    requestType: "truth" | "dare";
    roomId?: string;
    accentColor: "pink" | "blue";
}

const TodCreatorRequestPanel = ({ title, requestType, roomId, accentColor }: TodCreatorRequestPanelProps) => {
    const supabase = createClient();
    const [requests, setRequests] = useState<TodRequest[]>([]);
    const borderClass = accentColor === "pink" ? "tod-creator-neon-border-pink" : "tod-creator-neon-border-blue";
    const iconColor = accentColor === "pink" ? "tod-creator-text-neon-pink" : "tod-creator-text-neon-blue";

    useEffect(() => {
        if (!roomId) return;

        async function fetchRequests() {
            const { data } = await supabase
                .from("truth_dare_requests")
                .select("*")
                .eq("room_id", roomId)
                .ilike("type", `%${requestType}%`)
                .order("created_at", { ascending: false })
                .limit(20);
            if (data) setRequests(data as TodRequest[]);
        }
        fetchRequests();

        const channel = supabase
            .channel(`tod-requests-${requestType}-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "truth_dare_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const newReq = payload.new as TodRequest;
                if (newReq.type?.toLowerCase().includes(requestType)) {
                    setRequests((prev) => [newReq, ...prev]);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, requestType]);

    const handleAction = async (id: string, action: "accepted" | "declined") => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: action } : r))
        );
        if (roomId) {
            await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/request`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: id, status: action }),
            });
        }
    };

    return (
        <div className={`tod-creator-panel-bg rounded-xl ${borderClass} p-4 flex flex-col`}>
            <div className="flex items-center gap-2 mb-3">
                <Zap className={`w-4 h-4 ${iconColor}`} />
                <h3 className="font-bold text-white">{title}</h3>
            </div>
            <div className="space-y-2.5 flex-1 overflow-y-auto min-h-0">
                {requests.length === 0 && (
                    <p className="text-xs text-white/40 text-center py-2">No requests yet</p>
                )}
                {requests.map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0">
                            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-blue-500 rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-white">{r.fan_name} · ${r.amount}</p>
                            <p className="text-xs text-white/60 truncate">{r.content || r.type}</p>
                        </div>
                        {r.status === "pending" ? (
                            <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                    onClick={() => handleAction(r.id, "accepted")}
                                    className="px-2.5 py-1 text-xs rounded tod-creator-bg-neon-green text-white font-semibold hover:opacity-80 transition-opacity"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => handleAction(r.id, "declined")}
                                    className="px-2.5 py-1 text-xs rounded border border-white/20 text-white/60 font-semibold hover:opacity-80 transition-opacity"
                                >
                                    Decline
                                </button>
                            </div>
                        ) : (
                            <span className={`text-xs font-semibold ${r.status === "accepted" ? "text-green-400" : "text-white/40"}`}>
                                {r.status === "accepted" ? "✓ Accepted" : "✗ Declined"}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TodCreatorRequestPanel;
