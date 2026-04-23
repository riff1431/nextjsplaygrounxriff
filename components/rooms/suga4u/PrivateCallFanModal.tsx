"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Loader2, Clock } from "lucide-react";
import { PrivateCallState } from "@/hooks/usePrivateCall";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

interface PrivateCallFanModalProps {
    callState: PrivateCallState;
    timeRemaining: number;
    userId: string;
    isLoading: boolean;
    onAcceptRinging: () => void;
    onRejectRinging: () => void;
    onEndCall: () => void;
    onDismiss: () => void;
    hostAvatarUrl?: string;
    hostName?: string;
}

export default function PrivateCallFanModal({
    callState,
    timeRemaining,
    userId,
    isLoading,
    onAcceptRinging,
    onRejectRinging,
    onEndCall,
    onDismiss,
    hostAvatarUrl,
    hostName,
}: PrivateCallFanModalProps) {
    const { status, durationSeconds, agoraChannel } = callState;

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const progress = durationSeconds > 0 ? (timeRemaining / durationSeconds) * 100 : 0;

    // Pending state — waiting for creator
    if (status === "pending") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl" />
                <div className="relative z-20 w-full max-w-sm mx-4 rounded-2xl border border-pink-500/30 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden p-6 text-center">
                    <div className="mb-4">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-4 animate-pulse">
                            <Phone className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Requesting Private 1-on-1</h3>
                        <p className="text-sm text-white/50">Waiting for {hostName || "creator"} to accept...</p>
                    </div>
                    <Loader2 className="w-6 h-6 text-pink-400 animate-spin mx-auto mb-4" />
                    <button
                        onClick={onDismiss}
                        className="text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    // Ringing state — creator accepted, fan must accept/reject video
    if (status === "ringing") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl" />
                <div className="relative z-20 w-full max-w-sm mx-4 rounded-2xl border border-emerald-500/30 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden p-6 text-center">
                    {/* Pulsing avatar */}
                    <div className="mb-5">
                        <div className="relative w-24 h-24 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse" />
                            {hostAvatarUrl ? (
                                <img src={hostAvatarUrl} alt={hostName} className="relative w-24 h-24 rounded-full object-cover border-3 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                            ) : (
                                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/30 to-pink-500/30 flex items-center justify-center border-3 border-emerald-400">
                                    <span className="text-3xl font-bold text-white">{(hostName || "C").charAt(0)}</span>
                                </div>
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">{hostName || "Creator"} is calling!</h3>
                        <p className="text-sm text-white/50">Private 1-on-1 Video Call • {formatTime(durationSeconds)}</p>
                    </div>

                    {/* Accept / Reject */}
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={onRejectRinging}
                            disabled={isLoading}
                            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-lg shadow-red-900/30 disabled:opacity-50"
                        >
                            <PhoneOff className="w-6 h-6 text-white" />
                        </button>
                        <button
                            onClick={onAcceptRinging}
                            disabled={isLoading}
                            className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-all shadow-lg shadow-emerald-900/30 animate-bounce disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Phone className="w-6 h-6 text-white" />}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Active call — 2-way video
    if (status === "active") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/85 backdrop-blur-xl" />

                <div className="relative z-20 w-full max-w-2xl mx-4 rounded-2xl border border-pink-500/30 bg-[#0d0d1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "90vh" }}>
                    {/* Timer bar */}
                    <div className="relative h-1.5 bg-black/50 shrink-0">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-400 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Private 1-on-1</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-pink-400" />
                            <span className={`text-sm font-mono font-bold ${timeRemaining <= 10 ? "text-red-400 animate-pulse" : "text-white"}`}>
                                {formatTime(timeRemaining)}
                            </span>
                        </div>
                    </div>

                    {/* Video area */}
                    <div className="relative flex-1 min-h-[300px] bg-black">
                        {/* Creator's video (main) */}
                        <div className="w-full h-full">
                            <LiveStreamWrapper
                                role="fan"
                                appId={APP_ID}
                                roomId={agoraChannel}
                                uid={userId}
                                hostId={callState.creatorId}
                                hostAvatarUrl={hostAvatarUrl}
                                hostName={hostName}
                            />
                        </div>

                        {/* Self-view PiP (bottom right) */}
                        <div className="absolute bottom-3 right-3 w-28 h-20 rounded-lg overflow-hidden border-2 border-white/20 shadow-xl bg-black/50">
                            <div className="w-full h-full flex items-center justify-center text-white/40 text-[10px]">
                                You
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 px-4 py-4 border-t border-white/5 shrink-0">
                        <button
                            onClick={onEndCall}
                            className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-900/30"
                        >
                            <PhoneOff className="w-4 h-4" />
                            End Call
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Declined / ended states — brief toast
    if (status === "declined") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
                <div className="relative z-20 w-full max-w-xs mx-4 rounded-2xl border border-red-500/30 bg-[#1a1a2e]/95 p-6 text-center">
                    <PhoneOff className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">Call Declined</h3>
                    <p className="text-xs text-white/50">The creator declined the 1-on-1 request.</p>
                </div>
            </div>,
            document.body
        );
    }

    if (status === "ended") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
                <div className="relative z-20 w-full max-w-xs mx-4 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 p-6 text-center">
                    <Clock className="w-10 h-10 text-pink-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">Session Ended</h3>
                    <p className="text-xs text-white/50">Your private 1-on-1 session has ended.</p>
                </div>
            </div>,
            document.body
        );
    }

    return null;
}
