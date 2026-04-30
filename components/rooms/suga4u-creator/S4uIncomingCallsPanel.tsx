"use client";

import React, { useEffect, useRef } from "react";
import { Phone, PhoneOff, X, Clock, Loader2, ChevronDown } from "lucide-react";
import { PrivateCallState } from "@/hooks/usePrivateCall";

interface S4uIncomingCallsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    pendingCalls: PrivateCallState[];
    isLoading: boolean;
    onAccept: (callId: string) => void;
    onDecline: (callId: string) => void;
}

export default function S4uIncomingCallsPanel({
    isOpen,
    onClose,
    pendingCalls,
    isLoading,
    onAccept,
    onDecline,
}: S4uIncomingCallsPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Close panel on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                // Check if the click was on the Incoming button itself (handled by parent)
                const target = e.target as HTMLElement;
                if (target.closest("[data-incoming-btn]")) return;
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const getTimeSince = (call: PrivateCallState) => {
        // Show approximate time since request
        return "Just now";
    };

    return (
        <div
            ref={panelRef}
            className="absolute top-full right-0 mt-2 w-80 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
        >
            {/* Arrow pointer */}
            <div className="absolute -top-1.5 right-6 w-3 h-3 rotate-45 bg-[#1a1a2e] border-l border-t border-pink-500/30" />

            <div className="rounded-2xl border border-pink-500/30 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl shadow-pink-900/20 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-pink-400" />
                        <span className="text-sm font-bold text-white">Incoming 1-on-1 Requests</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-80 overflow-y-auto custom-scroll">
                    {pendingCalls.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-3">
                                <Phone className="w-5 h-5 text-white/20" />
                            </div>
                            <p className="text-sm text-white/40 font-medium">No incoming requests</p>
                            <p className="text-xs text-white/25 mt-1">Fan requests will appear here</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-2">
                            {pendingCalls.map((call) => (
                                <div
                                    key={call.callId}
                                    className="group relative rounded-xl bg-white/5 border border-white/5 hover:border-pink-500/20 p-3 transition-all duration-200"
                                >
                                    {/* Pulse indicator */}
                                    <div className="absolute top-3 right-3">
                                        <div className="relative">
                                            <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
                                            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-pink-500/40 animate-ping" />
                                        </div>
                                    </div>

                                    {/* Fan info */}
                                    <div className="flex items-center gap-2.5 mb-3">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-pink-500/20 flex items-center justify-center shrink-0">
                                            <span className="text-sm font-bold text-white">
                                                {(call.fanName || "F").charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-white truncate">
                                                👑 {call.fanName}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Clock className="w-3 h-3 text-white/30" />
                                                <span className="text-[10px] text-white/40">
                                                    Private 1-on-1 • {formatDuration(call.durationSeconds)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Accept / Decline buttons */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onDecline(call.callId)}
                                            disabled={isLoading}
                                            className="flex-1 py-2 rounded-lg bg-red-600/15 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-600/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                        >
                                            <PhoneOff className="w-3.5 h-3.5" />
                                            Decline
                                        </button>
                                        <button
                                            onClick={() => onAccept(call.callId)}
                                            disabled={isLoading}
                                            className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Phone className="w-3.5 h-3.5" />
                                            )}
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                {pendingCalls.length > 0 && (
                    <div className="px-4 py-2 border-t border-white/5 text-center">
                        <p className="text-[10px] text-white/30">
                            {pendingCalls.length} pending request{pendingCalls.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
