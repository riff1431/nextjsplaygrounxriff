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
                    <div key={req.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🌸</span>
                            <div>
                                <p className="text-sm font-semibold text-white">{req.fanName}</p>
                                <p className="text-xs text-white/50">{req.label} {req.note ? ` - ${req.note}` : ""}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold s4u-creator-text-gold flex items-center gap-1">
                                ${req.price} <Diamond className="w-3 h-3" />
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
