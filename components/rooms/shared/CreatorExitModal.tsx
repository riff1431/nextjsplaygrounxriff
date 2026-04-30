"use client";

import React, { useState } from "react";
import { X, Minimize2, PowerOff, Loader2 } from "lucide-react";

interface CreatorExitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEndSession: () => Promise<void>;
    onMinimizeSession: () => void;
    roomName: string;
    accentHsl: string; // e.g. "330, 80%, 55%"
}

export default function CreatorExitModal({
    isOpen,
    onClose,
    onEndSession,
    onMinimizeSession,
    roomName,
    accentHsl,
}: CreatorExitModalProps) {
    const [isEnding, setIsEnding] = useState(false);

    if (!isOpen) return null;

    const accentColor = `hsl(${accentHsl})`;
    const accentBg = `hsla(${accentHsl}, 0.15)`;
    const accentBorder = `hsla(${accentHsl}, 0.3)`;

    const handleEndClick = async () => {
        setIsEnding(true);
        try {
            await onEndSession();
        } finally {
            setIsEnding(false);
            // It's expected that onEndSession handles the navigation/closing,
            // but just in case it doesn't fail but also doesn't navigate:
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div 
                className="max-w-md w-full rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                style={{
                    backgroundColor: "hsla(270, 40%, 12%, 0.95)",
                    border: `1px solid ${accentBorder}`,
                    boxShadow: `0 0 40px hsla(${accentHsl}, 0.15)`,
                }}
            >
                {/* Background Glow */}
                <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 blur-[60px] opacity-30 pointer-events-none"
                    style={{ background: accentColor }}
                />

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Exit {roomName}?
                        </h2>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-sm text-white/70 mb-8 leading-relaxed">
                        You can minimize the session to keep it running in the background while you navigate elsewhere, or you can end the session permanently to stop the broadcast and close the room.
                    </p>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onMinimizeSession}
                            disabled={isEnding}
                            className="w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                            style={{
                                background: accentBg,
                                border: `1px solid ${accentBorder}`,
                                color: accentColor,
                            }}
                        >
                            <Minimize2 className="w-4 h-4" />
                            Minimize Session
                        </button>

                        <button
                            onClick={handleEndClick}
                            disabled={isEnding}
                            className="w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all hover:bg-red-600 disabled:opacity-50 bg-red-500 shadow-lg shadow-red-500/20"
                        >
                            {isEnding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <PowerOff className="w-4 h-4" />
                            )}
                            {isEnding ? "Ending..." : "End Session"}
                        </button>

                        <button
                            onClick={onClose}
                            disabled={isEnding}
                            className="w-full py-3 px-4 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors mt-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
