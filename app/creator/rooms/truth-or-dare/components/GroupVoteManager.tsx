"use client";

import React, { useState, useEffect } from "react";
import { Zap, Flame, StopCircle, Play, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface GroupVoteState {
    truth?: {
        isActive: boolean;
        label: string;
        target: number;
        current: number;
        price: number;
    };
    dare?: {
        isActive: boolean;
        label: string;
        target: number;
        current: number;
        price: number;
    };
}

interface Props {
    roomId: string;
}

export default function GroupVoteManager({ roomId }: Props) {
    const supabase = createClient();
    const [state, setState] = useState<GroupVoteState>({});
    const [loading, setLoading] = useState(false);

    // Inputs
    const [truthForm, setTruthForm] = useState({ label: '', target: 50, price: 10 });
    const [dareForm, setDareForm] = useState({ label: '', target: 50, price: 10 });

    // Sync State
    useEffect(() => {
        if (!roomId) return;
        const fetchState = async () => {
            const { data } = await supabase.from('truth_dare_games').select('group_vote_state').eq('room_id', roomId).single();
            if (data?.group_vote_state) setState(data.group_vote_state);
        };
        fetchState();

        const dbChannel = supabase.channel(`group_vote_manager_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_games', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.group_vote_state) setState(newData.group_vote_state);
            })
            .subscribe();

        // Broadcast Listener (Instant Feedback from API)
        const broadcastChannel = supabase.channel(`room:${roomId}`)
            .on('broadcast', { event: 'group_vote_update' }, (payload) => {
                const { type, current, target } = payload.payload;
                setState(prev => {
                    const newState = { ...prev };
                    if (type === 'truth' && newState.truth) {
                        newState.truth = { ...newState.truth, current, target };
                    } else if (type === 'dare' && newState.dare) {
                        newState.dare = { ...newState.dare, current, target };
                    }
                    return newState;
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(dbChannel);
            supabase.removeChannel(broadcastChannel);
        };
    }, [roomId, supabase]);


    const handleAction = async (type: 'truth' | 'dare', action: 'START' | 'STOP') => {
        setLoading(true);
        const form = type === 'truth' ? truthForm : dareForm;

        try {
            const body = {
                action,
                type,
                label: action === 'START' ? form.label : undefined,
                target: action === 'START' ? form.target : undefined,
                price: action === 'START' ? form.price : undefined,
            };

            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/group-vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(`${action === 'START' ? 'Started' : 'Stopped'} Group ${type}`);
            if (action === 'START') {
                // Clear form? Maybe keep for reuse.
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to update group vote");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tod-creator-panel-bg rounded-xl tod-creator-neon-border-blue p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 tod-creator-text-neon-yellow" />
                <h3 className="font-bold text-white">Group Vote Campaigns</h3>
            </div>

            {/* TRUTH ROW */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="tod-creator-text-neon-blue font-bold text-sm uppercase flex items-center gap-1">
                        <Zap className="w-4 h-4" /> GROUP TRUTH
                    </span>
                    {state.truth?.isActive ? (
                        <div className="text-xs text-green-400 font-bold flex items-center gap-1">
                            ACTIVE <span className="text-white">({state.truth.target - state.truth.current} Left)</span>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 font-bold">INACTIVE</div>
                    )}
                </div>

                {state.truth?.isActive ? (
                    <div className="space-y-2">
                        <div className="text-sm text-white font-medium">{state.truth.label}</div>
                        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${Math.min(100, (state.truth.current / state.truth.target) * 100)}%` }} />
                        </div>
                        <button
                            onClick={() => handleAction('truth', 'STOP')}
                            disabled={loading}
                            className="w-full py-1.5 bg-red-900/50 hover:bg-red-900/80 text-red-200 text-xs rounded-lg border border-red-500/30 flex items-center justify-center gap-1"
                        >
                            <StopCircle className="w-3 h-3" /> Stop Campaign
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Prompt (e.g. Tell secret about ex)"
                            className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
                            value={truthForm.label}
                            onChange={(e) => setTruthForm({ ...truthForm, label: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Target"
                                className="w-1/2 bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none"
                                value={truthForm.target}
                                onChange={(e) => setTruthForm({ ...truthForm, target: Number(e.target.value) })}
                            />
                            <div className="relative w-1/2">
                                <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                                <input
                                    type="number"
                                    placeholder="Price"
                                    className="w-full bg-white/5 rounded-lg px-3 py-2 pl-6 text-sm text-white outline-none"
                                    value={truthForm.price}
                                    onChange={(e) => setTruthForm({ ...truthForm, price: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleAction('truth', 'START')}
                            disabled={loading || !truthForm.label}
                            className="w-full py-2 rounded-lg tod-creator-bg-neon-blue text-white font-bold text-sm hover:opacity-90 transition-opacity tod-creator-glow-blue flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />} Start Truth
                        </button>
                    </div>
                )}
            </div>

            {/* DARE ROW */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="tod-creator-text-neon-pink font-bold text-sm uppercase flex items-center gap-1">
                        <Flame className="w-4 h-4" /> GROUP DARE
                    </span>
                    {state.dare?.isActive ? (
                        <div className="text-xs text-green-400 font-bold flex items-center gap-1">
                            ACTIVE <span className="text-white">({state.dare.target - state.dare.current} Left)</span>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 font-bold">INACTIVE</div>
                    )}
                </div>

                {state.dare?.isActive ? (
                    <div className="space-y-2">
                        <div className="text-sm text-white font-medium">{state.dare.label}</div>
                        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${Math.min(100, (state.dare.current / state.dare.target) * 100)}%` }} />
                        </div>
                        <button
                            onClick={() => handleAction('dare', 'STOP')}
                            disabled={loading}
                            className="w-full py-1.5 bg-red-900/50 hover:bg-red-900/80 text-red-200 text-xs rounded-lg border border-red-500/30 flex items-center justify-center gap-1"
                        >
                            <StopCircle className="w-3 h-3" /> Stop Campaign
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Prompt (e.g. Do 50 squats)"
                            className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
                            value={dareForm.label}
                            onChange={(e) => setDareForm({ ...dareForm, label: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Target"
                                className="w-1/2 bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none"
                                value={dareForm.target}
                                onChange={(e) => setDareForm({ ...dareForm, target: Number(e.target.value) })}
                            />
                            <div className="relative w-1/2">
                                <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                                <input
                                    type="number"
                                    placeholder="Price"
                                    className="w-full bg-white/5 rounded-lg px-3 py-2 pl-6 text-sm text-white outline-none"
                                    value={dareForm.price}
                                    onChange={(e) => setDareForm({ ...dareForm, price: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleAction('dare', 'START')}
                            disabled={loading || !dareForm.label}
                            className="w-full py-2 rounded-lg tod-creator-bg-neon-pink text-white font-bold text-sm hover:opacity-90 transition-opacity tod-creator-glow-pink flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />} Start Dare
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
