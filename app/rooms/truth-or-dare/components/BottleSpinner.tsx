"use client";

import { useState, useCallback } from "react";

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
        <div className="glass-panel gold-glow p-4 mt-4 flex flex-col items-center">
            <h3 className="text-sm font-display font-semibold text-foreground mb-3">▸ Spin the Bottle</h3>
            <div
                className="relative w-36 h-36 rounded-full flex items-center justify-center"
                style={{
                    background: "radial-gradient(circle, hsla(40,80%,55%,0.08) 0%, transparent 70%)",
                    boxShadow: glowing ? "0 0 30px hsla(40,80%,55%,0.3), inset 0 0 20px hsla(40,80%,55%,0.1)" : "none",
                    transition: "box-shadow 0.6s ease",
                }}
            >
                {/* Tick marks around the circle */}
                {Array.from({ length: 12 }).map((_, i) => {
                    const isLeft = i >= 4 && i <= 8;
                    const isRight = i <= 2 || i >= 10;
                    const color = isLeft ? "bg-neon-blue/60" : isRight ? "bg-neon-red/60" : "bg-primary/30";
                    return (
                        <div
                            key={i}
                            className={`absolute w-0.5 h-2 ${color} rounded-full`}
                            style={{
                                transform: `rotate(${i * 30}deg) translateY(-62px)`,
                            }}
                        />
                    );
                })}

                {/* Champagne Bottle */}
                <div
                    className="absolute w-full h-full flex items-center justify-center"
                    style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: spinning ? "transform 3.5s cubic-bezier(0.15, 0.6, 0.15, 1)" : "none",
                        filter: spinning ? "drop-shadow(0 0 12px hsla(40,80%,55%,0.6))" : "drop-shadow(0 0 4px hsla(40,80%,55%,0.2))",
                    }}
                >
                    {/* Foil top */}
                    <div className="flex flex-col items-center">
                        <div className="w-2 h-1.5 rounded-t-sm bg-primary" />
                        {/* Cork / cap */}
                        <div className="w-3 h-2 bg-gradient-to-b from-primary to-yellow-600 rounded-t-sm" />
                        {/* Neck */}
                        <div className="w-2.5 h-8 bg-gradient-to-b from-green-800 via-green-700 to-green-800 rounded-t-sm relative">
                            {/* Neck label band */}
                            <div className="absolute bottom-1 left-0 right-0 h-2 bg-primary/60 rounded-sm" />
                        </div>
                        {/* Shoulder */}
                        <div
                            className="w-6 h-3 bg-gradient-to-b from-green-800 to-green-900"
                            style={{ borderRadius: "2px 2px 0 0" }}
                        />
                        {/* Body */}
                        <div className="w-6 h-10 bg-gradient-to-b from-green-900 via-green-800 to-green-950 relative rounded-b-md">
                            {/* Label */}
                            <div className="absolute inset-x-0.5 top-1 bottom-3 bg-gradient-to-b from-amber-100 to-amber-200 rounded-sm flex items-center justify-center">
                                <div className="w-3 h-3 rounded-full border border-primary/60 flex items-center justify-center">
                                    <span className="text-[5px] font-bold text-primary">X</span>
                                </div>
                            </div>
                            {/* Bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-green-950 rounded-b-md" />
                        </div>
                    </div>
                </div>

                {/* Center dot */}
                <div
                    className="absolute w-3 h-3 rounded-full z-10"
                    style={{
                        background: "radial-gradient(circle, hsl(40,80%,65%), hsl(40,80%,45%))",
                        boxShadow: "0 0 10px hsla(40,80%,55%,0.6)",
                    }}
                />
            </div>
            <button
                onClick={spin}
                disabled={spinning}
                className="glass-panel mt-3 px-6 py-2 text-xs gold-text hover:bg-primary/10 transition-all disabled:opacity-50 active:scale-95"
            >
                {spinning ? "✨ Spinning..." : "🍾 Spin!"}
            </button>
        </div>
    );
};
