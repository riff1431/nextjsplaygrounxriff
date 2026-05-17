"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, XCircle, Clock, Paperclip, User } from "lucide-react";
import { cs } from "@/utils/currency";

interface DropRequest {
    id: string;
    fan_name: string;
    content: string;
    amount: number;
    status: "pending" | "accepted" | "declined";
}

const statusConfig = {
    pending: { label: "Pending", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30" },
    accepted: { label: "Accepted", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
    declined: { label: "Declined", icon: XCircle, color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
};

const DropRequests = ({ className = "", roomId, sessionId }: { className?: string; roomId?: string; sessionId?: string | null }) => {
    const supabase = createClient();
    const [requests, setRequests] = useState<DropRequest[]>([]);
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const [delivering, setDelivering] = useState(false);

    useEffect(() => {
        if (!roomId) return;
        async function fetchRequests() {
            let query = supabase
                .from("flash_drop_requests")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(20);
            if (sessionId) query = query.eq("session_id", sessionId);
            let { data, error } = await query;
            // Fallback if session_id column doesn't exist yet
            if (error && error.message?.includes('session_id')) {
                ({ data } = await supabase
                    .from("flash_drop_requests")
                    .select("*")
                    .eq("room_id", roomId)
                    .order("created_at", { ascending: false })
                    .limit(20));
            }
            // Filter out impulse spends and pack purchases — they are reactions/instant buys, not custom requests
            if (data) setRequests((data as DropRequest[]).filter(r => !r.content.includes('Impulse') && !r.content.includes('Purchased Pack')));
        }
        fetchRequests();

        const channel = supabase
            .channel(`flash-drop-requests-${roomId}-${sessionId || 'all'}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "flash_drop_requests", filter: `room_id=eq.${roomId}` },
                (payload) => {
                    const newReq = payload.new as DropRequest & { session_id?: string };
                    // Session isolation: skip requests from other sessions
                    if (sessionId && newReq.session_id && newReq.session_id !== sessionId) return;
                    // Skip impulse spends and pack purchases — they are reactions/instant buys, not requests
                    if (newReq.content.includes('Impulse') || newReq.content.includes('Purchased Pack')) return;
                    setRequests(prev => [newReq, ...prev]);
                })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, sessionId]);

    const handleAction = async (id: string, action: "accepted" | "declined", mediaUrl?: string) => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
        if (roomId) {
            await fetch(`/api/v1/rooms/${roomId}/flash-drops/request`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: id, status: action, mediaUrl }),
            });
        }
    };

    const handleDeliveryUpload = async (id: string, file: File) => {
        setDelivering(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", `flash-drops-delivery/${roomId}`);
            const res = await fetch("/api/v1/storage/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (data.success) { await handleAction(id, "accepted", data.publicUrl); setUploadingFor(null); }
        } catch (e) { console.error(e); }
        setDelivering(false);
    };

    return (
        <div className={`flex flex-col min-h-0 ${className}`}>
            {/* Column headers */}
            <div className="grid grid-cols-[0.8fr_1.2fr_auto] gap-3 px-4 py-2 border-b border-white/[0.06]">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">Fan</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">Request</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 text-center w-32">Action</span>
            </div>

            {/* Request rows */}
            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0">
                {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2.5 py-8">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: 'hsl(280 80% 55% / 0.08)', transform: 'scale(2.5)' }} />
                            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(280 80% 55% / 0.08), hsl(330 80% 50% / 0.05))', border: '1px solid hsl(280 80% 55% / 0.1)' }}>
                                <Clock size={18} strokeWidth={1.5} style={{ color: 'hsl(280 80% 60% / 0.4)' }} />
                            </div>
                        </div>
                        <p className="text-[11px] text-white/25 text-center">No requests yet</p>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-white/[0.04]">
                        {requests.map((req) => {
                            const cfg = statusConfig[req.status];
                            const StatusIcon = cfg.icon;
                            return (
                                <div key={req.id}
                                    className="grid grid-cols-[0.8fr_1.2fr_auto] gap-3 items-center px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                                    {/* Fan name */}
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, hsl(330 100% 55% / 0.15), hsl(280 80% 50% / 0.1))', border: '1px solid hsl(330 100% 55% / 0.15)' }}>
                                            <User size={11} style={{ color: 'hsl(330 100% 70%)' }} />
                                        </div>
                                        <span className="text-xs font-semibold text-white/80 truncate">{req.fan_name}</span>
                                    </div>

                                    {/* Request content + amount */}
                                    <div className="min-w-0 flex flex-col gap-0.5">
                                        <p className="text-[11px] text-white/60 truncate leading-tight">{req.content.split(' |__MEDIA__|')[0]}</p>
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold w-fit px-1.5 py-0.5 rounded" style={{ color: 'hsl(330 100% 70%)', background: 'hsl(330 100% 55% / 0.08)', border: '1px solid hsl(330 100% 55% / 0.1)' }}>
                                            {cs()}{req.amount}
                                        </span>
                                    </div>

                                    {/* Action area */}
                                    <div className="w-32 flex justify-center">
                                        {req.status === "pending" ? (
                                            uploadingFor === req.id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <label className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white cursor-pointer transition-all ${delivering ? "opacity-50" : ""}`}
                                                        style={{ background: 'linear-gradient(135deg, hsl(330 100% 50%), hsl(280 80% 55%))', boxShadow: '0 2px 8px hsl(330 100% 55% / 0.2)' }}>
                                                        {delivering ? "…" : "Attach"}
                                                        <input type="file" className="hidden" disabled={delivering}
                                                            onChange={e => { if (e.target.files?.[0]) handleDeliveryUpload(req.id, e.target.files[0]); }} />
                                                    </label>
                                                    <button onClick={() => setUploadingFor(null)} disabled={delivering}
                                                        className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all">
                                                        <XCircle size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => setUploadingFor(req.id)}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.97]"
                                                        style={{ background: 'linear-gradient(135deg, hsl(160 80% 40%), hsl(160 60% 35%))', boxShadow: '0 2px 8px hsl(160 80% 40% / 0.2)' }}>
                                                        <CheckCircle2 size={10} /> Accept
                                                    </button>
                                                    <button onClick={() => handleAction(req.id, "declined")}
                                                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white/35 border border-white/[0.08] hover:border-red-400/30 hover:text-red-400 transition-all">
                                                        Decline
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                                                <StatusIcon size={10} />
                                                {cfg.label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DropRequests;
