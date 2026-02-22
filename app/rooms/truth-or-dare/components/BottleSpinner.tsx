"use client";

import { useState, useCallback } from "react";
import { Flame } from "lucide-react";

export const BottleSpinner = () => {
    const [rotation, setRotation] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [glowing, setGlowing] = useState(false);

    const spin = useCallback(() => {
        if (spinning) return;
        setSpinning(true);
        setGlowing(true);
        const extraDeg = 1080 + Math.random() * 2160;
        setRotation((prev) => prev + extraDeg);
        setTimeout(() => {
            setSpinning(false);
            setTimeout(() => setGlowing(false), 600);
        }, 3500);
    }, [spinning]);

    return (
        <div className="glass-panel p-5 border-white/5 bg-black/20 flex flex-col items-center">
            <div className="w-full flex items-center justify-start gap-2 mb-4">
                <span className="text-white text-xs font-bold tracking-wide">▸ Spin the Bottle</span>
            </div>

            <div
                className="relative w-40 h-40 rounded-full flex items-center justify-center border border-white/5 bg-black/20"
                style={{
                    boxShadow: glowing ? "0 0 40px rgba(251, 191, 36, 0.15), inset 0 0 20px rgba(251, 191, 36, 0.05)" : "none",
                    transition: "box-shadow 0.8s ease",
                }}
            >
                {/* Tick marks around the circle - Colorful like in screenshot */}
                {Array.from({ length: 24 }).map((_, i) => {
                    let color = "bg-white/10";
                    if (i % 6 === 0) color = "bg-amber-400";
                    else if (i % 3 === 0) color = i % 2 === 0 ? "bg-blue-400" : "bg-red-400";

                    return (
                        <div
                            key={i}
                            className={`absolute w-0.5 h-1.5 ${color} rounded-full transition-opacity duration-300`}
                            style={{
                                transform: `rotate(${i * 15}deg) translateY(-74px)`,
                                opacity: spinning ? (Math.random() > 0.5 ? 1 : 0.5) : 0.6
                            }}
                        />
                    );
                })}

                {/* Champagne Bottle - Premium Look */}
                <div
                    className="absolute w-full h-full flex items-center justify-center z-20"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: spinning ? "transform 4s cubic-bezier(0.15, 0.65, 0.15, 1)" : "none",
                        filter: spinning ? "drop-shadow(0 0 15px rgba(251, 191, 36, 0.4))" : "drop-shadow(0 0 5px rgba(0,0,0,0.5))",
                    }}
                >
                    <div className="flex flex-col items-center scale-90">
                        {/* Foil top & Cork */}
                        <div className="w-2.5 h-1 bg-amber-400 rounded-t-sm" />
                        <div className="w-3.5 h-2.5 bg-gradient-to-b from-amber-300 to-amber-600 rounded-t-sm shadow-sm" />

                        {/* Neck */}
                        <div className="w-2.5 h-10 bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900 relative">
                            <div className="absolute bottom-2 left-0 right-0 h-2 bg-amber-500/50" />
                        </div>

                        {/* Shoulder & Body */}
                        <div className="w-7 h-4 bg-emerald-900 rounded-t-xl" />
                        <div className="w-8 h-12 bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 relative rounded-b-lg shadow-xl">
                            {/* Gold Label */}
                            <div className="absolute inset-x-1 top-2 bottom-4 bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 rounded-sm flex flex-col items-center justify-center p-0.5">
                                <div className="w-4 h-4 rounded-full border border-amber-600/50 flex items-center justify-center">
                                    <span className="text-[6px] font-black text-amber-800">X</span>
                                </div>
                                <div className="w-4 h-[1px] bg-amber-600/20 mt-0.5" />
                                <div className="w-3 h-[1px] bg-amber-600/20 mt-0.5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center glass dot */}
                <div className="absolute w-4 h-4 rounded-full z-30 bg-white/10 backdrop-blur-md border border-white/20 shadow-inner" />
            </div>

            <button
                onClick={spin}
                disabled={spinning}
                className="w-full mt-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-30"
            >
                <div className="flex items-center gap-2">
                    <Flame className={`w-4 h-4 ${spinning ? "animate-pulse text-amber-400" : "text-gray-400"}`} />
                    <span>{spinning ? "Spinning..." : "Spin!"}</span>
                </div>
            </button>
        </div>
    );
};
