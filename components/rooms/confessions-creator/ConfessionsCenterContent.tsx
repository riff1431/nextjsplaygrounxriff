"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

interface RequestRow {
    id: string;
    fan: string;
    confession: string;
    amount: number;
    type: string;
    status: string;
    created_at: string;
}

const RequestTable = ({
    title,
    subtitle,
    rows,
    onAction,
}: {
    title: string;
    subtitle?: string;
    rows: RequestRow[];
    onAction: (id: string, action: "accepted" | "declined") => void;
}) => {
    const [decisions, setDecisions] = useState<Record<string, "accepted" | "declined">>({});

    const handleAction = (id: string, action: "accepted" | "declined") => {
        setDecisions((prev) => ({ ...prev, [id]: action }));
        onAction(id, action);
    };

    return (
        <div className="conf-glass-card p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="conf-font-cinzel text-white text-xl font-semibold">{title}</h2>
                {subtitle && <span className="text-white/60 text-sm">{subtitle}</span>}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-white/60 border-b border-white/20">
                            <th className="text-left py-2 px-2 font-medium">Fan</th>
                            <th className="text-left py-2 px-2 font-medium">Confession</th>
                            <th className="text-left py-2 px-2 font-medium">Amount</th>
                            <th className="text-center py-2 px-2 font-medium" colSpan={2}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-8 text-white/40">No pending requests</td></tr>
                        ) : rows.map((row) => (
                            <tr key={row.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                <td className="py-3 px-2 text-white font-medium whitespace-nowrap">
                                    {row.fan}
                                </td>
                                <td className="py-3 px-2 text-white/60 max-w-[250px] truncate">
                                    {row.confession}
                                </td>
                                <td className="py-3 px-2 text-amber-400 font-semibold">
                                    ${row.amount}
                                </td>
                                <td className="py-3 px-2 text-center" colSpan={2}>
                                    {decisions[row.id] === "accepted" || row.status === "accepted" ? (
                                        <span className="text-[hsl(140,60%,45%)] font-medium">Accepted</span>
                                    ) : decisions[row.id] === "declined" || row.status === "declined" ? (
                                        <span className="text-[hsl(0,70%,50%)] font-medium">Declined</span>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleAction(row.id, "accepted")}
                                                className="bg-[hsl(40,80%,55%)]/90 hover:bg-[hsl(40,80%,55%)] text-black font-bold text-xs px-4 py-1.5 rounded transition-colors"
                                            >
                                                ACCEPT
                                            </button>
                                            <button
                                                onClick={() => handleAction(row.id, "declined")}
                                                className="border border-white/30 hover:border-white text-white font-bold text-xs px-4 py-1.5 rounded transition-colors"
                                            >
                                                DECLINE
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ConfessionsCenterContent = ({ variant = "confessions" }: { variant?: "confessions" | "random" }) => {
    const { user } = useAuth();
    const supabase = createClient();
    const [requests, setRequests] = useState<RequestRow[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Discover room on mount
    useEffect(() => {
        if (!user) return;
        async function findRoom() {
            const { data } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .limit(1)
                .maybeSingle();
            if (data?.id) setRoomId(data.id);
        }
        findRoom();
    }, [user]);

    const fetchRequests = useCallback(async () => {
        if (!roomId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/request`);
            const data = await res.json();
            if (data.requests) {
                setRequests(data.requests.map((r: any) => ({
                    id: r.id,
                    fan: r.fan_name || r.fan_id?.substring(0, 8) || "Fan",
                    confession: r.topic || r.type,
                    amount: r.amount || 0,
                    type: r.type,
                    status: r.status,
                    created_at: r.created_at,
                })));
            }
        } catch (e) {
            console.error("Failed to fetch requests", e);
        } finally {
            setLoading(false);
        }
    }, [roomId]);

    useEffect(() => {
        if (roomId) {
            fetchRequests();

            // Realtime subscription for new requests
            const channel = supabase
                .channel("creator-confession-requests")
                .on("postgres_changes", {
                    event: "*",
                    schema: "public",
                    table: "confession_requests",
                    filter: `room_id=eq.${roomId}`,
                }, () => { fetchRequests(); })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [roomId, fetchRequests]);

    const handleAction = async (id: string, action: "accepted" | "declined") => {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/request/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: action }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Request ${action}`);
                fetchRequests();
            } else {
                toast.error(data.error || `Failed to ${action}`);
            }
        } catch (e) {
            toast.error("Network error");
        }
    };

    const pendingRequests = requests.filter(r => r.status === "pending");
    const resolvedRequests = requests.filter(r => r.status !== "pending");

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-4 gap-4">
            <RequestTable
                title="Pending Requests"
                subtitle={`${pendingRequests.length} waiting`}
                rows={pendingRequests}
                onAction={handleAction}
            />
            {resolvedRequests.length > 0 && (
                <RequestTable
                    title="Resolved Requests"
                    subtitle={`${resolvedRequests.length} completed`}
                    rows={resolvedRequests}
                    onAction={handleAction}
                />
            )}
        </div>
    );
};

export default ConfessionsCenterContent;
