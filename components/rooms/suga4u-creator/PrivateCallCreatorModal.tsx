"use client";

import React from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Phone, PhoneOff, Clock, Loader2, X } from "lucide-react";
import { PrivateCallState } from "@/hooks/usePrivateCall";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

interface PrivateCallCreatorModalProps {
    callState: PrivateCallState;
    timeRemaining: number;
    userId: string;
    isLoading: boolean;
    onAcceptCall: () => void;
    onDeclineCall: () => void;
    onEndCall: () => void;
    onDismiss: () => void;
}

export default function PrivateCallCreatorModal({
    callState,
    timeRemaining,
    userId,
    isLoading,
    onAcceptCall,
    onDeclineCall,
    onEndCall,
    onDismiss,
}: PrivateCallCreatorModalProps) {
    const { status, fanName, durationSeconds, agoraChannel } = callState;

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const progress = durationSeconds > 0 ? (timeRemaining / durationSeconds) * 100 : 0;

    // Pending — incoming call notification
    if (status === "pending") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl" />
                <div className="relative z-20 w-full max-w-sm mx-4 rounded-2xl border border-emerald-500/30 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                    {/* Accent bar */}
                    <div className="h-1 bg-gradient-to-r from-pink-500 via-gold to-emerald-500 animate-pulse" />

                    <div className="p-6 text-center">
                        {/* Ringing icon */}
                        <div className="relative w-20 h-20 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                                <Phone className="w-8 h-8 text-white animate-bounce" />
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">Incoming 1-on-1 Request</h3>
                        <p className="text-sm text-pink-400 font-semibold mb-1">👑 {fanName}</p>
                        <p className="text-xs text-white/50 mb-5">wants a Private 1-on-1 • {formatTime(durationSeconds)} session</p>

                        {/* Accept / Decline */}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={onDeclineCall}
                                disabled={isLoading}
                                className="flex-1 py-3 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <PhoneOff className="w-4 h-4" />
                                Decline
                            </button>
                            <button
                                onClick={onAcceptCall}
                                disabled={isLoading}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                                Accept
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Ringing — waiting for fan to accept
    if (status === "ringing") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl" />
                <div className="relative z-20 w-full max-w-sm mx-4 rounded-2xl border border-pink-500/30 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl p-6 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-4">
                        <Phone className="w-7 h-7 text-white animate-pulse" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">Calling {fanName}...</h3>
                    <p className="text-xs text-white/50 mb-3">Waiting for them to accept the video call</p>
                    <Loader2 className="w-5 h-5 text-pink-400 animate-spin mx-auto" />
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
                            <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Private 1-on-1 with {fanName}</span>
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
                        <div className="w-full h-full">
                            <LiveStreamWrapper
                                role="host"
                                appId={APP_ID}
                                roomId={agoraChannel}
                                uid={userId}
                                hostId={userId}
                                hostAvatarUrl=""
                                hostName="You"
                            />
                        </div>
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

    // Rejected by fan
    if (status === "rejected_by_fan") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
                <div className="relative z-20 w-full max-w-xs mx-4 rounded-2xl border border-red-500/30 bg-[#1a1a2e]/95 p-6 text-center">
                    <PhoneOff className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">Call Rejected</h3>
                    <p className="text-xs text-white/50">{fanName} rejected the video call.</p>
                </div>
            </div>,
            document.body
        );
    }

    // Ended
    if (status === "ended") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
                <div className="relative z-20 w-full max-w-xs mx-4 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 p-6 text-center">
                    <Clock className="w-10 h-10 text-pink-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">Session Ended</h3>
                    <p className="text-xs text-white/50">Private 1-on-1 with {fanName} has ended.</p>
                </div>
            </div>,
            document.body
        );
    }

    return null;
}
