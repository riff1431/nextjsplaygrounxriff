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
        <div className="s4u-creator-glass-panel p-3 flex flex-col h-full min-h-0">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-2 shrink-0">Pending Requests</h3>
            <div className="space-y-2 flex-1 overflow-y-auto custom-scroll pr-1">
                {requests.length === 0 && (
                    <p className="text-xs text-white/40 text-center py-2">No requests yet</p>
                )}
                {requests.map((req) => (
                    <div key={req.id} className="flex gap-2.5 bg-white/5 rounded-lg p-2.5 items-start">
                        {/* Icon */}
                        <span className="text-lg shrink-0 mt-0.5">🌸</span>
                        
                        {/* Content Container */}
                        <div className="flex-1 min-w-0 flex flex-col">
                            
                            {/* Top Row: Name, Price, Status/Actions */}
                            <div className="flex items-center justify-between gap-2 w-full">
                                <p className="text-sm font-semibold text-white truncate flex-1">{req.fanName}</p>
                                
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[11px] font-bold s4u-creator-text-gold flex items-center gap-0.5 shrink-0">
                                        ${req.price} <Diamond className="w-2.5 h-2.5" />
                                    </span>
                                    
                                    {req.status === "pending" ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleAction(req.id, "accepted")}
                                                className="text-[10px] bg-pink-500 text-white px-2.5 py-1 rounded-md font-semibold hover:bg-pink-600 transition-colors"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, "declined")}
                                                className="text-[10px] bg-white/10 text-white/60 px-2 py-1 rounded-md hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={`text-[10px] font-semibold ${req.status === "accepted" ? "text-green-400" : "text-red-400"}`}>
                                            {req.status === "accepted" ? "✓ Accepted" : "✗ Declined"}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Bottom Row: Description */}
                            <p className="text-[11px] text-white/50 truncate mt-0.5 w-full pr-2" title={`${req.label} ${req.note ? `- ${req.note}` : ""}`}>
                                {req.label} {req.note ? ` - ${req.note}` : ""}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default S4uPendingRequests;
