"use client";

import React, { useEffect, useState } from "react";
import { MessageCircle, Flame, Star, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface QuestionReveal {
    requestId: string;
    fanId: string;
    type: "truth" | "dare";
    tier: "bronze" | "silver" | "gold";
    question: string;
    fanName: string;
    createdAt: string;
}

interface QuestionCountdownProps {
    roomId: string;
    userId: string;
    onClose: () => void;
}

export default function QuestionCountdown({ roomId, userId, onClose }: QuestionCountdownProps) {
    const supabase = createClient();
    const [countdown, setCountdown] = useState(10);
    const [revealed, setRevealed] = useState(false);
    const [questionData, setQuestionData] = useState<QuestionReveal | null>(null);
    const [pendingRequest, setPendingRequest] = useState<any>(null);

    // Listen for new requests from this user
    useEffect(() => {
        const channel = supabase.channel(`user_requests_${userId}`);

        channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'truth_dare_requests',
                filter: `fan_id=eq.${userId}`
            },
            (payload) => {
                console.log('New request detected:', payload.new);
                setPendingRequest(payload.new);
            }
        );

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, supabase]);

    // Start countdown when request is pending
    useEffect(() => {
        if (!pendingRequest) return;

        const createdAt = new Date(pendingRequest.created_at).getTime();
        const now = Date.now();
        const elapsed = (now - createdAt) / 1000;
        const remaining = Math.max(0, 10 - elapsed);

        setCountdown(Math.ceil(remaining));

        if (remaining <= 0) {
            // Already past 10 seconds, show immediately
            setRevealed(true);
            return;
        }

        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setRevealed(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [pendingRequest]);

    // Listen for question reveal broadcast from creator
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(`room:${roomId}`);

        channel.on('broadcast', { event: 'question_revealed' }, (payload) => {
            console.log('Question revealed broadcast received:', payload);

            // Check if this is for the current user
            if (payload.payload.fanId === userId || payload.payload.requestId === pendingRequest?.id) {
                setQuestionData({
                    requestId: payload.payload.requestId,
                    fanId: payload.payload.fanId,
                    type: payload.payload.type,
                    tier: payload.payload.tier,
                    question: payload.payload.question,
                    fanName: payload.payload.fanName,
                    createdAt: payload.payload.timestamp
                });
                setRevealed(true);
            }
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, pendingRequest, supabase]);

    if (!pendingRequest) return null;

    const tierColors = {
        bronze: { primary: "amber-500", secondary: "amber-600", glow: "rgba(245, 158, 11, 0.5)" },
        silver: { primary: "cyan-400", secondary: "cyan-600", glow: "rgba(34, 211, 238, 0.5)" },
        gold: { primary: "yellow-400", secondary: "yellow-600", glow: "rgba(250, 204, 21, 0.5)" }
    };

    const tier = pendingRequest.tier || "bronze";
    const type = pendingRequest.type?.includes("truth") ? "truth" : "dare";
    const colors = tierColors[tier as keyof typeof tierColors];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-500">
            {!revealed ? (
                // Countdown Display
                <div className="text-center animate-in zoom-in-95 duration-500 px-4">
                    {/* Pulsing Icon */}
                    <div className="mb-8 relative">
                        <div
                            className="absolute inset-0 blur-3xl opacity-60 animate-pulse"
                            style={{
                                background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
                                width: '200px',
                                height: '200px',
                                margin: '-50px auto'
                            }}
                        />
                        {type === "truth" ? (
                            <MessageCircle className={`w-32 h-32 mx-auto text-${colors.primary} animate-pulse relative z-10`} />
                        ) : (
                            <Flame className={`w-32 h-32 mx-auto text-${colors.primary} animate-pulse relative z-10`} />
                        )}
                    </div>

                    {/* Countdown Number */}
                    <div
                        className={`text-9xl font-black mb-6 bg-gradient-to-r from-${colors.primary} to-${colors.secondary} bg-clip-text text-transparent animate-bounce`}
                        style={{
                            textShadow: `0 0 60px ${colors.glow}, 0 0 100px ${colors.glow}`
                        }}
                    >
                        {countdown}
                    </div>

                    {/* Message */}
                    <div className="text-2xl sm:text-3xl text-gray-200 font-bold mb-2">
                        Your {tier.toUpperCase()} {type.toUpperCase()} is being prepared...
                    </div>
                    <div className="text-sm text-gray-400">
                        The creator will reveal your question shortly
                    </div>

                    {/* Progress Ring */}
                    <div className="mt-12">
                        <div className="relative w-32 h-32 mx-auto">
                            <svg className="transform -rotate-90 w-32 h-32">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-gray-800"
                                />
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={`${2 * Math.PI * 56}`}
                                    strokeDashoffset={`${2 * Math.PI * 56 * (countdown / 10)}`}
                                    className={`text-${colors.primary} transition-all duration-1000`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className={`w-8 h-8 text-${colors.primary} animate-spin`} style={{ animationDuration: '3s' }} />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Question Dialog
                <div className="w-full max-w-3xl mx-4 bg-gradient-to-br from-purple-950/60 to-pink-950/60 backdrop-blur-2xl border-2 border-pink-500/60 rounded-3xl p-8 sm:p-12 shadow-[0_0_100px_rgba(236,72,153,0.6)] animate-in zoom-in-95 duration-700">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-pink-500/30 backdrop-blur-md border-2 border-pink-500/50 mb-6 shadow-[0_0_30px_rgba(236,72,153,0.4)] animate-pulse">
                            <Star className="w-6 h-6 text-yellow-400" />
                            <span className="text-base sm:text-lg font-black text-pink-200 uppercase tracking-wide">
                                {tier} {type}
                            </span>
                            <Star className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
                            Your Question!
                        </h2>
                        <p className="text-gray-400 text-sm sm:text-base">
                            The creator has accepted your request
                        </p>
                    </div>

                    {/* Question */}
                    <div className="rounded-2xl bg-black/80 backdrop-blur-md border-2 border-white/30 p-6 sm:p-8 mb-8 shadow-[inset_0_0_60px_rgba(236,72,153,0.1)]">
                        <div className="text-2xl sm:text-4xl font-bold text-white leading-relaxed text-center">
                            "{questionData?.question || pendingRequest.question || "Waiting for creator to reveal..."}"
                        </div>
                    </div>

                    {/* Status */}
                    <div className="text-center">
                        <div className="text-base sm:text-lg text-pink-300 font-bold mb-4">
                            🎥 Creator is preparing to answer...
                        </div>

                        {/* Animated Dots */}
                        <div className="flex justify-center gap-3">
                            <div
                                className="w-3 h-3 bg-pink-400 rounded-full animate-bounce shadow-[0_0_20px_rgba(236,72,153,0.8)]"
                                style={{ animationDelay: '0ms', animationDuration: '1s' }}
                            />
                            <div
                                className="w-3 h-3 bg-pink-400 rounded-full animate-bounce shadow-[0_0_20px_rgba(236,72,153,0.8)]"
                                style={{ animationDelay: '150ms', animationDuration: '1s' }}
                            />
                            <div
                                className="w-3 h-3 bg-pink-400 rounded-full animate-bounce shadow-[0_0_20px_rgba(236,72,153,0.8)]"
                                style={{ animationDelay: '300ms', animationDuration: '1s' }}
                            />
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="mt-8 px-8 py-3 rounded-xl bg-gradient-to-r from-pink-600/80 to-purple-600/80 hover:from-pink-600 hover:to-purple-600 text-white font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(236,72,153,0.4)]"
                        >
                            Continue Watching
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
