"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Inbox } from "lucide-react";

const impulseButtons = [
    { label: "Quick Like", price: 5, icon: "⚡" },
    { label: "Hype", price: 10, icon: "👤" },
    { label: "Boost", price: 25, icon: "🚀" },
    { label: "Flex", price: 50, icon: "✉️" },
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
    onSpend?: (amount: number, msg: string, mediaUrls?: string[]) => void;
}

export default function ImpulsePanel({ roomId, onSpend }: ImpulsePanelProps) {
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
            const res = await fetch(`/api/v1/rooms/${roomId}/roller-packs`);
            const data = await res.json();
            if (data.packs) setRollerPacks(data.packs);
        } catch { /* ignore */ }
    }, [roomId]);

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
            const { data } = await supabase
                .from("flash_drop_requests")
                .select("content")
                .eq("room_id", roomId)
                .eq("fan_id", user.id)
                .like("content", "%💎 Purchased Pack:%");
            
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
            .channel(`fan-purchases-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "flash_drop_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const newReq = payload.new as any;
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
    }, [roomId, user]);

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
            toast.error("Minimum offer is €10");
            return;
        }
        if (reqAmount > 1000) {
            toast.error("Maximum offer is €1000");
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
        <div className="flex flex-col gap-2 h-full">
            {/* Impulse Spend */}
            <div className="fd-glass-panel fd-neon-border-md rounded-xl p-3">
                <h2 className="fd-font-tech text-xl font-black text-foreground mb-2.5 tracking-tighter fd-neon-text">Impulse Spend</h2>
                <div className="grid grid-cols-2 gap-2">
                    {impulseButtons.map((btn) => (
                        <button
                            key={btn.label}
                            onClick={() => onSpend?.(btn.price, `⚡ Impulse ${btn.label}: €${btn.price}`)}
                            className="py-2 px-2.5 rounded-xl border border-primary/50 bg-primary/10 hover:bg-primary/20 hover:border-primary/80 transition-all fd-font-body font-bold text-xs text-foreground flex items-center justify-center gap-1.5 group"
                            style={{ boxShadow: "0 0 8px hsl(330 100% 55% / 0.12)" }}
                        >
                            <span className="text-xs opacity-80">{btn.icon}</span>
                            <span>
                                <span className="fd-neon-text-sm italic tracking-tight">{btn.label}:</span>{" "}
                                <span className="fd-font-tech font-black fd-neon-text text-base italic">€{btn.price}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* High Roller Packs */}
            <div className="fd-glass-panel fd-neon-border rounded-xl p-3">
                <h2 className="fd-font-tech text-[11px] font-black fd-neon-text-sm mb-2 uppercase tracking-widest">High Roller Packs</h2>
                {rollerPacks.length > 0 ? (
                    <div className="space-y-2">
                        {[...rollerPacks].reverse().slice(0, 7).map((pack) => {
                            const mediaCount = pack.media_urls?.length || 0;
                            const isPurchased = purchasedPackNames.has(pack.name);
                            return (
                                <div
                                    key={pack.id}
                                    className="rounded-lg border border-primary/25 bg-black/30 hover:border-primary/60 hover:bg-primary/5 transition-all group"
                                    style={{ boxShadow: "0 0 6px hsl(330 100% 55% / 0.05)" }}
                                >
                                    <div className="flex items-center gap-2.5 px-3 py-2">
                                        {/* Pack info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="fd-font-body font-bold text-xs text-foreground/90 truncate group-hover:text-foreground transition-colors">
                                                {pack.name}
                                            </p>
                                            {mediaCount > 0 && (
                                                <p className="text-[9px] text-primary/70 font-semibold mt-0.5 flex items-center gap-1">
                                                    <span>📁</span>
                                                    {mediaCount} {mediaCount === 1 ? 'file' : 'files'} included
                                                </p>
                                            )}
                                        </div>

                                        {/* Price + Buy */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="fd-font-tech font-black text-sm fd-neon-text">€{pack.price}</span>
                                            {isPurchased ? (
                                                <button
                                                    onClick={() => setViewingPack(pack)}
                                                    className="px-2.5 py-1 rounded-lg fd-font-tech font-black text-[10px] text-white uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                                                    style={{
                                                        background: "linear-gradient(135deg, hsl(160 100% 40%), hsl(160 100% 30%))",
                                                        boxShadow: "0 0 12px hsl(160 100% 45% / 0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                                                        textShadow: "0 0 6px rgba(255,255,255,0.3)",
                                                    }}
                                                >
                                                    View
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onSpend?.(pack.price, `💎 Purchased Pack: ${pack.name} (€${pack.price})`, pack.media_urls)}
                                                    className="px-2.5 py-1 rounded-lg fd-font-tech font-black text-[10px] text-white uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                                                    style={{
                                                        background: "linear-gradient(135deg, hsl(330 100% 50%), hsl(330 100% 65%))",
                                                        boxShadow: "0 0 12px hsl(330 100% 55% / 0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                                                        textShadow: "0 0 6px rgba(255,255,255,0.3)",
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
                    <p className="text-center text-foreground/30 text-[10px] py-2 fd-font-body">No packs available yet</p>
                )}
            </div>

            {/* Request A Drop */}
            <div className="fd-glass-panel fd-neon-border rounded-xl p-3 flex-1 flex flex-col min-h-0">
                <h2 className="fd-font-tech text-[11px] font-black fd-neon-text-sm mb-1.5 uppercase tracking-widest">Request A Drop</h2>
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="fd-font-body font-bold text-[10px] text-foreground/70">Custom Request</span>
                </div>

                {requestStatus === "submitted" && (
                    <div className="mb-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-[11px] text-yellow-400 text-center font-semibold">
                        ⏳ Request pending — awaiting creator...
                    </div>
                )}
                {requestStatus === "accepted" && (
                    <div className="mb-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-[11px] text-green-400 text-center font-semibold">
                        🎉 Your request was accepted!
                    </div>
                )}
                {requestStatus === "declined" && (
                    <div className="mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 text-center font-semibold">
                        ❌ Request declined. Try a new one!
                    </div>
                )}

                <form onSubmit={handleSubmitRequest} className="flex flex-col gap-2 mt-1 flex-1 min-h-0">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what you'd like to see..."
                        disabled={submitting || requestStatus === "submitted"}
                        className="flex-1 min-h-0 w-full bg-black/40 border border-primary/40 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-foreground/30 fd-font-body focus:outline-none focus:border-primary/80 focus:shadow-[0_0_15px_hsl(330_100%_55%/0.25)] transition-all resize-none disabled:opacity-50"
                    />
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Offer Amount $..."
                        disabled={submitting || requestStatus === "submitted"}
                        className="shrink-0 w-full bg-black/40 border border-primary/40 rounded-xl px-3 py-3 text-sm text-white placeholder:text-foreground/30 fd-font-body focus:outline-none focus:border-primary/80 focus:shadow-[0_0_15px_hsl(330_100%_55%/0.25)] transition-all disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={submitting || !roomId || requestStatus === "submitted"}
                        className="w-full py-3 rounded-xl fd-font-tech font-black text-sm text-white transition-all uppercase tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: "linear-gradient(to right, #ff00ff, #ff2e92)",
                            boxShadow: "0 0 20px #ff00ff60, 0 0 40px #ff00ff20, inset 0 1px 0 rgba(255,255,255,0.2)",
                            textShadow: "0 0 8px rgba(255,255,255,0.4)"
                        }}
                    >
                        {submitting ? "Submitting..." : requestStatus === "submitted" ? "⏳ Pending..." : "Submit Request"}
                    </button>
                    {requestStatus !== "idle" && requestStatus !== "submitted" && (
                        <button
                            type="button"
                            onClick={() => { setRequestStatus("idle"); setMyRequestId(null); }}
                            className="w-full py-1.5 rounded-xl fd-font-tech font-bold text-xs text-foreground/60 hover:text-foreground border border-border/40 transition-all"
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
                                className="bg-black/90 border border-primary/40 rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-[0_0_50px_hsl(330_100%_55%/0.2)] flex flex-col max-h-[90vh]"
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
                                            {viewingPack.name} — €{viewingPack.price}
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
