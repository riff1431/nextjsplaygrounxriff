"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Inbox, Heart, HandHeart, Sparkles, Gem, Zap, FolderOpen, Send, Loader2, PartyPopper, XCircle, MessageSquarePlus } from "lucide-react";
import { cs } from "@/utils/currency";

const impulseButtons = [
    { label: "Kiss", price: 5, icon: Heart, color: "from-pink-500 to-rose-400", glow: "hsl(340 90% 55%)", iconColor: "#fff" },
    { label: "Hug", price: 10, icon: HandHeart, color: "from-sky-500 to-cyan-400", glow: "hsl(195 90% 50%)", iconColor: "#fff" },
    { label: "Heart", price: 25, icon: Sparkles, color: "from-fuchsia-500 to-purple-500", glow: "hsl(290 90% 55%)", iconColor: "#fff" },
    { label: "Diamond", price: 50, icon: Gem, color: "from-cyan-400 to-blue-500", glow: "hsl(200 90% 55%)", iconColor: "#fff" },
];

interface RollerPack {
    id: string;
    name: string;
    price: number;
    description?: string;
    media_urls?: string[];
}

interface ImpulsePanelProps {
    roomId: string | null;
    sessionId?: string | null;
    onSpend?: (amount: number, msg: string, mediaUrls?: string[]) => void;
}

