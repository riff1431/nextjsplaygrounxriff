"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Zap, Flame, Loader2, CheckCircle2, Target, Users, Trophy, Vote, TrendingUp } from "lucide-react";
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
    const [hiddenTypes, setHiddenTypes] = useState<string[]>([]);
    useEffect(() => {
        if (!roomId) return;

        const fetchInitialState = async () => {
            const { data } = await supabase.from('truth_dare_games').select('group_vote_state').eq('room_id', roomId).single();
            if (data?.group_vote_state) setState(data.group_vote_state);
        };
        fetchInitialState();

        // 1. Database Changes Listener (Truth of Source)
        const dbChannel = supabase.channel(`group_vote_updates_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_games', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.group_vote_state) setState(newData.group_vote_state);
            })
            .subscribe();

        // 2. Broadcast Listener (Instant Feedback from API)
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

    const handleVote = async (type: 'truth' | 'dare') => {
        if (loadingVote === type) return;
        setLoadingVote(type);

        // Optimistic Update
        setState(prev => {
            const newState = { ...prev };
            const campaign = newState[type];
            if (campaign) {
                // Increment immediately
                campaign.current = (campaign.current || 0) + 1;
            }
            return newState;
        });

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/group-vote/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Vote counted! 🔥`);
                // Update with server state if successful to be sure
                if (data.newCount !== undefined) {
                    setState(prev => {
                        const newState = { ...prev };
                        const campaign = newState[type];
                        if (campaign) {
                            campaign.current = data.newCount;
                        }
                        return newState;
                    });
                }
            } else {
                toast.error(data.error || "Failed to vote");
                // Revert optimistic update on failure
                setState(prev => {
                    const newState = { ...prev };
                    const campaign = newState[type];
                    if (campaign) {
                        campaign.current = Math.max(0, (campaign.current || 0) - 1);
                    }
                    return newState;
                });
            }
        } catch (e) {
            toast.error("Network error");
            // Revert optimistic update on failure
            setState(prev => {
                const newState = { ...prev };
                const campaign = newState[type];
                if (campaign) {
                    campaign.current = Math.max(0, (campaign.current || 0) - 1);
                }
                return newState;
            });
        } finally {
            setLoadingVote(null);
        }
    };

    const hasActiveCampaign = (state.truth?.isActive && !hiddenTypes.includes('truth')) || (state.dare?.isActive && !hiddenTypes.includes('dare'));

    // ─── Active Campaign Cards ───
    const renderActiveCampaign = (type: 'truth' | 'dare') => {
        const cam = state[type as keyof GroupVoteState];
        if (!cam?.isActive || hiddenTypes.includes(type)) return null;

        const isDone = cam.current >= cam.target;
        const isTruth = type === 'truth';
        const progress = Math.min(100, (cam.current / cam.target) * 100);

        // Theme Colors
        const gradBg = isTruth ? 'bg-gradient-to-br from-cyan-900/40 to-blue-900/40' : 'bg-gradient-to-br from-pink-900/40 to-purple-900/40';
        const border = isTruth ? 'border-cyan-500/20' : 'border-pink-500/20';
        const glow = isTruth ? 'shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)]' : 'shadow-[0_0_30px_-5px_rgba(236,72,153,0.15)]';
        const barGradient = isTruth ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400' : 'bg-gradient-to-r from-pink-500 via-purple-500 to-pink-400';
        const Icon = isTruth ? Zap : Flame;
        const accentColor = isTruth ? 'cyan' : 'pink';

        return (
            <motion.div
                key={type}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className={`w-full ${gradBg} backdrop-blur-xl border ${border} rounded-2xl p-4 ${glow} relative overflow-hidden group`}
            >
                {/* Shimmer effect */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-${accentColor}-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none`} />

                {isDone && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.1, 0.2, 0.1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className={`absolute inset-0 bg-green-500/10 z-0`}
                    />
                )}

                <div className="relative z-10 flex flex-col gap-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg bg-${accentColor}-500/15 border border-${accentColor}-500/25`}>
                                <Icon className={`w-3.5 h-3.5 text-${accentColor}-400`} />
                            </div>
                            <div>
                                <div className={`text-[10px] font-bold uppercase tracking-wider text-${accentColor}-400/80`}>
                                    Group {type}
                                </div>
                                <div className="text-sm font-bold text-white leading-tight">
                                    <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                                        {isDone ? '🎉 Goal Reached!' : `${Math.max(0, cam.target - cam.current)} votes left`}
                                    </span>
                                </div>
                            </div>
                        </div>
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
                                <span className="text-green-400 font-bold tracking-wide">
                                    ✨ GOAL UNLOCKED!
                                </span>
                            ) : (
                                cam.label
                            )}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] text-gray-500 font-medium">{cam.current} / {cam.target} votes</span>
                            <span className={`text-[9px] font-bold text-${accentColor}-400`}>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-950/50 rounded-full overflow-hidden ring-1 ring-white/5">
                            <motion.div
                                className={`h-full ${barGradient} shadow-[0_0_10px_rgba(255,255,255,0.3)] rounded-full`}
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ type: "spring", stiffness: 40, damping: 10 }}
                            />
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => handleVote(type)}
                        disabled={isDone || loadingVote === type}
                        className={`
                            mt-2 w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg
                            disabled:opacity-50 flex items-center justify-center gap-2
                            ${isDone ? 'bg-green-500 text-white shadow-green-500/20' : `bg-gradient-to-r from-${accentColor}-600 to-${accentColor}-500 hover:from-${accentColor}-500 hover:to-${accentColor}-400 text-white shadow-${accentColor}-900/30 hover:scale-[1.02] active:scale-95`}
                        `}
                    >
                        {isDone ? (
                            <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Target Reached</span>
                        ) : loadingVote === type ? (
                            <span className="flex items-center gap-2 animate-pulse"><Loader2 className="w-4 h-4 animate-spin" /> Voting...</span>
                        ) : (
                            <span className="flex items-center gap-2"><Vote className="w-4 h-4" /> Vote {type.toUpperCase()} (€{cam.price})</span>
                        )}
                    </button>
                </div>
            </motion.div>
        );
    };

    // ─── Idle State: Always show when no active campaigns ───
    const renderIdleState = () => (
        <div className="w-full bg-gradient-to-br from-gray-900/60 via-gray-950/60 to-gray-900/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl rounded-full -mr-8 -mt-8 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-pink-500/5 blur-3xl rounded-full -ml-6 -mb-6 pointer-events-none" />
            
            {/* Section Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/15 to-pink-500/15 border border-purple-500/20">
                    <Target className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Group Voting</h3>
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Vote together to unlock goals</p>
                </div>
            </div>

            {/* Waiting State */}
            <div className="flex flex-col items-center py-5 gap-3">
                {/* Animated voting icon */}
                <motion.div
                    animate={{ 
                        scale: [1, 1.05, 1],
                        opacity: [0.7, 1, 0.7] 
                    }}
                    transition={{ 
                        repeat: Infinity, 
                        duration: 3,
                        ease: "easeInOut" 
                    }}
                    className="relative"
                >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/[0.06] flex items-center justify-center">
                        <Users className="w-7 h-7 text-purple-400/70" />
                    </div>
                    {/* Pulse ring */}
                    <motion.div
                        animate={{ 
                            scale: [1, 1.4, 1],
                            opacity: [0.3, 0, 0.3] 
                        }}
                        transition={{ 
                            repeat: Infinity, 
                            duration: 2.5,
                            ease: "easeOut" 
                        }}
                        className="absolute inset-0 rounded-2xl border border-purple-500/20"
                    />
                </motion.div>

                <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-gray-300">Waiting for Goals</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed max-w-[200px]">
                        Creator will set group voting goals — vote together to make things happen! 
                    </p>
                </div>

                {/* Mini info cards */}
                <div className="flex gap-2 mt-2 w-full">
                    <div className="flex-1 p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-center">
                        <Zap className="w-3.5 h-3.5 text-cyan-400/60 mx-auto mb-1" />
                        <span className="text-[9px] font-bold text-cyan-400/70 uppercase tracking-wider">Truth</span>
                    </div>
                    <div className="flex-1 p-2.5 rounded-xl bg-pink-500/5 border border-pink-500/10 text-center">
                        <Flame className="w-3.5 h-3.5 text-pink-400/60 mx-auto mb-1" />
                        <span className="text-[9px] font-bold text-pink-400/70 uppercase tracking-wider">Dare</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full flex flex-col gap-3">
            {hasActiveCampaign ? (
                <>
                    {/* Active Campaign Header */}
                    <div className="flex items-center gap-2 px-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
                        <div className="flex items-center gap-1.5">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            >
                                <Target className="w-3 h-3 text-pink-500" />
                            </motion.div>
                            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Live Goals</span>
                        </div>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-500/20 to-transparent" />
                    </div>

                    <div className="w-full flex flex-col gap-3 pointer-events-auto">
                        <AnimatePresence>
                            {renderActiveCampaign('truth')}
                            {renderActiveCampaign('dare')}
                        </AnimatePresence>
                    </div>
                </>
            ) : (
                renderIdleState()
            )}
        </div>
    );
}
