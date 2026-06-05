"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Coins, RotateCcw, HelpCircle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import BrandLogo from "@/components/common/BrandLogo";
import { cs } from "@/utils/currency";

export default function CasinoPlayFullscreenPage() {
    const router = useRouter();
    const { balance: walletBalance } = useWallet();

    return (
        <div className="h-screen w-full flex flex-col bg-[#05020a] text-white overflow-hidden select-none">
            {/* Header */}
            <header className="h-[76px] border-b border-yellow-500/10 bg-black/80 flex items-center justify-between px-6 shrink-0 z-30 shadow-lg">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push("/rooms/casino")}
                        className="p-2 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:bg-purple-950/20 text-purple-400 hover:text-purple-300 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        <BrandLogo showBadge={false} />
                        <span className="text-white/40 text-xs font-normal border-l border-white/20 pl-3">Solo Casino Floor</span>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    {/* Wallet display */}
                    <div className="flex items-center gap-2 bg-[#1a1103] border border-yellow-500/20 px-4 py-2 rounded-2xl">
                        <span className="text-yellow-400 text-sm">🪙</span>
                        <span className="font-mono text-sm font-bold text-yellow-200">{cs()}{walletBalance.toFixed(2)}</span>
                    </div>

                    <button
                        onClick={() => {
                            const iframe = document.getElementById("casino-iframe") as HTMLIFrameElement;
                            if (iframe) iframe.src = iframe.src;
                        }}
                        className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-950/20 transition cursor-pointer"
                        title="Reload Casino Floor"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => router.push("/rooms/casino/lounges")}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)] text-xs font-bold uppercase transition"
                    >
                        👥 Live Lounges
                    </button>
                </div>
            </header>

            {/* Iframe Arena */}
            <div className="flex-1 min-h-0 w-full relative bg-black">
                {/* Glowing neon border effect around the iframe */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-500 opacity-60 z-20" />
                <iframe
                    id="casino-iframe"
                    src="/rooms/casino/mock-pgxcasino"
                    className="w-full h-full border-0 z-10 relative"
                    allow="fullscreen; autoplay; camera; microphone"
                />
            </div>
        </div>
    );
}
