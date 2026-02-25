"use client";

import { Heart, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const S4uDashboardHeader = () => {
    const router = useRouter();

    return (
        <header className="s4u-creator-glass-panel px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.push("/home")}
                    className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <div className="w-10 h-10 rounded-full bg-pink-500/30 border-2 border-pink-400 flex items-center justify-center">
                    <span className="text-lg">🌸</span>
                </div>
                <h1 className="s4u-creator-font-display text-2xl font-bold text-white">
                    Suga <span className="s4u-creator-text-primary">4U</span>
                </h1>
            </div>

            <div className="flex items-center gap-3">
                <button className="bg-pink-500 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-pink-400 transition-colors">
                    Start Session
                </button>
                <button className="bg-white/10 text-white px-5 py-2 rounded-lg text-sm font-bold border border-white/20 hover:bg-white/20 transition-colors">
                    Stop Session
                </button>
            </div>

            <h2 className="s4u-creator-font-display text-xl font-bold text-white">
                PlayGround<span className="s4u-creator-text-primary">X</span>
            </h2>
        </header>
    );
};

export default S4uDashboardHeader;
