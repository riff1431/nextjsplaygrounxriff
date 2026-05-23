"use client";

import { useState } from "react";
import { Diamond, MessageSquare } from "lucide-react";
import { useSuga4U } from "@/hooks/useSuga4U";
import CreatorRespondModal from "@/components/rooms/suga4u-creator/CreatorRespondModal";
import { cs } from "@/utils/currency";

const CUSTOM_REQUEST_TYPES = ["POSE", "SHOUTOUT", "QUICK_TEASE", "CUSTOM_CLIP", "ACTION"];
const REACTION_TYPES = ["GIFT"];

const S4uPendingRequests = ({ roomId, sessionId }: { roomId?: string; sessionId?: string }) => {
    const { requests, updateRequestStatus, respondToRequest } = useSuga4U(roomId || null, sessionId || null);
    const [respondingReq, setRespondingReq] = useState<any | null>(null);

    const handleAction = async (id: string, action: "accepted" | "declined") => {
        if (!roomId || !updateRequestStatus) return;
        try {
            await updateRequestStatus(id, action);
        } catch (err) {
            console.error("Failed to update request status:", err);
        }
    };

    const handleRespond = async (responseText: string, responseMediaUrl: string | null) => {
        if (!respondingReq || !respondToRequest) return;
        await respondToRequest(respondingReq.id, responseText, responseMediaUrl);
    };

    const visibleRequests = requests.filter((req) => req.type !== "PRIVATE_1ON1");
    const isCustomType = (type: string) => CUSTOM_REQUEST_TYPES.includes(type);
    const isReaction = (type: string) => REACTION_TYPES.includes(type);

    return (
        <div className="s4u-creator-glass-panel p-3 flex flex-col h-full min-h-0">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-2 shrink-0">Pending Requests</h3>
            
            {visibleRequests.length === 0 ? (
                <p className="text-xs text-white/40 text-center py-4">No requests yet</p>
            ) : (
                <div className="space-y-2 flex-1 overflow-y-auto custom-scroll pr-1">
                    {visibleRequests.map((req) => (
                        <div key={req.id} className="flex flex-col gap-1.5 bg-white/5 rounded-lg p-2.5">
                            {/* Top row: icon + name + price + actions */}
                            <div className="flex gap-2.5 items-start">
                                {/* Icon */}
                                <span className="text-lg shrink-0 mt-0.5">🌸</span>
                                
                                {/* Content Container */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                
                                {/* Top Row: Name, Price, Status/Actions */}
                                <div className="flex items-center justify-between gap-2 w-full">
                                    <p className="text-sm font-semibold text-white truncate flex-1">{req.fanName}</p>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[11px] font-bold s4u-creator-text-gold flex items-center gap-0.5 shrink-0">
                                            {cs()}{req.price} <Diamond className="w-2.5 h-2.5" />
                                        </span>
                                        
                                        {req.status === "pending" ? (
                                            isReaction(req.type) ? (
                                                <span className="text-[10px] font-semibold text-amber-400">🎁 Received</span>
                                            ) : (
                                            <div className="flex items-center gap-1">
                                                {isCustomType(req.type) ? (
                                                    <button
                                                        onClick={() => setRespondingReq(req)}
                                                        className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-md font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-1"
                                                    >
                                                        <MessageSquare className="w-2.5 h-2.5" />
                                                        Respond
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleAction(req.id, "accepted")}
                                                        className="text-[10px] bg-pink-500 text-white px-2.5 py-1 rounded-md font-semibold hover:bg-pink-600 transition-colors"
                                                    >
                                                        Accept
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleAction(req.id, "declined")}
                                                    className="text-[10px] bg-white/10 text-white/60 px-2 py-1 rounded-md hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                            )
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

                            {/* Custom text from fan (if present) */}
                            {req.customText && (
                                <div className="ml-8 bg-black/30 rounded-lg px-3 py-2 border-l-2 border-pink-500/40">
                                    <p className="text-[9px] text-pink-400/60 uppercase tracking-wider mb-0.5">Fan&apos;s Request</p>
                                    <p className="text-[11px] text-white/70 italic">&quot;{req.customText}&quot;</p>
                                </div>
                            )}

                            {/* Creator response (if responded) */}
                            {req.status === "accepted" && (req.responseText || req.responseMediaUrl) && (
                                <div className="ml-8 bg-emerald-500/5 rounded-lg px-3 py-2 border-l-2 border-emerald-500/40">
                                    <p className="text-[9px] text-emerald-400/60 uppercase tracking-wider mb-0.5">Your Response</p>
                                    {req.responseText && (
                                        <p className="text-[11px] text-white/70">{req.responseText}</p>
                                    )}
                                    {req.responseMediaUrl && (
                                        <a href={req.responseMediaUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 underline hover:text-emerald-300 mt-0.5 inline-block">
                                            📎 View attached media
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Creator Respond Modal */}
            {respondingReq && (
                <CreatorRespondModal
                    isOpen={true}
                    onClose={() => setRespondingReq(null)}
                    onSubmit={async (responseText, responseMediaUrl) => {
                        await handleRespond(responseText, responseMediaUrl);
                        setRespondingReq(null);
                    }}
                    fanName={respondingReq.fanName}
                    requestLabel={respondingReq.label}
                    customText={respondingReq.customText || respondingReq.note || null}
                    price={respondingReq.price}
                />
            )}
        </div>
    );
};

export default S4uPendingRequests;