export default function ImpulsePanel({ roomId, sessionId, onSpend }: ImpulsePanelProps) {
    const { user } = useAuth();
    const supabase = createClient();
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [requestStatus, setRequestStatus] = useState<"idle" | "submitted" | "accepted" | "declined">("idle");
    const [myRequestId, setMyRequestId] = useState<string | null>(null);
    const [rollerPacks, setRollerPacks] = useState<RollerPack[]>([]);
    const [purchasedPackNames, setPurchasedPackNames] = useState<Set<string>>(new Set());
    const [viewingPack, setViewingPack] = useState<RollerPack | null>(null);

    // Fetch dynamic roller packs
    const fetchPacks = useCallback(async () => {
        if (!roomId) return;
        try {
            const url = sessionId
                ? `/api/v1/rooms/${roomId}/roller-packs?sessionId=${sessionId}`
                : `/api/v1/rooms/${roomId}/roller-packs`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.packs) setRollerPacks(data.packs);
        } catch { /* ignore */ }
    }, [roomId, sessionId]);

    useEffect(() => {
        fetchPacks();
    }, [fetchPacks]);

    // Realtime updates for roller packs
    useEffect(() => {
        if (!roomId) return;
        const channel = supabase
            .channel(`fan-roller-packs-${roomId}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "flash_drop_roller_packs",
                filter: `room_id=eq.${roomId}`,
            }, fetchPacks)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, fetchPacks]);

    // Fetch and listen for purchased packs
    useEffect(() => {
        if (!roomId || !user) return;
        const fetchPurchases = async () => {
            let query = supabase
                .from("flash_drop_requests")
                .select("content")
                .eq("room_id", roomId)
                .eq("fan_id", user.id)
                .like("content", "%💎 Purchased Pack:%");
            if (sessionId) query = query.eq("session_id", sessionId);
            let { data, error } = await query;
            // Fallback if session_id column doesn't exist
            if (error && error.message?.includes('session_id')) {
                ({ data } = await supabase
                    .from("flash_drop_requests")
                    .select("content")
                    .eq("room_id", roomId)
                    .eq("fan_id", user.id)
                    .like("content", "%💎 Purchased Pack:%"));
            }
            
            if (data) {
                const names = new Set<string>();
                data.forEach(req => {
                    const match = req.content.match(/💎 Purchased Pack: (.*?) \(/);
                    if (match && match[1]) {
                        names.add(match[1]);
                    }
                });
                setPurchasedPackNames(names);
            }
        };
        fetchPurchases();

        const channel = supabase
            .channel(`fan-purchases-${roomId}-${sessionId || 'all'}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "flash_drop_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const newReq = payload.new as any;
                // Session isolation: skip purchases from other sessions
                if (sessionId && newReq.session_id && newReq.session_id !== sessionId) return;
                if (newReq.fan_id === user.id && newReq.content.includes("💎 Purchased Pack:")) {
                    const match = newReq.content.match(/💎 Purchased Pack: (.*?) \(/);
                    if (match && match[1]) {
                        setPurchasedPackNames(prev => {
                            const next = new Set(prev);
                            next.add(match[1]);
                            return next;
                        });
                    }
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [roomId, sessionId, user]);

    // Listen for status updates on the fan's own request
    useEffect(() => {
        if (!roomId || !myRequestId) return;
        const channel = supabase
            .channel(`my-request-${myRequestId}`)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "flash_drop_requests",
                filter: `id=eq.${myRequestId}`,
            }, (payload) => {
                const newStatus = (payload.new as any).status;
                if (newStatus === "accepted") {
                    setRequestStatus("accepted");
                    toast.success("🎉 Your drop request was accepted!");
                } else if (newStatus === "declined") {
                    setRequestStatus("declined");
                    toast.error("❌ Your drop request was declined.");
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, myRequestId]);

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const reqAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
        if (isNaN(reqAmount) || reqAmount < 10) {
            toast.error(`Minimum offer is ${cs()}10`);
            return;
        }
        if (reqAmount > 1000) {
            toast.error(`Maximum offer is ${cs()}1000`);
            return;
        }
        if (!description.trim()) {
            toast.error("Please describe what you'd like to see");
            return;
        }
        if (!roomId) {
            toast.error("No active session");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/flash-drops/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: description.trim(), amount: reqAmount }),
            });
            const data = await res.json();
            if (data.success) {
                setMyRequestId(data.request?.id ?? null);
                setRequestStatus("submitted");
                toast.success("📩 Request submitted — waiting for creator!");
                setDescription("");
                setAmount("");
            } else {
                toast.error(data.error || "Failed to submit request");
            }
        } catch {
            toast.error("Network error");
        }
        setSubmitting(false);
    };

    return (
        <div className="flex flex-col gap-2.5 h-full overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(330 100% 55% / 0.3) transparent' }}>
            {/* Reactions */}
            <div className="fd-glass-panel rounded-2xl p-4 border border-white/[0.08]" style={{ background: 'linear-gradient(135deg, hsl(270 50% 4% / 0.7), hsl(330 40% 6% / 0.5))', boxShadow: '0 8px 32px hsl(330 100% 55% / 0.08), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(330 100% 55%), hsl(300 100% 60%))' }}>
                        <Zap size={10} className="text-white" />
                    </div>
                    <h2 className="fd-font-tech text-xs font-black text-white/90 uppercase tracking-[0.15em]">Reactions</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {impulseButtons.map((btn) => {
                        const IconComponent = btn.icon;
                        return (
                            <button
                                key={btn.label}
                                onClick={() => onSpend?.(btn.price, `⚡ Reaction ${btn.label}: ${cs()}${btn.price}`)}
                                className="relative overflow-hidden rounded-xl border border-white/[0.08] hover:border-white/20 transition-all duration-300 group active:scale-[0.96] backdrop-blur-sm"
                                style={{ background: 'linear-gradient(145deg, hsl(270 30% 8% / 0.8), hsl(270 20% 5% / 0.9))' }}
                            >
                                <div className="flex flex-col items-center py-3 px-2 gap-1.5 relative z-10">
                                    {/* Glow ring behind icon */}
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md" style={{ background: btn.glow, transform: 'scale(1.8)' }} />
                                        <div className={`relative w-11 h-11 rounded-full bg-gradient-to-br ${btn.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 border border-white/25`} style={{ boxShadow: `0 4px 16px ${btn.glow.replace('hsl', 'hsla').replace(')', ', 0.35)')}` }}>
                                            <IconComponent size={20} color={btn.iconColor} strokeWidth={2.5} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                                        </div>
                                    </div>
                                    <span className="fd-font-body font-bold text-[10px] text-white/50 group-hover:text-white/80 uppercase tracking-[0.12em] transition-colors">{btn.label}</span>
                                    <span className="fd-font-tech font-black text-xs text-white/90 group-hover:text-white transition-colors" style={{ textShadow: '0 0 8px rgba(255,255,255,0.15)' }}>{cs()}{btn.price}</span>
                                </div>
                                {/* Hover shimmer */}
                                <div className={`absolute inset-0 bg-gradient-to-t ${btn.color} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none`} />
                                <div className="absolute bottom-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(90deg, transparent, ${btn.glow}, transparent)` }} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* High Roller Packs */}
            <div className="fd-glass-panel rounded-2xl p-4 border border-white/[0.08]" style={{ background: 'linear-gradient(135deg, hsl(270 50% 4% / 0.7), hsl(330 40% 6% / 0.5))', boxShadow: '0 8px 32px hsl(330 100% 55% / 0.06), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(40 90% 50%), hsl(30 80% 45%))' }}>
                        <Gem size={10} className="text-white" />
                    </div>
                    <h2 className="fd-font-tech text-[10px] font-black text-white/90 uppercase tracking-[0.15em]">High Roller Packs</h2>
                </div>
                {rollerPacks.length > 0 ? (
                    <div className="space-y-1.5">
                        {[...rollerPacks].reverse().slice(0, 7).map((pack) => {
                            const mediaCount = pack.media_urls?.length || 0;
                            const isPurchased = purchasedPackNames.has(pack.name);
                            return (
                                <div
                                    key={pack.id}
                                    className="rounded-xl border border-white/[0.06] hover:border-primary/40 transition-all group"
                                    style={{ background: 'hsl(270 30% 6% / 0.6)' }}
                                >
                                    <div className="flex items-center gap-2.5 px-3 py-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="fd-font-body font-bold text-xs text-foreground/90 truncate group-hover:text-foreground transition-colors">
                                                {pack.name}
                                            </p>
                                            {mediaCount > 0 && (
                                                <p className="text-[9px] text-primary/70 font-semibold mt-0.5 flex items-center gap-1">
                                                    <FolderOpen size={9} />
                                                    {mediaCount} {mediaCount === 1 ? 'file' : 'files'} included
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="fd-font-tech font-black text-sm fd-neon-text">{cs()}{pack.price}</span>
                                            {isPurchased ? (
                                                <button
                                                    onClick={() => setViewingPack(pack)}
                                                    className="px-3 py-1.5 rounded-lg fd-font-tech font-black text-[9px] text-white uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                                                    style={{
                                                        background: "linear-gradient(135deg, hsl(160 100% 40%), hsl(160 100% 30%))",
                                                        boxShadow: "0 0 12px hsl(160 100% 45% / 0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                                                    }}
                                                >
                                                    View
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onSpend?.(pack.price, `💎 Purchased Pack: ${pack.name} (${cs()}${pack.price})`, pack.media_urls)}
                                                    className="px-3 py-1.5 rounded-lg fd-font-tech font-black text-[9px] text-white uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                                                    style={{
                                                        background: "linear-gradient(135deg, hsl(330 100% 50%), hsl(330 100% 65%))",
                                                        boxShadow: "0 0 12px hsl(330 100% 55% / 0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                                                    }}
                                                >
                                                    Buy
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-foreground/30 text-[10px] py-3 fd-font-body">No packs available yet</p>
                )}
            </div>

            {/* Request A Drop */}
            <div className="rounded-2xl p-4 flex-1 flex flex-col min-h-0 border border-white/[0.08]" style={{ background: 'linear-gradient(160deg, hsl(270 50% 4% / 0.7), hsl(330 50% 8% / 0.5))', boxShadow: '0 8px 32px hsl(330 100% 55% / 0.06), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(280 80% 55%), hsl(330 100% 55%))' }}>
                        <MessageSquarePlus size={10} className="text-white" />
                    </div>
                    <h2 className="fd-font-tech text-[10px] font-black text-white/90 uppercase tracking-[0.15em]">Request A Drop</h2>
                </div>

                {requestStatus === "submitted" && (
                    <div className="mb-2.5 p-2.5 rounded-xl text-[11px] text-yellow-300 text-center font-semibold flex items-center justify-center gap-1.5" style={{ background: 'linear-gradient(135deg, hsl(45 80% 50% / 0.08), hsl(45 80% 50% / 0.04))', border: '1px solid hsl(45 80% 50% / 0.2)' }}>
                        <Loader2 size={12} className="animate-spin" /> Request pending — awaiting creator...
                    </div>
                )}
                {requestStatus === "accepted" && (
                    <div className="mb-2.5 p-2.5 rounded-xl text-[11px] text-green-300 text-center font-semibold flex items-center justify-center gap-1.5" style={{ background: 'hsl(140 60% 40% / 0.08)', border: '1px solid hsl(140 60% 40% / 0.2)' }}>
                        <PartyPopper size={12} /> Your request was accepted!
                    </div>
                )}
                {requestStatus === "declined" && (
                    <div className="mb-2.5 p-2.5 rounded-xl text-[11px] text-red-300 text-center font-semibold flex items-center justify-center gap-1.5" style={{ background: 'hsl(0 60% 40% / 0.08)', border: '1px solid hsl(0 60% 40% / 0.2)' }}>
                        <XCircle size={12} /> Request declined. Try a new one!
                    </div>
                )}

                <form onSubmit={handleSubmitRequest} className="flex flex-col gap-2.5 flex-1 min-h-0">
                    <div className="flex-1 min-h-0 flex flex-col">
                        <label className="fd-font-body font-bold text-[10px] text-white/40 uppercase tracking-wider mb-1.5">What would you like?</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what you'd like to see..."
                            disabled={submitting || requestStatus === "submitted"}
                            className="flex-1 min-h-[70px] w-full rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-white/20 fd-font-body focus:outline-none transition-all resize-none disabled:opacity-40"
                            style={{ background: 'hsl(270 30% 6% / 0.8)', border: '1px solid hsl(330 100% 55% / 0.15)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.5)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 20px hsl(330 100% 55% / 0.1)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.15)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                        />
                    </div>
                    <div>
                        <label className="fd-font-body font-bold text-[10px] text-white/40 uppercase tracking-wider mb-1.5 block">Your Offer</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 fd-font-tech font-black text-sm text-primary/60 pointer-events-none">{cs()}</span>
                            <input
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="10 - 1000"
                                type="number"
                                min="10"
                                max="1000"
                                disabled={submitting || requestStatus === "submitted"}
                                className="w-full rounded-xl pl-8 pr-3.5 py-3 text-sm text-white placeholder:text-white/20 fd-font-tech font-bold focus:outline-none transition-all disabled:opacity-40"
                                style={{ background: 'hsl(270 30% 6% / 0.8)', border: '1px solid hsl(330 100% 55% / 0.15)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.5)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 20px hsl(330 100% 55% / 0.1)'; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'hsl(330 100% 55% / 0.15)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={submitting || !roomId || requestStatus === "submitted"}
                        className="w-full py-3 rounded-xl fd-font-tech font-black text-sm text-white transition-all uppercase tracking-[0.15em] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98] relative overflow-hidden group"
                        style={{
                            background: "linear-gradient(135deg, hsl(330 100% 50%), hsl(300 100% 55%), hsl(330 100% 60%))",
                            boxShadow: "0 4px 20px hsl(330 100% 55% / 0.35), 0 0 40px hsl(330 100% 55% / 0.1), inset 0 1px 0 rgba(255,255,255,0.2)",
                            textShadow: "0 1px 3px rgba(0,0,0,0.3)"
                        }}
                    >
                        <span className="relative z-10">{submitting ? "Submitting..." : requestStatus === "submitted" ? "⏳ Pending..." : "Submit Request"}</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                    </button>
                    {requestStatus !== "idle" && requestStatus !== "submitted" && (
                        <button
                            type="button"
                            onClick={() => { setRequestStatus("idle"); setMyRequestId(null); }}
                            className="w-full py-2 rounded-xl fd-font-tech font-bold text-[10px] text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15 transition-all uppercase tracking-wider"
                        >
                            Make Another Request
                        </button>
                    )}
                </form>
            </div>

            {/* Modal for full view of purchased pack media */}
            {typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {viewingPack && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
                            onClick={() => setViewingPack(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-black/90 border border-primary/40 rounded-xl p-5 sm:p-6 max-w-2xl w-full shadow-[0_0_50px_hsl(330_100%_55%/0.2)] flex flex-col max-h-[90vh]"
                            >
                                <div className="flex items-center justify-between mb-4 shrink-0 border-b border-white/10 pb-4">
                                    <div className="flex flex-col">
                                        <h2 className="text-xl font-black text-primary fd-font-tech tracking-widest uppercase">
                                            💎 Pack Purchased
                                        </h2>
                                        <p className="text-sm text-white/50 font-medium">
                                            {viewingPack.name}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setViewingPack(null)}
                                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all border border-white/10"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="overflow-y-auto flex-1 themed-scrollbar pr-2">
                                    <div className="mb-6 bg-primary/10 border border-primary/20 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Pack Details</p>
                                        <p className="text-base text-white/90 leading-relaxed italic font-medium">
                                            {viewingPack.name} — {cs()}{viewingPack.price}
                                        </p>
                                    </div>

                                    {viewingPack.media_urls && viewingPack.media_urls.length > 0 ? (
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-green-400 uppercase tracking-widest mb-3">
                                                {viewingPack.media_urls.length} Media {viewingPack.media_urls.length === 1 ? 'File' : 'Files'}
                                            </span>
                                            <div className="flex flex-col gap-3">
                                                {viewingPack.media_urls.map((mediaUrl, i) => {
                                                    const isVideo = mediaUrl.match(/\.(mp4|ogg|webm|mov|avi)$/i);
                                                    if (isVideo) {
                                                        return (
                                                            <div key={i}>
                                                                <video src={mediaUrl} controls autoPlay={i === 0} className="w-full max-h-[60vh] rounded-xl border border-primary/40 object-contain bg-black/60 shadow-[0_0_30px_hsl(330_100%_55%/0.2)]" />
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div key={i}>
                                                            <img src={mediaUrl} alt="Pack Media" className="w-full max-h-[60vh] rounded-xl border border-primary/40 object-contain bg-black/60 shadow-[0_0_30px_hsl(330_100%_55%/0.2)]" />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-12 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                <Inbox size={24} className="text-white/20" />
                                            </div>
                                            <p className="text-sm font-bold text-white/40 uppercase tracking-widest">No Media Attached</p>
                                            <p className="text-xs text-white/30 mt-1">This pack has no attachments.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
