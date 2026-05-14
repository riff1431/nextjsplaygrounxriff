"use client";

import React from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Video, PhoneOff, Loader2, Users } from "lucide-react";
import { GroupCallState } from "@/hooks/useGroupCall";

const GroupCallStream = dynamic(
    () => import("@/components/rooms/truth-or-dare/GroupCallStream"),
    {
        ssr: false,
        loading: () => (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a10] gap-4">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                <span className="text-xs text-white/30 tracking-widest uppercase">
                    Initializing Video Engine…
                </span>
            </div>
        ),
    }
);

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

interface GroupCallFanModalProps {
    callState: GroupCallState;
    userId: string;
    userName?: string;
    onAcceptCall: () => void;
    onDeclineCall: () => void;
    onDismiss: () => void;
}

export default function GroupCallFanModal({
    callState,
    userId,
    userName = "You",
    onAcceptCall,
    onDeclineCall,
    onDismiss,
}: GroupCallFanModalProps) {
    const { status, type, agoraChannel, participantFanIds, creatorId } = callState;

    // ── Incoming invitation ────────────────────────────────────────────────────
    if (status === "invited") {
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl" />

                {/* Card */}
                <div className="relative z-10 w-full max-w-sm rounded-3xl border border-cyan-500/25 bg-[#0d0d1a]/98 shadow-[0_0_80px_rgba(6,182,212,0.2)] overflow-hidden">
                    {/* Animated top bar */}
                    <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500 animate-pulse" />

                    <div className="p-7 text-center">
                        {/* Pulsing icon */}
                        <div className="relative w-24 h-24 mx-auto mb-5">
                            <div className="absolute inset-0 rounded-full bg-cyan-500/15 animate-ping" />
                            <div className="absolute inset-2 rounded-full bg-cyan-500/10 animate-ping" style={{ animationDelay: '0.3s' }} />
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)] relative z-10">
                                <Video className="w-10 h-10 text-white" />
                            </div>
                        </div>

                        {/* Labels */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                                Live {type === 'truth' ? 'Truth' : 'Dare'} Campaign
                            </span>
                        </div>

                        <h3 className="text-xl font-black text-white mb-2">
                            Group Call Unlocked!
                        </h3>
                        <p className="text-sm text-white/55 leading-relaxed px-2 mb-6">
                            The creator is inviting you to a live group video call.
                            Join now to participate!
                        </p>

                        {/* Fan count */}
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Users className="w-3.5 h-3.5 text-white/40" />
                                <span className="text-xs text-white/40">
                                    {participantFanIds.length} fan{participantFanIds.length !== 1 ? 's' : ''} invited
                                </span>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onDeclineCall}
                                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 hover:text-white/80 transition-all flex items-center justify-center gap-2"
                            >
                                <PhoneOff className="w-4 h-4" />
                                Decline
                            </button>
                            <button
                                onClick={onAcceptCall}
                                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/40 hover:scale-[1.02] active:scale-[0.98]"
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

    // ── Active call — full-screen video grid ───────────────────────────────────
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

                        <span className="text-sm font-bold text-white tracking-wide">
                            Group {type === 'truth' ? 'Truth' : 'Dare'} Call
                        </span>
                    </div>

                    {/* Invited fan pill */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <Users className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-xs text-white/40">
                            {participantFanIds.length} invited
                        </span>
                    </div>
                </div>

                {/* Stream fills remaining height — explicit flex-1 wrapper ensures height propagates */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <GroupCallStream
                        appId={APP_ID}
                        channelName={agoraChannel}
                        uid={userId}
                        role="fan"
                        onLeave={onDeclineCall}
                        localDisplayName={userName}
                        participantFanIds={participantFanIds}
                        creatorId={creatorId}
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
                    <h3 className="text-base font-bold text-white mb-1">Session Ended</h3>
                    <p className="text-xs text-white/40 mb-5">The creator has ended the group call.</p>
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
