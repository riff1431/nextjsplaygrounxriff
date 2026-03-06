"use client";

import { Zap } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface CampaignState {
    isActive: boolean;
    label: string;
    target: number;
    price: number;
    current: number;
}

interface GroupVoteState {
    truth: CampaignState;
    dare: CampaignState;
}

const DEFAULT_STATE: GroupVoteState = {
    truth: { isActive: false, label: "", target: 50, price: 10, current: 0 },
    dare: { isActive: false, label: "", target: 50, price: 10, current: 0 },
};

interface TodCreatorGroupVoteProps {
    roomId?: string | null;
}

const TodCreatorGroupVote = ({ roomId }: TodCreatorGroupVoteProps) => {
    const supabase = createClient();
    const [state, setState] = useState<GroupVoteState>(DEFAULT_STATE);
    const [loading, setLoading] = useState<{ truth: boolean; dare: boolean }>({ truth: false, dare: false });

    // Form fields for creating new campaigns
    const [truthForm, setTruthForm] = useState({ label: "", target: "50", price: "10" });
    const [dareForm, setDareForm] = useState({ label: "", target: "50", price: "10" });

    // Fetch initial state
    useEffect(() => {
        if (!roomId) return;

        const fetchState = async () => {
            const { data: game } = await supabase
                .from("truth_dare_games")
                .select("group_vote_state")
                .eq("room_id", roomId)
                .single();

            if (game?.group_vote_state) {
                const s = game.group_vote_state as any;
                setState({
                    truth: { ...DEFAULT_STATE.truth, ...s.truth },
                    dare: { ...DEFAULT_STATE.dare, ...s.dare },
                });
                // If active, populate the forms
                if (s.truth?.isActive) {
                    setTruthForm({ label: s.truth.label || "", target: String(s.truth.target || 50), price: String(s.truth.price || 10) });
                }
                if (s.dare?.isActive) {
                    setDareForm({ label: s.dare.label || "", target: String(s.dare.target || 50), price: String(s.dare.price || 10) });
                }
            }
        };

        fetchState();
    }, [roomId]);

    // Real-time subscription
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`gv-${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "truth_dare_games",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    const newData = payload.new as any;
                    if (newData?.group_vote_state) {
                        const s = newData.group_vote_state;
                        setState({
                            truth: { ...DEFAULT_STATE.truth, ...s.truth },
                            dare: { ...DEFAULT_STATE.dare, ...s.dare },
                        });
                    }
                }
            )
            .on("broadcast", { event: "group_vote_update" }, (payload) => {
                const { type, current, target } = payload.payload as { type: string; current?: number; target?: number };
                if (type === "truth" || type === "dare") {
                    const key: keyof GroupVoteState = type;
                    setState((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], current: current ?? prev[key].current, target: target ?? prev[key].target },
                    }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const handleAction = useCallback(
        async (type: "truth" | "dare", action: "START" | "STOP") => {
            if (!roomId) return;
            setLoading((prev) => ({ ...prev, [type]: true }));

            const form = type === "truth" ? truthForm : dareForm;

            try {
                const body: any = { action, type };
                if (action === "START") {
                    if (!form.label.trim()) {
                        toast.error("Please enter a prompt for the campaign");
                        setLoading((prev) => ({ ...prev, [type]: false }));
                        return;
                    }
                    body.label = form.label;
                    body.target = Number(form.target) || 50;
                    body.price = Number(form.price) || 10;
                }

                const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/group-vote`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                toast.success(
                    action === "START"
                        ? `Group ${type === "truth" ? "Truth" : "Dare"} campaign started!`
                        : `Group ${type === "truth" ? "Truth" : "Dare"} campaign stopped.`
                );

                // Optimistic: state will update via real-time subscription
            } catch (e: any) {
                toast.error(e.message || "Failed to update campaign");
            } finally {
                setLoading((prev) => ({ ...prev, [type]: false }));
            }
        },
        [roomId, truthForm, dareForm]
    );

    const renderCampaign = (type: "truth" | "dare") => {
        const campaign = state[type];
        const form = type === "truth" ? truthForm : dareForm;
        const setForm = type === "truth" ? setTruthForm : setDareForm;
        const isActive = campaign.isActive;
        const progress = campaign.target > 0 ? Math.min(100, (campaign.current / campaign.target) * 100) : 0;
        const isLoading = loading[type];

        const labelColor = type === "truth" ? "tod-creator-text-neon-blue" : "tod-creator-text-neon-pink";
        const btnBg = type === "truth" ? "tod-creator-bg-neon-blue tod-creator-glow-blue" : "tod-creator-bg-neon-pink tod-creator-glow-pink";
        const progressBg = type === "truth" ? "bg-blue-500" : "bg-pink-500";
        const icon = type === "truth" ? "⚡" : "🎭";
        const label = type === "truth" ? "GROUP TRUTH" : "GROUP DARE";

        return (
            <div className={type === "truth" ? "mb-4" : ""}>
                <div className="flex items-center gap-2 mb-2">
                    <span className={`${labelColor} font-bold text-sm`}>{icon} {label}</span>
                    <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${isActive
                            ? "text-green-300 bg-green-500/20 border border-green-500/30"
                            : "text-white/40 bg-white/5"
                            }`}
                    >
                        {isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                </div>

                {isActive ? (
                    <>
                        {/* Active campaign display */}
                        <div className="bg-black/40 border border-white/10 rounded-lg p-3 mb-2">
                            <p className="text-sm text-white font-medium mb-2 line-clamp-2">"{campaign.label}"</p>
                            <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
                                <span>
                                    {campaign.current} / {campaign.target} votes
                                </span>
                                <span className="font-bold text-green-400">${campaign.price}/vote</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${progressBg} rounded-full transition-all duration-500`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="text-right text-[10px] text-white/40 mt-1">{Math.round(progress)}%</div>
                        </div>
                        <button
                            onClick={() => handleAction(type, "STOP")}
                            disabled={isLoading}
                            className="w-full py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-bold text-sm transition-all disabled:opacity-50"
                        >
                            {isLoading ? "Stopping..." : "⏹ Stop Campaign"}
                        </button>
                    </>
                ) : (
                    <>
                        {/* Create new campaign form */}
                        <input
                            className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none mb-2 border border-white/5 focus:border-white/20 transition"
                            placeholder={type === "truth" ? "Prompt (e.g. Tell secret about ex)" : "Prompt (e.g. Do 50 squats)"}
                            value={form.label}
                            onChange={(e) => setForm({ ...form, label: e.target.value })}
                        />
                        <div className="flex gap-2 mb-2">
                            <div className="w-1/2 relative">
                                <input
                                    className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/5 focus:border-white/20 transition"
                                    value={form.target}
                                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                                    type="number"
                                    min={1}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30">votes</span>
                            </div>
                            <div className="w-1/2 relative">
                                <input
                                    className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none border border-white/5 focus:border-white/20 transition"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    type="number"
                                    min={1}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30">$/vote</span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleAction(type, "START")}
                            disabled={isLoading}
                            className={`w-full py-2 rounded-lg ${btnBg} text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50`}
                        >
                            {isLoading ? "Starting..." : `▶ Start ${type === "truth" ? "Truth" : "Dare"}`}
                        </button>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="tod-creator-panel-bg rounded-xl tod-creator-neon-border-blue p-4 flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <Zap className="w-4 h-4 tod-creator-text-neon-yellow" />
                <h3 className="font-bold text-white">Group Vote Campaigns</h3>
            </div>

            {renderCampaign("truth")}
            {renderCampaign("dare")}
        </div>
    );
};

export default TodCreatorGroupVote;
