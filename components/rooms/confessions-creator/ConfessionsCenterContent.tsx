"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import CreatorDeliveryModal from "./CreatorDeliveryModal";

interface RequestRow {
    id: string;
    room_id: string;
    fan: string;
    fan_name: string;
    is_anonymous: boolean;
    confession: string;
    amount: number;
    type: string;
    topic: string;
    status: string;
    delivery_content?: string;
    delivery_media_url?: string;
    created_at: string;
}

const RequestTable = ({
    title,
    subtitle,
    rows,
    onAction,
    onAcceptAndDeliver,
}: {
    title: string;
    subtitle?: string;
    rows: RequestRow[];
    onAction: (id: string, action: "in_progress" | "rejected") => void;
    onAcceptAndDeliver?: (row: RequestRow) => void;
}) => {
    const [decisions, setDecisions] = useState<Record<string, "in_progress" | "rejected">>({});

    const handleReject = (id: string) => {
        setDecisions((prev) => ({ ...prev, [id]: "rejected" }));
        onAction(id, "rejected");
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
                                    {row.is_anonymous ? "🔒 Anonymous" : row.fan_name || row.fan}
                                </td>
                                <td className="py-3 px-2 text-white/60 max-w-[250px] truncate">
                                    {row.topic || row.confession}
                                </td>
                                <td className="py-3 px-2 text-amber-400 font-semibold">
                                    ${row.amount}
                                </td>
                                <td className="py-3 px-2 text-center" colSpan={2}>
                                    {row.status === "in_progress" || decisions[row.id] === "in_progress" ? (
                                        <span className="text-blue-400 font-medium">In Progress</span>
                                    ) : row.status === "delivered" ? (
                                        <span className="text-emerald-400 font-medium">Delivered</span>
                                    ) : row.status === "completed" ? (
                                        <span className="text-emerald-400 font-medium">✓ Completed</span>
                                    ) : decisions[row.id] === "rejected" || row.status === "rejected" ? (
                                        <span className="text-[hsl(0,70%,50%)] font-medium">Declined</span>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onAcceptAndDeliver?.(row)}
                                                className="bg-[hsl(40,80%,55%)]/90 hover:bg-[hsl(40,80%,55%)] text-black font-bold text-xs px-4 py-1.5 rounded transition-colors"
                                            >
                                                ACCEPT
                                            </button>
                                            <button
                                                onClick={() => handleReject(row.id)}
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

const ConfessionsCenterContent = ({ variant = "confessions", roomId: roomIdProp, sessionId }: { variant?: "confessions" | "random"; roomId?: string | null; sessionId?: string | null }) => {
    const { user } = useAuth();
    const supabase = createClient();
    const [requests, setRequests] = useState<RequestRow[]>([]);
    const [globalRequests, setGlobalRequests] = useState<RequestRow[]>([]);
    const [roomId, setRoomId] = useState<string | null>(roomIdProp ?? null);
    const [loading, setLoading] = useState(true);
    const [deliveryRequest, setDeliveryRequest] = useState<RequestRow | null>(null);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [activeView, setActiveView] = useState<"my" | "global">("my");

    // Sync roomId from prop when it changes
    useEffect(() => {
        if (roomIdProp) setRoomId(roomIdProp);
    }, [roomIdProp]);

    // Fallback: discover room on mount if not passed as prop
    useEffect(() => {
        if (roomId || !user) return;
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
    }, [user, roomId]);

    const fetchRequests = useCallback(async () => {
        if (!roomId) return;
        setLoading(true);
        try {
            let query = supabase.from('confession_requests').select('*');
            if (sessionId) {
                query = query.eq('session_id', sessionId);
            } else {
                query = query.eq('room_id', roomId);
            }
            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error("[ConfessionsCenter] DB Error:", error);
                toast.error(`Database Error: ${error.message}`);
                return;
            }

            if (data) {
                setRequests(data.map((r: any) => ({
                    id: r.id,
                    room_id: r.room_id || roomId,
                    fan: r.fan_name || r.fan_id?.substring(0, 8) || "Fan",
                    fan_name: r.fan_name || "Anonymous",
                    is_anonymous: r.is_anonymous ?? true,
                    confession: r.topic || r.type,
                    amount: r.amount || 0,
                    type: r.type,
                    topic: r.topic || "",
                    status: r.status,
                    delivery_content: r.delivery_content,
                    delivery_media_url: r.delivery_media_url,
                    created_at: r.created_at,
                })));
            }
        } catch (e: any) {
            console.error("[ConfessionsCenter] Unexpected error:", e);
            toast.error(`Unexpected Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }, [roomId, supabase]);

    const fetchGlobalRequests = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/confessions/global?_t=${Date.now()}`);
            const data = await res.json();
            if (data.requests) {
                setGlobalRequests(data.requests.map((r: any) => ({
                    id: r.id,
                    room_id: r.room_id,
                    fan: r.fan_name || "Fan",
                    fan_name: r.fan_name || "Anonymous",
                    is_anonymous: r.is_anonymous ?? true,
                    confession: r.topic || r.type,
                    amount: r.amount || 0,
                    type: r.type,
                    topic: r.topic || "",
                    status: r.status,
                    delivery_content: r.delivery_content,
                    delivery_media_url: r.delivery_media_url,
                    created_at: r.created_at,
                })));
            }
        } catch (e) {
            console.error("[ConfessionsCenter] Failed to fetch global requests", e);
        }
    }, []);

    useEffect(() => {
        if (roomId) {
            fetchRequests();

            // Realtime subscription for new requests
            const filterQuery = sessionId ? `session_id=eq.${sessionId}` : `room_id=eq.${roomId}`;
            const channel = supabase
                .channel(`creator-confession-requests-${sessionId || roomId}`)
                .on("postgres_changes", {
                    event: "INSERT",
                    schema: "public",
                    table: "confession_requests",
                    filter: filterQuery,
                }, (payload: any) => {
                    const newReq = payload.new;
                    toast.info(`💜 New confession request: €${newReq.amount} — "${(newReq.topic || '').substring(0, 40)}"`);
                    fetchRequests();
                })
                .on("postgres_changes", {
                    event: "UPDATE",
                    schema: "public",
                    table: "confession_requests",
                    filter: filterQuery,
                }, () => { fetchRequests(); })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [roomId, fetchRequests]);

    // Fetch and subscribe to global requests
    useEffect(() => {
        fetchGlobalRequests();

        const channel = supabase
            .channel("global-confession-requests")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "confession_requests",
            }, (payload: any) => {
                if (payload.new?.confession_mode === 'global' || payload.old?.confession_mode === 'global') {
                    fetchGlobalRequests();
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchGlobalRequests]);

    const handleAction = async (id: string, action: "in_progress" | "rejected") => {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/request/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: action }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(action === "rejected" ? "Request declined" : `Request ${action}`);
                fetchRequests();
            } else {
                toast.error(data.error || `Failed to ${action}`);
            }
        } catch (e) {
            toast.error("Network error");
        }
    };

    const handleAcceptAndDeliver = async (row: RequestRow) => {
        // First accept the request
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/request/${row.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "in_progress" }),
            });
            const data = await res.json();
            if (data.success) {
                // Then open the delivery modal
                setDeliveryRequest({ ...row, room_id: roomId, status: "in_progress" });
                setShowDeliveryModal(true);
                fetchRequests();
            } else {
                toast.error(data.error || "Failed to accept");
            }
        } catch (e) {
            toast.error("Network error");
        }
    };

    const handleGlobalAccept = async (row: RequestRow) => {
        try {
            const res = await fetch(`/api/v1/confessions/global/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ request_id: row.id }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Global request accepted! 🎉");
                fetchGlobalRequests();
                fetchRequests();
                // Open delivery modal
                setDeliveryRequest({ ...row, room_id: roomId || row.room_id, status: "in_progress" });
                setShowDeliveryModal(true);
            } else {
                toast.error(data.error || "Failed to accept");
            }
        } catch (e) {
            toast.error("Network error");
        }
    };

    const pendingRequests = requests.filter(r => r.status === "pending_approval");
    const activeRequests = requests.filter(r => r.status === "in_progress");
    const resolvedRequests = requests.filter(r => !["pending_approval", "in_progress"].includes(r.status));

    return (
        <>
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-4 gap-4">
                {/* Tab Bar: My Requests vs Global Requests */}
                <div className="conf-glass-card p-1 flex gap-1 shrink-0">
                    <button
                        onClick={() => setActiveView("my")}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeView === "my"
                                ? "bg-white/15 text-white conf-font-cinzel"
                                : "text-white/50 hover:text-white/70 hover:bg-white/5"
                        }`}
                    >
                        My Requests
                    </button>
                    <button
                        onClick={() => setActiveView("global")}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                            activeView === "global"
                                ? "bg-white/15 text-white conf-font-cinzel"
                                : "text-white/50 hover:text-white/70 hover:bg-white/5"
                        }`}
                    >
                        Global Requests
                        {globalRequests.length > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-[hsl(340,80%,55%)] text-white rounded-full">
                                {globalRequests.length}
                            </span>
                        )}
                    </button>
                </div>

                {activeView === "my" ? (
                    <>
                        <RequestTable
                            title="Pending Requests"
                            subtitle={`${pendingRequests.length} waiting`}
                            rows={pendingRequests}
                            onAction={handleAction}
                            onAcceptAndDeliver={handleAcceptAndDeliver}
                        />
                        {activeRequests.length > 0 && (
                            <RequestTable
                                title="In Progress"
                                subtitle={`${activeRequests.length} active`}
                                rows={activeRequests}
                                onAction={handleAction}
                                onAcceptAndDeliver={handleAcceptAndDeliver}
                            />
                        )}
                        {resolvedRequests.length > 0 && (
                            <RequestTable
                                title="Resolved"
                                subtitle={`${resolvedRequests.length} completed`}
                                rows={resolvedRequests}
                                onAction={handleAction}
                            />
                        )}
                    </>
                ) : (
                    <RequestTable
                        title="Global Requests"
                        subtitle={`${globalRequests.length} available`}
                        rows={globalRequests}
                        onAction={handleAction}
                        onAcceptAndDeliver={handleGlobalAccept}
                    />
                )}
            </div>

            <CreatorDeliveryModal
                isOpen={showDeliveryModal}
                onClose={() => setShowDeliveryModal(false)}
                request={deliveryRequest}
                onDelivered={fetchRequests}
            />
        </>
    );
};

export default ConfessionsCenterContent;
