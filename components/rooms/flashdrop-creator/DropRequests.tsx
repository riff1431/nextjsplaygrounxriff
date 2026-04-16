"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface DropRequest {
    id: string;
    fan_name: string;
    content: string;
    amount: number;
    status: "pending" | "accepted" | "declined";
}

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
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "flash_drop_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                setRequests((prev) => [payload.new as DropRequest, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

    const handleAction = async (id: string, action: "accepted" | "declined", mediaUrl?: string) => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: action } : r))
        );
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

            const res = await fetch("/api/v1/storage/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                await handleAction(id, "accepted", data.publicUrl);
                setUploadingFor(null);
            }
        } catch (e) {
            console.error(e);
        }
        setDelivering(false);
    };

    return (
        <div className={`glass-panel rounded-xl p-0 flex flex-col min-h-0 ${className}`}>
            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0 rounded-lg">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 font-display text-xs text-muted-foreground tracking-wider">
                                Fan Name
                            </th>
                            <th className="text-left py-2 px-2 font-display text-xs text-muted-foreground tracking-wider">
                                Request
                            </th>
                            <th className="text-center py-2 px-2 font-display text-xs text-muted-foreground tracking-wider">
                                Accept or Decline
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.length === 0 && (
                            <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">No requests yet</td></tr>
                        )}
                        {requests.map((req) => (
                            <tr key={req.id} className="border-b border-border/50">
                                <td className="py-2.5 px-2 font-semibold text-foreground">
                                    {req.fan_name}
                                </td>
                                <td className="py-2.5 px-2 text-muted-foreground">
                                    {req.content} · €{req.amount}
                                </td>
                                <td className="py-2.5 px-2">
                                    {req.status === "pending" ? (
                                        <div className="flex gap-4 justify-center items-center">
                                            {uploadingFor === req.id ? (
                                                <div className="flex items-center gap-2">
                                                    <label className={`px-3 py-1 rounded text-xs font-bold font-display tracking-wider bg-primary text-white cursor-pointer transition-all ${delivering ? 'opacity-50' : 'hover:shadow-[0_0_15px_hsl(var(--neon-pink)/0.5)]'}`}>
                                                        {delivering ? "Uploading..." : "Attach File"}
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            disabled={delivering}
                                                            onChange={(e) => {
                                                                if(e.target.files?.[0]) handleDeliveryUpload(req.id, e.target.files[0]);
                                                            }} 
                                                        />
                                                    </label>
                                                    <button onClick={() => setUploadingFor(null)} disabled={delivering} className="text-xs text-muted-foreground hover:text-white">Cancel</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setUploadingFor(req.id)}
                                                        className="px-3 py-1 rounded text-xs font-bold font-display tracking-wider text-primary border border-primary hover:shadow-[0_0_15px_hsl(var(--neon-pink)/0.5)] transition-all"
                                                    >
                                                        Accept & Deliver
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(req.id, "declined")}
                                                        className="px-3 py-1 rounded text-xs font-bold font-display tracking-wider bg-secondary text-secondary-foreground border border-border hover:border-primary transition-all"
                                                    >
                                                        Decline
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <span
                                            className={`text-xs font-display font-bold tracking-wider ${req.status === "accepted"
                                                ? "text-primary neon-text"
                                                : "text-muted-foreground"
                                                }`}
                                        >
                                            {req.status === "accepted" ? "✓ Accepted" : "✗ Declined"}
                                        </span>
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

export default DropRequests;
