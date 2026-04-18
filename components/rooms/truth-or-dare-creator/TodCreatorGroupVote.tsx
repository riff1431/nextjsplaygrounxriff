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
    const [activeVoteTab, setActiveVoteTab] = useState<'truth' | 'dare'>('truth');

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

        const btnBg = type === "truth" ? "tod-creator-bg-neon-blue tod-creator-glow-blue" : "tod-creator-bg-neon-pink tod-creator-glow-pink";
        const progressBg = type === "truth" ? "bg-blue-500" : "bg-pink-500";

        return (
            <div>
                {isActive ? (
                    <>
                        <div className="bg-black/40 border border-white/10 rounded-lg p-2 mb-1.5">
                            <p className="text-xs text-white font-medium mb-1 line-clamp-1">"{campaign.label}"</p>
                            <div className="flex items-center justify-between text-[10px] text-white/60 mb-1">
                                <span>{campaign.current}/{campaign.target} votes</span>
                                <span className="font-bold text-green-400">€{campaign.price}/vote</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${progressBg} rounded-full transition-all duration-500`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleAction(type, "STOP")}
                            disabled={isLoading}
                            className="w-full py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white font-bold text-[11px] transition-all disabled:opacity-50"
                        >
                            {isLoading ? "Stopping..." : "⏹ Stop"}
                        </button>
                    </>
                ) : (
                    <>
                        <input
                            className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/40 outline-none mb-1.5 border border-white/5 focus:border-white/20 transition"
                            placeholder={type === "truth" ? "Prompt (e.g. Tell secret)" : "Prompt (e.g. Do 50 squats)"}
                            value={form.label}
                            onChange={(e) => setForm({ ...form, label: e.target.value })}
                        />
                        <div className="flex gap-1.5 mb-1.5">
                            <div className="w-1/2 relative">
                                <input
                                    className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-xs text-white outline-none border border-white/5 focus:border-white/20 transition"
                                    value={form.target}
                                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                                    type="number"
                                    min={1}
                                />
                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-white/30">votes</span>
                            </div>
                            <div className="w-1/2 relative">
                                <input
                                    className="w-full bg-white/5 rounded-lg px-2 py-1.5 text-xs text-white outline-none border border-white/5 focus:border-white/20 transition"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                                    type="number"
                                    min={1}
                                />
                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-white/30">€/vote</span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleAction(type, "START")}
                            disabled={isLoading}
                            className={`w-full py-1.5 rounded-lg ${btnBg} text-white font-bold text-[11px] hover:opacity-90 transition-opacity disabled:opacity-50`}
                        >
                            {isLoading ? "Starting..." : `▶ Start ${type === "truth" ? "Truth" : "Dare"}`}
                        </button>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="tod-creator-panel-bg rounded-xl tod-creator-neon-border-blue p-2.5 flex flex-col h-full">
            <div className="flex items-center gap-1.5 mb-2 shrink-0">
                <Zap className="w-3.5 h-3.5 tod-creator-text-neon-yellow" />
                <h3 className="font-bold text-white text-xs">Group Vote</h3>
            </div>

            {/* Truth / Dare Tab Toggle */}
            <div className="flex rounded-lg overflow-hidden mb-2 shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                    onClick={() => setActiveVoteTab('truth')}
                    className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                    style={{
                        background: activeVoteTab === 'truth' ? 'rgba(59,130,246,0.15)' : 'transparent',
                        color: activeVoteTab === 'truth' ? '#60a5fa' : 'rgba(255,255,255,0.35)',
                        borderBottom: activeVoteTab === 'truth' ? '2px solid #3b82f6' : '2px solid transparent',
                    }}
                >
                    ⚡ Truth
                </button>
                <button
                    onClick={() => setActiveVoteTab('dare')}
                    className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                    style={{
                        background: activeVoteTab === 'dare' ? 'rgba(236,72,153,0.15)' : 'transparent',
                        color: activeVoteTab === 'dare' ? '#f472b6' : 'rgba(255,255,255,0.35)',
                        borderBottom: activeVoteTab === 'dare' ? '2px solid #ec4899' : '2px solid transparent',
                    }}
                >
                    🎭 Dare
                </button>
            </div>

            {/* Active Campaign Content */}
            <div className="flex-1 min-h-0">
                {renderCampaign(activeVoteTab)}
            </div>
        </div>
    );
};

export default TodCreatorGroupVote;
