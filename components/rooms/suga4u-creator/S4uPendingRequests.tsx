"use client";

import { Diamond } from "lucide-react";
import { useSuga4U } from "@/hooks/useSuga4U";

const S4uPendingRequests = ({ roomId }: { roomId?: string }) => {
    const { requests } = useSuga4U(roomId || null);

    const handleAction = async (id: string, action: "accepted" | "declined") => {
        if (!roomId) return;
        try {
            await fetch(`/api/v1/rooms/${roomId}/suga/requests`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: id, status: action }),
            });
        } catch (err) {
            console.error("Failed to update request status:", err);
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
                    <div key={req.id} className="flex flex-col gap-2 bg-white/5 rounded-lg p-3">
                        {/* Top Profile & Details */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xl shrink-0">🌸</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{req.fanName}</p>
                                    <p className="text-[11px] text-white/50 leading-tight line-clamp-2 mt-0.5" title={`${req.label} ${req.note ? `- ${req.note}` : ""}`}>
                                        {req.label} {req.note ? ` - ${req.note}` : ""}
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm font-bold s4u-creator-text-gold flex items-center gap-1 shrink-0 mt-0.5">
                                ${req.price} <Diamond className="w-3 h-3" />
                            </span>
                        </div>
                        
                        {/* Bottom Actions Row */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-1">
                            {req.status === "pending" ? (
                                <>
                                    <button
                                        onClick={() => handleAction(req.id, "accepted")}
                                        className="text-xs bg-pink-500 text-white py-1.5 rounded-lg font-semibold hover:bg-pink-600 transition-colors flex-1 text-center"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, "declined")}
                                        className="text-xs bg-white/10 text-white/60 py-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors flex-1 text-center"
                                    >
                                        Decline
                                    </button>
                                </>
                            ) : (
                                <div className="flex-1 text-right">
                                    <span className={`text-xs font-semibold ${req.status === "accepted" ? "text-green-400" : "text-red-400"}`}>
                                        {req.status === "accepted" ? "✓ Accepted" : "✗ Declined"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default S4uPendingRequests;
