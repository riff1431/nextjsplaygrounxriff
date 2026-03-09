"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

const impulseButtons = [
    { label: "Quick Like", price: 5, icon: "⚡" },
    { label: "Hype", price: 10, icon: "👤" },
    { label: "Boost", price: 25, icon: "🚀" },
    { label: "Flex", price: 50, icon: "✉️" },
];

const highRollerPacks = [
    { name: "Boost My Rank", price: 150 },
    { name: "Priority Unlock Pass", price: 300 },
    { name: "Golden Key (Vault Access)", price: 750 },
    { name: "Diamond Patron", price: 1500 },
    { name: "Private Drop Sponsor", price: 2500 },
    { name: "Legend Crown (Room-wide)", price: 250 },
];

interface ImpulsePanelProps {
    roomId: string | null;
    onSpend?: (amount: number, msg: string) => void;
}

export default function ImpulsePanel({ roomId, onSpend }: ImpulsePanelProps) {
    const { user } = useAuth();
    const supabase = createClient();
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [requestStatus, setRequestStatus] = useState<"idle" | "submitted" | "accepted" | "declined">("idle");
    const [myRequestId, setMyRequestId] = useState<string | null>(null);

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
        if (isNaN(reqAmount) || reqAmount < 250) {
            toast.error("Minimum offer is $250");
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
        <div className="flex flex-col gap-2">
            {/* Impulse Spend */}
            <div className="fd-glass-panel fd-neon-border-md rounded-xl p-3">
                <h2 className="fd-font-tech text-xl font-black text-foreground mb-2.5 tracking-tighter fd-neon-text">Impulse Spend</h2>
                <div className="grid grid-cols-2 gap-2">
                    {impulseButtons.map((btn) => (
                        <button
                            key={btn.label}
                            onClick={() => onSpend?.(btn.price, `⚡ Impulse ${btn.label}: $${btn.price}`)}
                            className="py-2 px-2.5 rounded-xl border border-primary/50 bg-primary/10 hover:bg-primary/20 hover:border-primary/80 transition-all fd-font-body font-bold text-xs text-foreground flex items-center justify-center gap-1.5 group"
                            style={{ boxShadow: "0 0 8px hsl(330 100% 55% / 0.12)" }}
                        >
                            <span className="text-xs opacity-80">{btn.icon}</span>
                            <span>
                                <span className="fd-neon-text-sm italic tracking-tight">{btn.label}:</span>{" "}
                                <span className="fd-font-tech font-black fd-neon-text text-base italic">${btn.price}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* High Roller Packs */}
            <div className="fd-glass-panel fd-neon-border rounded-xl p-3">
                <h2 className="fd-font-tech text-[11px] font-black fd-neon-text-sm mb-2 uppercase tracking-widest">High Roller Packs</h2>
                <div className="space-y-1">
                    {highRollerPacks.map((pack) => (
                        <button
                            key={pack.name}
                            onClick={() => onSpend?.(pack.price, `💎 Purchased Pack: ${pack.name} ($${pack.price})`)}
                            className="w-full flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-primary/15 border border-transparent hover:border-primary/40 transition-all group"
                        >
                            <span className="fd-font-body font-bold text-xs text-foreground/85 group-hover:text-foreground transition-colors">
                                {pack.name}
                            </span>
                            <span className="fd-font-tech font-black text-sm fd-neon-text shrink-0 ml-2">
                                ${pack.price.toLocaleString()}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Request A Drop */}
            <div className="fd-glass-panel fd-neon-border rounded-xl p-3">
                <h2 className="fd-font-tech text-[11px] font-black fd-neon-text-sm mb-1.5 uppercase tracking-widest">Request A Drop</h2>
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="fd-font-body font-bold text-[10px] text-foreground/70">Custom Request</span>
                    <span className="fd-font-tech text-[10px] font-black fd-neon-text uppercase tracking-tighter">$250 min</span>
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

                <form onSubmit={handleSubmitRequest} className="space-y-2">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what you'd like to see..."
                        rows={2}
                        disabled={submitting || requestStatus === "submitted"}
                        className="w-full bg-black/40 border border-primary/40 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-foreground/30 fd-font-body focus:outline-none focus:border-primary/80 focus:shadow-[0_0_15px_hsl(330_100%_55%/0.25)] transition-all resize-none disabled:opacity-50"
                    />
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Offer Amount $... (min $250)"
                        disabled={submitting || requestStatus === "submitted"}
                        className="w-full bg-black/40 border border-primary/40 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-foreground/30 fd-font-body focus:outline-none focus:border-primary/80 focus:shadow-[0_0_15px_hsl(330_100%_55%/0.25)] transition-all disabled:opacity-50"
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
        </div>
    );
}
