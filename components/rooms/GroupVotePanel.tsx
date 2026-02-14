"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Zap, Flame, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
    initialState?: GroupVoteState;
    currentUserId?: string;
}

export default function GroupVotePanel({ roomId, initialState, currentUserId }: Props) {
    const supabase = createClient();
    const [state, setState] = useState<GroupVoteState>(initialState || {});
    const [loadingVote, setLoadingVote] = useState<string | null>(null);
    const [completedCampaigns, setCompletedCampaigns] = useState<string[]>([]);

    useEffect(() => {
        if (!roomId) return;

        const fetchInitialState = async () => {
            const { data } = await supabase.from('truth_dare_games').select('group_vote_state').eq('room_id', roomId).single();
            if (data?.group_vote_state) setState(data.group_vote_state);
        };
        fetchInitialState();

        const channel = supabase.channel(`group_vote_updates_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_games', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.group_vote_state) setState(newData.group_vote_state);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, supabase]);

    // Handle Auto-Hide Logic
    useEffect(() => {
        ['truth', 'dare'].forEach((type) => {
            const cam = state[type as keyof GroupVoteState];
            if (cam?.isActive && cam.current >= cam.target && !completedCampaigns.includes(type)) {
                // Target Reached!
                setCompletedCampaigns(prev => [...prev, type]);

                // Hide after 10 seconds
                setTimeout(() => {
                    setHiddenTypes(prev => [...prev, type]);
                }, 10000);
            }
        });
    }, [state, completedCampaigns]);

    const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);

    const handleVote = async (type: 'truth' | 'dare') => {
        if (loadingVote) return;
        setLoadingVote(type);

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/group-vote/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            const data = await res.json();
            if (res.ok) toast.success(`Voted!`);
            else toast.error(data.error || "Failed to vote");
        } catch (e) {
            toast.error("Network error");
        } finally {
            setLoadingVote(null);
        }
    };

    const hasActiveCampaign = (state.truth?.isActive && !hiddenTypes.includes('truth')) || (state.dare?.isActive && !hiddenTypes.includes('dare'));

    if (!hasActiveCampaign) return null;

    return (
        <div className="w-full flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
                <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
                <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Live Goals</span>
                <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
            </div>

            <div className="w-full flex flex-col gap-3 pointer-events-auto">
                <AnimatePresence>
                    {['truth', 'dare'].map((type) => {
                        const cam = state[type as keyof GroupVoteState];
                        if (!cam?.isActive || hiddenTypes.includes(type)) return null;

                        const isDone = cam.current >= cam.target;
                        const isTruth = type === 'truth';

                        // Theme Colors
                        const colorClass = isTruth ? 'cyan' : 'pink';
                        const ringColor = isTruth ? 'ring-cyan-500/20' : 'ring-pink-500/20';
                        const gradBg = isTruth ? 'bg-gradient-to-br from-cyan-900/40 to-blue-900/40' : 'bg-gradient-to-br from-pink-900/40 to-purple-900/40';
                        const border = isTruth ? 'border-cyan-500/20' : 'border-pink-500/20';
                        const glow = isTruth ? 'shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)]' : 'shadow-[0_0_30px_-5px_rgba(236,72,153,0.15)]';
                        const barGradient = isTruth ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400' : 'bg-gradient-to-r from-pink-500 via-purple-500 to-pink-400';

                        const Icon = isTruth ? Zap : Flame;

                        return (
                            <motion.div
                                key={type}
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`w-full ${gradBg} backdrop-blur-xl border ${border} rounded-2xl p-4 ${glow} relative overflow-hidden group`}
                            >
                                {/* Absolute Shine Effect */}
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none`} />

                                {isDone && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`absolute inset-0 bg-${colorClass}-500/10 z-0 animate-pulse`}
                                    />
                                )}

                                <div className="relative z-10 flex flex-col gap-3">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg bg-${colorClass}-500/10 border border-${colorClass}-500/20`}>
                                                <Icon className={`w-3.5 h-3.5 text-${colorClass}-400`} />
                                            </div>
                                            <div>
                                                <div className={`text-[10px] font-bold uppercase tracking-wider text-${colorClass}-400/80`}>
                                                    Group {type}
                                                </div>
                                                <div className="text-sm font-bold text-white leading-tight">
                                                    <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                                                        {Math.max(0, cam.target - cam.current)} Left
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Progress Circle (Mini) or Status */}
                                        {isDone && (
                                            <div className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> DONE
                                            </div>
                                        )}
                                    </div>

                                    {/* Label */}
                                    <div className="min-h-[20px]">
                                        <p className="text-xs font-medium text-gray-200 line-clamp-2 leading-relaxed">
                                            {isDone ? (
                                                <span className="text-green-400 font-bold tracking-wide animate-pulse">
                                                    GOAL UNLOCKED!
                                                </span>
                                            ) : (
                                                cam.label
                                            )}
                                        </p>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full h-1.5 bg-gray-950/50 rounded-full overflow-hidden ring-1 ring-white/5">
                                        <motion.div
                                            className={`h-full ${barGradient} shadow-[0_0_10px_rgba(255,255,255,0.3)]`}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (cam.current / cam.target) * 100)}%` }}
                                            transition={{ type: "spring", stiffness: 40, damping: 10 }}
                                        />
                                    </div>

                                    {/* Action Button */}
                                    {!isDone && (
                                        <button
                                            onClick={() => handleVote(type as 'truth' | 'dare')}
                                            disabled={!!loadingVote}
                                            className={`w-full h-9 rounded-xl ${isTruth ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/30' : 'bg-pink-600 hover:bg-pink-500 shadow-pink-900/30'} 
                                            text-white text-xs font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 group-hover:brightness-110`}
                                        >
                                            {loadingVote === type ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Flame className="w-3.5 h-3.5 fill-current opacity-80" />
                                                    BOOST FOR ${cam.price}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
