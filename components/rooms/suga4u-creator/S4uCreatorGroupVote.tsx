"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Flame } from "lucide-react";

interface CampaignState {
    isActive: boolean;
    label: string;
    description: string;
    target: number;
    price: number;
    current: number;
}

const DEFAULT_STATE: CampaignState = {
    isActive: false, label: "", description: "", target: 50, price: 10, current: 0
};

interface S4uCreatorGroupVoteProps {
    roomId?: string | null;
}

const S4uCreatorGroupVote = ({ roomId }: S4uCreatorGroupVoteProps) => {
    const supabase = createClient();
    const [state, setState] = useState<CampaignState>(DEFAULT_STATE);
    const [loading, setLoading] = useState(false);

    // Form fields
    const [form, setForm] = useState({ label: "", description: "", target: "50", price: "10" });

    // Fetch initial state
    useEffect(() => {
        if (!roomId) return;

        const fetchState = async () => {
            const { data: room } = await supabase
                .from("rooms")
                .select("group_vote_state")
                .eq("id", roomId)
                .single();

            if (room?.group_vote_state) {
                const s = room.group_vote_state as any;
                setState({ ...DEFAULT_STATE, ...s });
                
                if (s.isActive) {
                    setForm({ 
                        label: s.label || "", 
                        description: s.description || "",
                        target: String(s.target || 50), 
                        price: String(s.price || 10) 
                    });
                }
            }
        };

        fetchState();
    }, [roomId]);

    // Real-time subscription
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`s4u-gv-${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "rooms",
                    filter: `id=eq.${roomId}`,
                },
                (payload) => {
                    const newData = payload.new as any;
                    if (newData?.group_vote_state) {
                        setState({ ...DEFAULT_STATE, ...newData.group_vote_state });
                    }
                }
            )
            .on("broadcast", { event: "group_vote_update" }, (payload) => {
                const updatedState = payload.payload as CampaignState;
                setState((prev) => ({
                    ...prev,
                    current: updatedState.current ?? prev.current,
                    target: updatedState.target ?? prev.target,
                    isActive: updatedState.isActive ?? prev.isActive,
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const handleAction = useCallback(
        async (action: "START" | "STOP") => {
            if (!roomId) return;
            setLoading(true);

            try {
                const body: any = { action };
                if (action === "START") {
                    if (!form.label.trim()) {
                        toast.error("Please enter a title for the campaign");
                        setLoading(false);
                        return;
                    }
                    body.label = form.label;
                    body.description = form.description;
                    body.target = Number(form.target) || 50;
                    body.price = Number(form.price) || 10;
                }

                const res = await fetch(`/api/v1/rooms/${roomId}/suga/group-vote`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                toast.success(
                    action === "START"
                        ? `Group vote campaign started!`
                        : `Group vote campaign stopped.`
                );

            } catch (e: any) {
                toast.error(e.message || "Failed to update campaign");
            } finally {
                setLoading(false);
            }
        },
        [roomId, form]
    );

    const progress = state.target > 0 ? Math.min(100, (state.current / state.target) * 100) : 0;
    const isCompleted = state.isActive && state.current >= state.target;

    // Check if it just completed to show notification (simple version)
    useEffect(() => {
        if (isCompleted && !loading) {
            toast.success("Goal Reached!", { description: `Group Vote "${state.label}" fulfilled.` });
        }
    }, [state.current, state.target, isCompleted]);

    return (
        <div className="s4u-creator-glass-panel flex flex-col h-full bg-black/40 border border-pink-500/20 rounded-xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-2 p-3 border-b border-pink-500/20 bg-black/20 shrink-0">
                <Flame className="w-4 h-4 text-pink-500" />
                <h3 className="font-bold text-pink-400 text-xs tracking-wider uppercase">Group Vote</h3>
            </div>

            <div className="flex-1 p-3 flex flex-col min-h-0 relative z-10 overflow-y-auto custom-scroll">
                {state.isActive ? (
                    <div className="flex flex-col h-full gap-3">
                        <div className="bg-black/40 border border-white/10 rounded-lg p-3">
                            <p className="text-sm text-white font-bold mb-1 leading-tight">{state.label}</p>
                            {state.description && (
                                <p className="text-xs text-white/60 mb-3 leading-snug">{state.description}</p>
                            )}
                            
                            <div className="flex items-center justify-between text-[11px] mb-1.5">
                                <span className={isCompleted ? "text-green-400 font-bold" : "text-white/80"}>
                                    {state.current} / {state.target} votes
                                </span>
                                <span className="font-bold text-gold">${state.price}/vote</span>
                            </div>
                            
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
                                <div
                                    className={`absolute left-0 top-0 bottom-0 ${isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-pink-600 to-pink-400'} transition-all duration-500`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="mt-auto pt-2">
                            <button
                                onClick={() => handleAction("STOP")}
                                disabled={loading}
                                className="w-full py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-bold text-xs transition-all disabled:opacity-50"
                            >
                                {loading ? "Stopping..." : "⏹ Stop Campaign"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase text-white/50 font-bold ml-1">Reward Title</label>
                            <input
                                className="w-full bg-black/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-pink-500/50 transition"
                                placeholder="e.g. Do a 2-minute dance"
                                value={form.label}
                                onChange={(e) => setForm({ ...form, label: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] uppercase text-white/50 font-bold ml-1">Short Description (Optional)</label>
                            <input
                                className="w-full bg-black/50 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-pink-500/50 transition"
                                placeholder="Explain what happens when goal is met..."
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2 mt-1">
                            <div className="w-1/2 space-y-1 relative">
                                <label className="text-[10px] uppercase text-white/50 font-bold ml-1">Votes Needed</label>
                                <input
                                    className="w-full bg-black/50 rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/10 focus:border-pink-500/50 transition"
                                    value={form.target}
                                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                                    type="number"
                                    min={1}
                                />
                            </div>
                            <div className="w-1/2 space-y-1 relative">
                                <label className="text-[10px] uppercase text-white/50 font-bold ml-1">Price Per Vote</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold font-bold">$</span>
                                    <input
                                        className="w-full bg-black/50 rounded-lg pl-7 pr-3 py-2 text-sm text-gold font-bold outline-none border border-white/10 focus:border-gold/50 transition"
                                        value={form.price}
                                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                                        type="number"
                                        min={1}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4">
                            <button
                                onClick={() => handleAction("START")}
                                disabled={loading}
                                className={`w-full py-2.5 rounded-lg bg-pink-600 text-white font-bold text-xs hover:bg-pink-500 transition-colors disabled:opacity-50`}
                            >
                                {loading ? "Starting..." : `▶ Start Group Vote`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default S4uCreatorGroupVote;
