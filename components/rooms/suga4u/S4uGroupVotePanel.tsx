"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Flame, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CampaignState {
    isActive: boolean;
    label: string;
    description: string;
    target: number;
    price: number;
    current: number;
}

interface S4uGroupVotePanelProps {
    roomId: string | null;
}

export default function S4uGroupVotePanel({ roomId }: S4uGroupVotePanelProps) {
    const supabase = createClient();
    const [state, setState] = useState<CampaignState | null>(null);
    const [loadingVote, setLoadingVote] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (!roomId) return;

        const fetchInitialState = async () => {
            const { data } = await supabase.from('rooms').select('group_vote_state').eq('id', roomId).single();
            if (data?.group_vote_state) {
                const s = data.group_vote_state as CampaignState;
                setState(s);
                if (s.isActive && s.current >= s.target) {
                    setCompleted(true);
                    setTimeout(() => setHidden(true), 10000);
                }
            }
        };
        fetchInitialState();

        // 1. Database Changes Listener (Truth of Source)
        const dbChannel = supabase.channel(`s4u-gv-updates-${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.group_vote_state) {
                    const s = newData.group_vote_state as CampaignState;
                    setState(s);
                    // Check completion
                    if (s.isActive && s.current >= s.target && !completed) {
                        setCompleted(true);
                        setTimeout(() => setHidden(true), 10000);
                    } else if (!s.isActive) {
                        // Reset if creator stops or restarts
                        setCompleted(false);
                        setHidden(false);
                    }
                }
            })
            .subscribe();

        // 2. Broadcast Listener (Instant Feedback from API)
        const broadcastChannel = supabase.channel(`room:${roomId}`)
            .on('broadcast', { event: 'group_vote_update' }, (payload) => {
                const updatedState = payload.payload as CampaignState;
                setState(prev => {
                    const newState = { ...(prev || {}), ...updatedState };
                    return newState as CampaignState;
                });
                
                if (updatedState.isActive && updatedState.current >= updatedState.target && !completed) {
                    setCompleted(true);
                    setTimeout(() => setHidden(true), 10000);
                } else if (!updatedState.isActive) {
                    setCompleted(false);
                    setHidden(false);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(dbChannel);
            supabase.removeChannel(broadcastChannel);
        };
    }, [roomId, supabase, completed]);

    const handleVote = async () => {
        if (loadingVote || !roomId || !state) return;
        setLoadingVote(true);

        // Optimistic Update
        setState(prev => {
            if (!prev) return null;
            return { ...prev, current: prev.current + 1 };
        });

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/suga/group-vote/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            
            if (res.ok) {
                toast.success(`Voted!`);
                if (data.newCount !== undefined) {
                    setState(prev => prev ? { ...prev, current: data.newCount } : null);
                }
            } else {
                toast.error(data.error || "Failed to vote");
                // Revert optimistic update
                setState(prev => prev ? { ...prev, current: Math.max(0, prev.current - 1) } : null);
            }
        } catch (e) {
            toast.error("Network error");
            setState(prev => prev ? { ...prev, current: Math.max(0, prev.current - 1) } : null);
        } finally {
            setLoadingVote(false);
        }
    };

    if (!state || (!state.isActive && !state.label) || hidden) {
        return (
            <div className="glass-panel p-3 bg-transparent border-gold/20 flex flex-col h-full items-center justify-center">
                <div className="flex items-center justify-center mb-3 w-full">
                    <div className="h-px flex-1 bg-gold/30" />
                    <span className="section-title px-3">Group Goal</span>
                    <div className="h-px flex-1 bg-gold/30" />
                </div>
                <p className="text-xs text-white/40 italic">No active goal right now.</p>
            </div>
        );
    }

    const progress = state.target > 0 ? Math.min(100, (state.current / state.target) * 100) : 0;
    const isDone = state.current >= state.target;

    return (
        <div className="glass-panel p-3 bg-transparent border-gold/20 flex flex-col items-center justify-center relative overflow-hidden group min-h-[160px]">
            {/* Ambient background glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none ${isDone ? 'bg-green-500/10' : 'bg-pink-500/10'}`} />

            {isDone && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-green-500/5 z-0 animate-pulse"
                />
            )}

            <div className="flex items-center justify-center mb-3 w-full relative z-10">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3 flex items-center gap-1.5">
                    <Flame className={`w-3.5 h-3.5 ${isDone ? 'text-green-400' : 'text-pink-500'}`} />
                    Group Goal
                </span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>

            <div className="w-full relative z-10 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-h-[40px] flex-1">
                        <p className="text-sm font-bold text-white line-clamp-2 leading-snug">
                            {isDone ? (
                                <span className="text-green-400 font-bold tracking-wide flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" /> GOAL REACHED!
                                </span>
                            ) : (
                                state.label
                            )}
                        </p>
                        {!isDone && state.description && (
                            <p className="text-[10px] text-white/60 mt-0.5 line-clamp-1">{state.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold font-mono">
                        <span className={isDone ? "text-green-400" : "text-white"}>
                            {state.current} / {state.target}
                        </span>
                        {!isDone && <span className="text-gold">${state.price}/vote</span>}
                    </div>

                    <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            className={`h-full shadow-[0_0_10px_rgba(255,255,255,0.3)] ${isDone ? 'bg-green-500' : 'bg-gradient-to-r from-pink-500 via-purple-500 to-pink-400'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", stiffness: 40, damping: 10 }}
                        />
                    </div>
                </div>

                {!isDone && (
                    <button
                        onClick={handleVote}
                        disabled={loadingVote}
                        className={`w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 shadow-lg shadow-pink-900/30 text-white text-[11px] font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 group-hover:brightness-110 disabled:opacity-50`}
                    >
                        {loadingVote ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <>
                                <Flame className="w-3.5 h-3.5 fill-current opacity-80" />
                                BOOST FOR ${state.price}
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
