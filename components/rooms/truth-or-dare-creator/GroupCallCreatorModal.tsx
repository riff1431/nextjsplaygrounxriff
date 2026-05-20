"use client";

import React from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { PhoneOff, Loader2, Users } from "lucide-react";
import { GroupCallState } from "@/hooks/useGroupCall";

const GroupCallStream = dynamic(
    () => import("@/components/rooms/truth-or-dare/GroupCallStream"),
    {
        ssr: false,
        loading: () => (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a10] gap-4">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                <span className="text-xs text-white/30 tracking-widest uppercase">
                    Initializing Video Engine…
                </span>
            </div>
        ),
    }
);

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

interface GroupCallCreatorModalProps {
    callState: GroupCallState;
    userId: string;
    creatorName?: string;
    onEndCall: () => void;
    onDismiss: () => void;
}

export default function GroupCallCreatorModal({
    callState,
    userId,
    creatorName = "You (Creator)",
    onEndCall,
    onDismiss,
}: GroupCallCreatorModalProps) {
    const { status, type, agoraChannel, participantFanIds } = callState;

    // ── Active call — full-screen ──────────────────────────────────────────────
    if (status === "active") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex flex-col bg-[#07070f]">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/6 bg-black/40 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        {/* Live dot */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                                LIVE
                            </span>
                        </div>

                        {/* Call type */}
                        <span className="text-sm font-bold text-white tracking-wide">
                            Group {type === 'truth' ? 'Truth' : type === 'dare' ? 'Dare' : 'Suga Goal'} Call
                        </span>

                        {/* Host badge */}
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            👑 Host
                        </span>
                    </div>

                    {/* Fan count pill */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Users className="w-3.5 h-3.5 text-pink-400" />
                        <span className="text-xs text-white/60 font-semibold">
                            {participantFanIds.length} fan{participantFanIds.length !== 1 ? 's' : ''} invited
                        </span>
                    </div>
                </div>

                {/* Stream fills remaining height */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <GroupCallStream
                        appId={APP_ID}
                        channelName={agoraChannel}
                        uid={userId}
                        role="creator"
                        onLeave={onEndCall}
                        localDisplayName={creatorName}
                        participantFanIds={participantFanIds}
                        creatorId={userId}
                    />
                </div>
            </div>,
            document.body
        );
    }

    // ── Call ended ─────────────────────────────────────────────────────────────
    if (status === "ended") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onDismiss} />
                <div className="relative z-10 w-full max-w-xs rounded-3xl border border-white/10 bg-[#0d0d1a]/98 p-7 text-center shadow-2xl">
                    <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                        <PhoneOff className="w-6 h-6 text-white/40" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">Group Session Ended</h3>
                    <p className="text-xs text-white/40 mb-5">
                        All fans have been disconnected from the group call.
                    </p>
                    <button
                        onClick={onDismiss}
                        className="w-full py-2.5 rounded-xl bg-white/8 border border-white/10 text-white/70 text-sm font-bold hover:bg-white/12 transition-all"
                    >
                        Dismiss
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    return null;
}
