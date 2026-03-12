"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

interface XChatRequest {
    id: string;
    fan_name: string;
    message: string;
    avatar_url?: string;
    status: "pending" | "accepted" | "declined";
}

const IncomingRequests = ({ roomId }: { roomId?: string }) => {
    const supabase = createClient();
    const [requests, setRequests] = useState<XChatRequest[]>([]);

    useEffect(() => {
        if (!roomId) return;

        async function fetchRequests() {
            const { data } = await supabase
                .from("x_chat_requests")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(20);
            if (data) setRequests(data as XChatRequest[]);
        }
        fetchRequests();

        const channel = supabase
            .channel(`x-chat-requests-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "x_chat_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload: any) => {
                setRequests((prev) => [payload.new as XChatRequest, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    const handleAction = async (id: string, action: "accepted" | "declined") => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: action } : r))
        );
        if (roomId) {
            await fetch(`/api/v1/rooms/${roomId}/x-chat/request`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: id, status: action }),
            });
        }
    };

    return (
        <div className="panel-glass rounded-lg flex flex-col min-h-0 flex-1">
            <div className="px-4 py-3 border-b border-border flex-shrink-0">
                <h2 className="font-display text-sm tracking-widest gold-text text-center">
                    ⭐ INCOMING REQUESTS
                </h2>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin flex-1">
                {requests.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No requests yet</p>
                )}
                {requests.map((r, i) => (
                    <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-2 rounded-lg bg-secondary/50"
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-black/40 border border-border">
                            {r.avatar_url ? (
                                <img src={r.avatar_url} alt={r.fan_name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl text-center leading-none">😎</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{r.fan_name}</p>
                            <p className="text-xs text-muted-foreground">⭐ {r.message}</p>
                            {r.status === "pending" ? (
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => handleAction(r.id, "accepted")}
                                        className="bg-success text-success-foreground text-xs font-bold px-4 py-1 rounded hover:opacity-90 transition-opacity"
                                    >
                                        ACCEPT
                                    </button>
                                    <button
                                        onClick={() => handleAction(r.id, "declined")}
                                        className="bg-secondary text-foreground text-xs font-bold px-4 py-1 rounded border border-border hover:bg-muted transition-colors"
                                    >
                                        DECLINE
                                    </button>
                                </div>
                            ) : (
                                <span className={`text-xs font-bold mt-1 inline-block ${r.status === "accepted" ? "text-green-400" : "text-muted-foreground"}`}>
                                    {r.status === "accepted" ? "✓ Accepted" : "✗ Declined"}
                                </span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default IncomingRequests;
