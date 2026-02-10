"use client";

import React, { useState, useEffect } from "react";
import ConfessionsRoomPreview from "@/app/rooms/confessions/page";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { Check, X, Send, Clock, DollarSign, MessageSquare } from "lucide-react";

/**
 * Creator Studio — Confessions Manager
 * ------------------------------------
 * Wraps the Fan View but adds a Creator Control Panel for managing requests.
 */

export default function ConfessionsStudioPage() {
    const { user, role } = useAuth(); // role should be 'creator'
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Delivery Modal
    const [deliveringReq, setDeliveringReq] = useState<any | null>(null);
    const [deliveryContent, setDeliveryContent] = useState("");

    // Identify Room ID (Hardcoded for this MVP demo, ideally from context/route)
    // The Fan View uses 'default-room' fallback if param missing. 
    // We need to match that or get it from URL if this page is under dynamic route.
    // Assuming this page is /creator/studio/confessions, we might hardcode or fetch user's room.
    // For this specific 'playground', let's assume 'default-room' or fetch the creator's room.
    const roomId = "default-room"; // To match Fan View fallback

    const supabase = createClient();

    useEffect(() => {
        if (user) {
            fetchRequests();
        }
    }, [user]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/requests`);
            const data = await res.json();
            if (data.requests) setRequests(data.requests);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (reqId: string, action: string, content?: string) => {
        try {
            const body: any = { action };
            if (content) body.deliveryContent = content;

            const res = await fetch(`/api/v1/rooms/${roomId}/requests/${reqId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.success) {
                if (action === "deliver") {
                    setDeliveringReq(null);
                    setDeliveryContent("");
                    alert("Content delivered! Waiting for fan approval.");
                }
                fetchRequests();
            } else {
                alert("Error: " + data.error);
            }
        } catch (e) {
            alert("Update failed");
        }
    };

    return (
        <div className="relative">
            {/* 1. Underlying Fan View (Preview) */}
            <div className={isPanelOpen ? "mr-80 transition-all duration-300 pointer-events-none opacity-50 absolute inset-0 overflow-hidden" : "w-full transition-all duration-300"}>
                {/* Hack: Render Fan View but disable interaction when panel is open to focus creator */}
                <div className={isPanelOpen ? "pointer-events-none" : ""}>
                    <ConfessionsRoomPreview />
                </div>
            </div>

            {/* If Panel Closed, show toggle */}
            {!isPanelOpen && (
                <button
                    onClick={() => setIsPanelOpen(true)}
                    className="fixed bottom-6 right-6 z-50 bg-rose-600 text-white px-4 py-2 rounded-full shadow-lg font-bold hover:bg-rose-700 transition"
                >
                    Open Creator Panel
                </button>
            )}

            {/* 2. Creator Management Panel (Sidebar) */}
            <div className={`fixed top-0 right-0 bottom-0 w-96 bg-gray-900 border-l border-white/10 shadow-2xl z-40 transform transition-transform duration-300 ${isPanelOpen ? "translate-x-0" : "translate-x-full"} overflow-y-auto custom-scrollbar`}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-rose-200">Request Queue</h2>
                        <button onClick={() => setIsPanelOpen(false)} className="text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                            <div className="text-xs text-gray-400">Pending Revenue</div>
                            <div className="text-lg font-bold text-yellow-500">
                                ${requests.filter(r => r.status === 'pending_approval' || r.status === 'in_progress').reduce((acc, r) => acc + Number(r.amount), 0)}
                            </div>
                        </div>
                        <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                            <div className="text-xs text-gray-400">Completed</div>
                            <div className="text-lg font-bold text-green-500">
                                ${requests.filter(r => r.status === 'completed').reduce((acc, r) => acc + Number(r.amount), 0)}
                            </div>
                        </div>
                    </div>

                    {/* Requests List */}
                    <div className="space-y-4">
                        {loading && <div className="text-center text-gray-500 py-4">Loading...</div>}

                        {!loading && requests.length === 0 && (
                            <div className="text-center text-gray-500 py-10">No requests found.</div>
                        )}

                        {requests.map(req => (
                            <div key={req.id} className="bg-black/40 border border-white/10 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${req.status === 'pending_approval' ? 'border-yellow-500/30 text-yellow-500' :
                                                req.status === 'in_progress' ? 'border-blue-500/30 text-blue-500' :
                                                    req.status === 'delivered' ? 'border-green-500/30 text-green-500' :
                                                        'border-gray-500/30 text-gray-500'
                                            }`}>
                                            {req.status === 'pending_approval' ? 'New' : req.status}
                                        </span>
                                        <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded-lg text-xs">
                                        ${req.amount}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="text-xs text-gray-400 mb-1">Topic:</div>
                                    <div className="text-sm text-gray-100 font-medium italic">"{req.topic}"</div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        Requested Type: <span className="text-gray-300">{req.type}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                {req.status === 'pending_approval' && (
                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                        <button
                                            onClick={() => handleUpdateStatus(req.id, 'accept')}
                                            className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/40 py-2 rounded-lg text-sm font-medium transition"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(req.id, 'reject')}
                                            className="bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40 py-2 rounded-lg text-sm font-medium transition"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                )}

                                {req.status === 'in_progress' && (
                                    <button
                                        onClick={() => setDeliveringReq(req)}
                                        className="w-full mt-2 bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/40 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                                    >
                                        <Send className="w-4 h-4" /> Deliver Content
                                    </button>
                                )}

                                {req.status === 'delivered' && (
                                    <div className="mt-2 text-xs text-yellow-500 text-center bg-yellow-500/10 py-2 rounded border border-yellow-500/20 flex items-center justify-center gap-2">
                                        <Clock className="w-3 h-3" /> Waiting for Fan Approval
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Delivery Modal */}
            {deliveringReq && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-rose-200">Deliver Request</h3>
                            <button onClick={() => setDeliveringReq(null)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <div className="mb-4 p-3 bg-black/40 rounded-xl border border-white/5">
                            <div className="text-sm text-gray-300 mb-1">Format: <span className="text-rose-400">{deliveringReq.type}</span></div>
                            <div className="text-sm text-gray-400 italic">"{deliveringReq.topic}"</div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-2 block">Content (Text or URL)</label>
                                <textarea
                                    value={deliveryContent}
                                    onChange={(e) => setDeliveryContent(e.target.value)}
                                    placeholder={deliveringReq.type === 'Text' ? "Write your confession here..." : "Paste your media URL here..."}
                                    className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-rose-500 outline-none resize-none"
                                />
                            </div>

                            <button
                                onClick={() => handleUpdateStatus(deliveringReq.id, 'deliver', deliveryContent)}
                                disabled={!deliveryContent.trim()}
                                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                            >
                                Send Delivery
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
