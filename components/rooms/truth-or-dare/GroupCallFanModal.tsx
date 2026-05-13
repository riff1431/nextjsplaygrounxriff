"use client";

import React from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Video, PhoneOff, Loader2, Users } from "lucide-react";
import { GroupCallState } from "@/hooks/useGroupCall";

const GroupCallStream = dynamic(() => import("@/components/rooms/truth-or-dare/GroupCallStream"), { 
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 rounded-xl">
            <Loader2 className="w-6 h-6 text-cyan-500 animate-spin mb-2" />
            <span className="text-xs text-white/50">Initializing Video Engine...</span>
        </div>
    )
});

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

interface GroupCallFanModalProps {
    callState: GroupCallState;
    userId: string;
    onAcceptCall: () => void;
    onDeclineCall: () => void;
    onDismiss: () => void;
}

export default function GroupCallFanModal({
    callState,
    userId,
    onAcceptCall,
    onDeclineCall,
    onDismiss,
}: GroupCallFanModalProps) {
    const { status, type, agoraChannel } = callState;

    if (status === "invited") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-xl" />
                <div className="relative z-20 w-full max-w-sm mx-4 rounded-2xl border border-cyan-500/30 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 animate-pulse" />

                    <div className="p-6 text-center">
                        <div className="relative w-20 h-20 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                                <Video className="w-8 h-8 text-white animate-bounce" />
                            </div>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">Group Call Unlocked!</h3>
                        <p className="text-sm text-cyan-400 font-semibold mb-1">Group {type === 'truth' ? 'Truth' : 'Dare'} Campaign</p>
                        <p className="text-xs text-white/70 mb-6 leading-relaxed px-2">
                            The creator has started a group video call for all fans who participated in the vote. Join now!
                        </p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={onDeclineCall}
                                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <PhoneOff className="w-4 h-4" />
                                Decline
                            </button>
                            <button
                                onClick={onAcceptCall}
                                className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30"
                            >
                                <Video className="w-4 h-4" />
                                Join Call
                            </button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    if (status === "active") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/90 backdrop-blur-xl" />

                <div className="relative z-20 w-full h-[90vh] max-w-5xl mx-4 rounded-3xl border border-cyan-500/30 bg-[#0d0d1a]/95 shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 bg-black/40">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                            <span className="text-sm font-bold text-white uppercase tracking-wider">
                                Group {type === 'truth' ? 'Truth' : 'Dare'} Call
                            </span>
                        </div>
                    </div>

                    {/* Video Grid Area */}
                    <div className="relative flex-1 bg-black/50 p-2">
                        <GroupCallStream
                            appId={APP_ID}
                            channelName={agoraChannel}
                            uid={userId}
                            role="fan"
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 px-6 py-5 border-t border-white/5 shrink-0 bg-black/40">
                        <button
                            onClick={onDeclineCall}
                            className="px-8 py-3 rounded-full bg-red-600/80 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-900/30"
                        >
                            <PhoneOff className="w-5 h-5" />
                            Leave Session
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    if (status === "ended") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />
                <div className="relative z-20 w-full max-w-xs mx-4 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 p-6 text-center shadow-2xl">
                    <PhoneOff className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">Session Ended</h3>
                    <p className="text-xs text-white/50">The creator has ended the group call.</p>
                </div>
            </div>,
            document.body
        );
    }

    return null;
}
