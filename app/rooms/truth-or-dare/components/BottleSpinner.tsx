"use client";

import { useState, useCallback } from "react";

const SEGMENTS = [
    { label: "Kiss", emoji: "💋", reward: "€10", color: "rgba(236,72,153,0.7)" },
    { label: "Truth!", emoji: "💎", reward: "", color: "rgba(59,130,246,0.7)" },
    { label: "Love", emoji: "❤️", reward: "€20", color: "rgba(239,68,68,0.7)" },
    { label: "Dare!", emoji: "⚡", reward: "", color: "rgba(245,158,11,0.7)" },
    { label: "Spicy", emoji: "🔥", reward: "€30", color: "rgba(249,115,22,0.7)" },
    { label: "Wild!", emoji: "🎲", reward: "", color: "rgba(168,85,247,0.7)" },
    { label: "Dark", emoji: "🖤", reward: "€40", color: "rgba(107,114,128,0.7)" },
    { label: "Pass", emoji: "✨", reward: "", color: "rgba(16,185,129,0.7)" },
];

export const BottleSpinner = () => {
    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [glowing, setGlowing] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const spin = useCallback(() => {
        if (spinning) return;
        setSpinning(true);
        setGlowing(true);
        setResult(null);
        const extraDeg = 1440 + Math.random() * 2160;
        setRotation((prev) => prev + extraDeg);
        setTimeout(() => {
            setSpinning(false);
            const seg = SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
            setResult(`${seg.emoji} ${seg.label}`);
            setTimeout(() => setGlowing(false), 1200);
        }, 4000);
    }, [spinning]);

    const segAngle = 360 / SEGMENTS.length;

    return (
        <div className="glass-panel p-5 border-white/10 bg-white/5 flex flex-col items-center relative overflow-hidden">
            {/* Ambient background glow */}
            <div
                className="absolute inset-0 rounded-2xl transition-opacity duration-1000"
                style={{
                    background: glowing
                        ? "radial-gradient(circle at center, rgba(251,191,36,0.08) 0%, transparent 70%)"
                        : "none",
                    opacity: glowing ? 1 : 0,
                }}
            />

            <div className="w-full flex items-center justify-between gap-2 mb-4 relative z-10">
                <span className="text-white text-xs font-bold tracking-wide">▸ Spin the Bottle</span>
                {result && !spinning && (
                    <span className="text-[10px] font-bold text-amber-400 animate-pulse bg-amber-500/10 px-2 py-0.5 rounded-full">
                        → {result}
                    </span>
                )}
            </div>

            {/* Spinner Area */}
            <div className="relative z-10">
                <div
                    className="relative w-48 h-48 rounded-full flex items-center justify-center"
                    style={{
                        background: "conic-gradient(from 0deg, rgba(251,191,36,0.06), rgba(239,68,68,0.06), rgba(168,85,247,0.06), rgba(59,130,246,0.06), rgba(16,185,129,0.06), rgba(251,191,36,0.06))",
                        boxShadow: glowing
                            ? "0 0 60px rgba(251,191,36,0.2), 0 0 120px rgba(251,191,36,0.08), inset 0 0 30px rgba(251,191,36,0.06)"
                            : "0 0 20px rgba(0,0,0,0.3), inset 0 0 15px rgba(0,0,0,0.2)",
                        transition: "box-shadow 1s ease",
                    }}
                >
                    {/* Inner dark circle */}
                    <div className="absolute inset-2 rounded-full bg-black/70 backdrop-blur-sm" />

                    {/* Segment labels around the wheel */}
                    {SEGMENTS.map((seg, i) => {
                        const angle = i * segAngle - 90;
                        const radians = (angle * Math.PI) / 180;
                        const radius = 84;
                        const x = Math.cos(radians) * radius;
                        const y = Math.sin(radians) * radius;

                        return (
                            <div
                                key={i}
                                className="absolute flex flex-col items-center z-10"
                                style={{
                                    left: `calc(50% + ${x}px)`,
                                    top: `calc(50% + ${y}px)`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            >
                                <span className="text-[11px] leading-none">{seg.emoji}</span>
                                <span
                                    className="text-[7px] font-black uppercase tracking-tight mt-0.5 whitespace-nowrap"
                                    style={{
                                        color: seg.color.replace(/[\d.]+\)$/, "1)"),
                                        textShadow: `0 0 8px ${seg.color}`,
                                    }}
                                >
                                    {seg.label}
                                </span>
                                {seg.reward && (
                                    <span className="text-[6px] font-bold text-white/50 mt-px">
                                        {seg.reward}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {/* Divider dots */}
                    {SEGMENTS.map((_, i) => {
                        const midAngle = (i * segAngle + segAngle / 2) - 90;
                        const radians = (midAngle * Math.PI) / 180;
                        const dotRadius = 90;
                        const dx = Math.cos(radians) * dotRadius;
                        const dy = Math.sin(radians) * dotRadius;
                        return (
                            <div
                                key={`dot-${i}`}
                                className="absolute w-1 h-1 rounded-full bg-white/15"
                                style={{
                                    left: `calc(50% + ${dx}px)`,
                                    top: `calc(50% + ${dy}px)`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            />
                        );
                    })}

                    {/* Champagne Bottle */}
                    <div
                        className="absolute w-full h-full flex items-center justify-center z-20"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: spinning ? "transform 4.5s cubic-bezier(0.12, 0.7, 0.12, 1)" : "none",
                            filter: spinning
                                ? "drop-shadow(0 0 20px rgba(251,191,36,0.5))"
                                : "drop-shadow(0 0 8px rgba(0,0,0,0.6))",
                        }}
                    >
                        <div className="flex flex-col items-center">
                            {/* Foil top */}
                            <div className="w-2 h-1 bg-gradient-to-b from-yellow-300 to-amber-500 rounded-t-sm" />
                            <div className="w-3.5 h-2.5 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 rounded-t-sm shadow-md" />
                            {/* Neck */}
                            <div className="w-2.5 h-8 bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-900 relative">
                                <div className="absolute bottom-2 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500/40 via-amber-400/60 to-amber-500/40" />
                                <div className="absolute top-0 left-0 w-0.5 h-full bg-white/10 rounded-full" />
                            </div>
                            {/* Shoulder */}
                            <div className="w-6 h-3 bg-gradient-to-b from-emerald-800 to-emerald-900 rounded-t-2xl" />
                            {/* Body */}
                            <div className="w-7 h-10 bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 relative rounded-b-lg shadow-xl">
                                <div className="absolute inset-x-1 top-1.5 bottom-2.5 bg-gradient-to-br from-amber-200 via-amber-100 to-amber-300 rounded-sm flex flex-col items-center justify-center p-0.5 shadow-inner">
                                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-sm">
                                        <span className="text-[4px] font-black text-amber-900">PGX</span>
                                    </div>
                                    <div className="w-3 h-px bg-amber-600/30 mt-0.5" />
                                </div>
                                <div className="absolute top-0 left-0.5 w-0.5 h-full bg-white/8 rounded-full" />
                            </div>
                        </div>
                    </div>

                    {/* Center glass dot */}
                    <div className="absolute z-30 flex items-center justify-center">
                        <div
                            className={`absolute w-8 h-8 rounded-full border border-amber-500/20 transition-all duration-1000 ${spinning ? "scale-150 opacity-0" : "scale-100 opacity-100"}`}
                        />
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]" />
                    </div>
                </div>
            </div>

            {/* Spin Button */}
            <button
                onClick={spin}
                disabled={spinning}
                className={`w-full mt-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 relative overflow-hidden group ${spinning
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-white/5 text-white hover:bg-amber-500/10 hover:text-amber-300"
                    }`}
                style={{
                    boxShadow: spinning ? "0 0 25px rgba(251,191,36,0.15)" : "none",
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10 flex items-center gap-2">
                    <span className={`text-base ${spinning ? "animate-spin" : ""}`}>🍾</span>
                    <span>{spinning ? "Spinning..." : "Spin!"}</span>
                </span>
            </button>
        </div>
    );
};
