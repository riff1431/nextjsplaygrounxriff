"use client";

import React from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { PhoneOff, Loader2, Users } from "lucide-react";
import { GroupCallState } from "@/hooks/useGroupCall";

const GroupCallStream = dynamic(() => import("@/components/rooms/truth-or-dare/GroupCallStream"), { 
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 rounded-xl">
            <Loader2 className="w-6 h-6 text-pink-500 animate-spin mb-2" />
            <span className="text-xs text-white/50">Initializing Video Engine...</span>
        </div>
    )
});

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

interface GroupCallCreatorModalProps {
    callState: GroupCallState;
    userId: string;
    onEndCall: () => void;
    onDismiss: () => void;
}

export default function GroupCallCreatorModal({
    callState,
    userId,
    onEndCall,
    onDismiss,
}: GroupCallCreatorModalProps) {
    const { status, type, agoraChannel, participantFanIds } = callState;

    if (status === "active") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                <div className="absolute inset-0 z-10 bg-black/90 backdrop-blur-xl" />

                <div className="relative z-20 w-full h-[90vh] max-w-5xl mx-4 rounded-3xl border border-pink-500/30 bg-[#0d0d1a]/95 shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 bg-black/40">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                            <span className="text-sm font-bold text-white uppercase tracking-wider">
                                Group {type === 'truth' ? 'Truth' : 'Dare'} Call
                            </span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                            <Users className="w-4 h-4 text-pink-400" />
                            <span className="text-xs font-bold text-white">
                                {participantFanIds.length} Invited
                            </span>
                        </div>
                    </div>

                    {/* Video Grid Area */}
                    <div className="relative flex-1 bg-black/50 p-2">
                        <GroupCallStream
                            appId={APP_ID}
                            channelName={agoraChannel}
                            uid={userId}
                            role="creator"
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 px-6 py-5 border-t border-white/5 shrink-0 bg-black/40">
                        <button
                            onClick={onEndCall}
                            className="px-8 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-900/30"
                        >
                            <PhoneOff className="w-5 h-5" />
                            End Group Session
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
                    <PhoneOff className="w-10 h-10 text-pink-400 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">Session Ended</h3>
                    <p className="text-xs text-white/50">The group video call has ended.</p>
                </div>
            </div>,
            document.body
        );
    }

    return null;
}
