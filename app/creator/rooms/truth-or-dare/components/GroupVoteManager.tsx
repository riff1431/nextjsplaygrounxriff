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

        const channel = supabase.channel(`group_vote_manager_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_games', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.group_vote_state) setState(newData.group_vote_state);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
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
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 space-y-4">
            <h3 className="text-white font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> Group Vote Campaigns
            </h3>

            {/* TRUTH ROW */}
            <div className="p-3 bg-black/40 rounded-xl border border-cyan-500/20">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm uppercase">
                        <Zap className="w-4 h-4" /> Group Truth
                    </div>
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
                            className="w-full bg-gray-800 border-none rounded-lg text-xs p-2 text-white placeholder-gray-500"
                            value={truthForm.label}
                            onChange={(e) => setTruthForm({ ...truthForm, label: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Target"
                                className="w-1/2 bg-gray-800 border-none rounded-lg text-xs p-2 text-white"
                                value={truthForm.target}
                                onChange={(e) => setTruthForm({ ...truthForm, target: Number(e.target.value) })}
                            />
                            <div className="relative w-1/2">
                                <span className="absolute left-2 top-2 text-gray-500 text-xs">$</span>
                                <input
                                    type="number"
                                    placeholder="Price"
                                    className="w-full bg-gray-800 border-none rounded-lg text-xs p-2 pl-4 text-white"
                                    value={truthForm.price}
                                    onChange={(e) => setTruthForm({ ...truthForm, price: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleAction('truth', 'START')}
                            disabled={loading || !truthForm.label}
                            className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Start Truth
                        </button>
                    </div>
                )}
            </div>

            {/* DARE ROW */}
            <div className="p-3 bg-black/40 rounded-xl border border-pink-500/20">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-pink-400 font-bold text-sm uppercase">
                        <Flame className="w-4 h-4" /> Group Dare
                    </div>
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
                            className="w-full bg-gray-800 border-none rounded-lg text-xs p-2 text-white placeholder-gray-500"
                            value={dareForm.label}
                            onChange={(e) => setDareForm({ ...dareForm, label: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Target"
                                className="w-1/2 bg-gray-800 border-none rounded-lg text-xs p-2 text-white"
                                value={dareForm.target}
                                onChange={(e) => setDareForm({ ...dareForm, target: Number(e.target.value) })}
                            />
                            <div className="relative w-1/2">
                                <span className="absolute left-2 top-2 text-gray-500 text-xs">$</span>
                                <input
                                    type="number"
                                    placeholder="Price"
                                    className="w-full bg-gray-800 border-none rounded-lg text-xs p-2 pl-4 text-white"
                                    value={dareForm.price}
                                    onChange={(e) => setDareForm({ ...dareForm, price: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => handleAction('dare', 'START')}
                            disabled={loading || !dareForm.label}
                            className="w-full py-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs rounded-lg font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Start Dare
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
