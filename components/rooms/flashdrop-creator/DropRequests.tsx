"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, XCircle, Clock, Paperclip, User } from "lucide-react";

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

const DropRequests = ({ className = "", roomId }: { className?: string; roomId?: string }) => {
    const supabase = createClient();
    const [requests, setRequests] = useState<DropRequest[]>([]);
    const [uploadingFor, setUploadingFor] = useState<string | null>(null);
    const [delivering, setDelivering] = useState(false);

    useEffect(() => {
        if (!roomId) return;
        async function fetchRequests() {
            const { data } = await supabase
                .from("flash_drop_requests")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(20);
            if (data) setRequests(data as DropRequest[]);
        }
        fetchRequests();

        const channel = supabase
            .channel(`flash-drop-requests-${roomId}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "flash_drop_requests", filter: `room_id=eq.${roomId}` },
                (payload) => setRequests(prev => [payload.new as DropRequest, ...prev]))
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

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
            <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2 px-3 py-1.5 border-b border-white/8">
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Fan</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Request</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 text-center w-28">Action</span>
            </div>

            {/* Request rows */}
            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0">
                {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-white/20">
                        <Clock size={22} className="opacity-30" />
                        <span className="text-[11px]">No requests yet</span>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-white/5">
                        {requests.map((req) => {
                            const cfg = statusConfig[req.status];
                            const StatusIcon = cfg.icon;
                            return (
                                <div key={req.id}
                                    className="grid grid-cols-[1fr_1.4fr_auto] gap-2 items-center px-3 py-2 hover:bg-white/3 transition-colors">
                                    {/* Fan name */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <User size={10} className="text-primary/70" />
                                        </div>
                                        <span className="text-[11px] font-semibold text-white/85 truncate">{req.fan_name}</span>
                                    </div>

                                    {/* Content + amount */}
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-white/70 truncate leading-tight">{req.content}</p>
                                        <p className="text-[10px] font-bold neon-text">€{req.amount}</p>
                                    </div>

                                    {/* Action area */}
                                    <div className="w-28 flex justify-center">
                                        {req.status === "pending" ? (
                                            uploadingFor === req.id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <label className={`px-2 py-1 rounded-lg text-[10px] font-bold text-white cursor-pointer transition-all ${delivering ? "opacity-50" : "bg-primary/70 hover:bg-primary/90"}`}>
                                                        {delivering ? "…" : "Attach"}
                                                        <input type="file" className="hidden" disabled={delivering}
                                                            onChange={e => { if (e.target.files?.[0]) handleDeliveryUpload(req.id, e.target.files[0]); }} />
                                                    </label>
                                                    <button onClick={() => setUploadingFor(null)} disabled={delivering}
                                                        className="text-[10px] text-white/40 hover:text-white">✕</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => setUploadingFor(req.id)}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-primary border border-primary/60 hover:bg-primary/20 hover:shadow-[0_0_10px_hsl(var(--primary)/0.3)] transition-all">
                                                        <Paperclip size={9} /> Accept
                                                    </button>
                                                    <button onClick={() => handleAction(req.id, "declined")}
                                                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-white/40 border border-white/10 hover:border-red-400/40 hover:text-red-400 transition-all">
                                                        Decline
                                                    </button>
                                                </div>
                                            )
                                        ) : (
                                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                                                <StatusIcon size={9} />
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
