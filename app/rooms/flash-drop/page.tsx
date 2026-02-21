"use client";

import React, { useState } from "react";
import { ArrowLeft, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute } from "@/app/context/AuthContext";
import LiveDropBoard from "@/components/rooms/flash-drops/LiveDropBoard";
import ImpulsePanel from "@/components/rooms/flash-drops/ImpulsePanel";

/**
 * Flash Drops Room — Fan View Preview
 * -----------------------------------
 * Purpose: Time-limited content drops with aggressive high-value purchase lanes.
 */

export default function FlashDropsRoomPreview() {
    const router = useRouter();
    const onBack = () => router.push("/home");

    const [walletSpent, setWalletSpent] = useState(420);
    const [toast, setToast] = useState<string | null>(null);

    const spend = (amount: number, msg: string) => {
        setWalletSpent((s) => s + amount);
        setToast(msg);
        window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500);
    };

    const tickerItems = [
        "🔥 VAULT DROP LIVE NOW",
        "💎 Diamond Patron unlocked",
        "⚡ New flash drop in 3 minutes",
        "🌟 Lux Dungeon Preview RARE",
        "💰 Whale Bundle — 2 slots left",
        "🎁 Golden Key access — limited",
        "🔥 VAULT DROP LIVE NOW",
        "💎 Diamond Patron unlocked",
        "⚡ New flash drop in 3 minutes",
        "🌟 Lux Dungeon Preview RARE",
        "💰 Whale Bundle — 2 slots left",
        "🎁 Golden Key access — limited",
    ];

    const bundles = [
        { name: "Weekend Bundle", subtitle: "3 drops + 1 DM", price: 500 },
        { name: "Backstage Bundle", subtitle: "5 drops + Vault preview", price: 1000 },
        { name: "Whale Bundle", subtitle: "All drops + today priority", price: 2500 },
    ];

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen bg-black text-white fd-theme font-body">
                {toast && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border border-primary/50 bg-black/80 px-4 py-2 text-sm text-foreground shadow-[0_0_40px_hsl(330_100%_55%/0.3)] animate-float">
                        {toast}
                    </div>
                )}

                {/* Background image */}
                <div
                    className="fixed inset-0 z-0"
                    style={{
                        backgroundImage: `url(/flash-drops/nightclub-bg.png)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                />

                {/* Content separation overlay (shadow) */}
                <div
                    className="fixed inset-0 z-0 bg-black/45"
                    aria-hidden="true"
                />

                {/* Ambient neon glow orb */}
                <div
                    className="fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none z-0"
                    style={{
                        background: "radial-gradient(circle, hsl(330 100% 55% / 0.06) 0%, transparent 70%)",
                    }}
                />

                {/* Main content */}
                <div className="relative z-10 flex flex-col min-h-screen max-w-[1500px] mx-auto w-full">
                    {/* Top ticker bar */}
                    <div className="bg-black/65 border-b border-primary/20 overflow-hidden py-1">
                        <div className="fd-ticker-content inline-flex gap-12 text-xs fd-font-tech text-primary/80">
                            {tickerItems.map((item, i) => (
                                <span key={i} className="shrink-0">{item}</span>
                            ))}
                        </div>
                    </div>


                    {/* Main Content Area */}
                    <main className="flex-1">
                        <div className="flex flex-col">
                            {/* Mid-scale layout for better breathing room - Increased top padding */}
                            <div className="flex-1 flex justify-center gap-20 px-4 pt-20 pb-8">
                                {/* Left: Drop Board */}
                                <div className="w-[440px] pb-4">
                                    <LiveDropBoard onSpend={spend} />
                                </div>

                                {/* Right: Impulse Panel */}
                                <div className="w-[400px] pb-4">
                                    <ImpulsePanel onSpend={spend} />
                                </div>
                            </div>

                            {/* Adjusted bundle bar - more compact */}
                            <div className="px-10 py-3 pb-6">
                                <div className="flex flex-col md:flex-row items-center justify-center gap-0 rounded-2xl overflow-hidden fd-neon-border-md bg-black/40 backdrop-blur-md max-w-4xl mx-auto border border-primary/30">
                                    {bundles.map((bundle, i) => (
                                        <div key={bundle.name} className="flex-1 w-full flex flex-col items-center gap-0.5 px-4 py-2.5 relative hover:bg-white/5 transition-colors cursor-pointer group">
                                            {i < bundles.length - 1 && (
                                                <div className="hidden md:block absolute right-0 top-3 bottom-3 w-px bg-primary/30" />
                                            )}
                                            <div
                                                className="fd-font-display text-xl my-0.5 group-hover:scale-105 transition-transform"
                                                style={{
                                                    color: "hsl(330 100% 80%)",
                                                    textShadow: "0 0 10px hsl(330 100% 70% / 0.8), 0 0 30px hsl(330 100% 70% / 0.2)",
                                                }}
                                            >
                                                {bundle.name}
                                            </div>
                                            <div className="fd-font-body text-[10px] text-foreground/40 font-bold uppercase tracking-tight">{bundle.subtitle}</div>
                                            <button
                                                onClick={() => spend(bundle.price, `🎁 Pack Unlocked: ${bundle.name}`)}
                                                className="mt-2 mb-0.5 px-6 py-1.5 rounded-lg fd-font-tech font-black text-xs text-white transition-all hover:scale-110 active:scale-95 uppercase tracking-widest"
                                                style={{
                                                    background: `linear-gradient(135deg, hsl(330 100% 40%), hsl(330 100% 55%))`,
                                                    boxShadow: "0 0 15px hsl(330 100% 55% / 0.4), 0 0 30px hsl(330 100% 55% / 0.2)",
                                                }}
                                            >
                                                Buy · ${bundle.price.toLocaleString()}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </ProtectRoute>
    );
}
