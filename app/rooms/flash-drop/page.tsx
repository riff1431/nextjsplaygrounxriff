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
            <div className="min-h-screen bg-black text-white fd-theme overflow-hidden font-body">
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
                <div className="relative z-10 flex flex-col h-screen max-w-[1500px] mx-auto w-full">
                    {/* Top ticker bar */}
                    <div className="bg-black/65 border-b border-primary/20 overflow-hidden py-1">
                        <div className="fd-ticker-content inline-flex gap-12 text-xs fd-font-tech text-primary/80">
                            {tickerItems.map((item, i) => (
                                <span key={i} className="shrink-0">{item}</span>
                            ))}
                        </div>
                    </div>

                    {/* Header */}
                    <header className="relative flex items-center justify-between px-5 py-1.5 border-b border-primary/30 bg-black/60 backdrop-blur-md">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 text-foreground/80 fd-font-body font-semibold text-sm hover:border-primary hover:text-foreground transition-all"
                            style={{ boxShadow: "0 0 10px hsl(330 100% 55% / 0.15)" }}
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>

                        <h1
                            className="text-4xl absolute left-1/2 -translate-x-1/2 fd-font-display"
                            style={{
                                color: "hsl(330 100% 70%)",
                                textShadow:
                                    "0 0 10px hsl(330 100% 65% / 0.9), 0 0 30px hsl(330 100% 65% / 0.7), 0 0 60px hsl(330 100% 65% / 0.5)",
                            }}
                        >
                            Flash Drops
                        </h1>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-[10px] text-primary/60 fd-font-tech">WALLET SPENT</div>
                                <div className="text-sm font-bold fd-neon-text">${walletSpent.toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs fd-font-tech text-primary/60">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                LIVE
                            </div>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-hidden">
                        <div className="h-full flex flex-col">
                            {/* Centered layout with adjusted panel widths and gap */}
                            <div className="flex-1 flex justify-center gap-10 px-6 pt-4 overflow-hidden">
                                {/* Left: Drop Board */}
                                <div className="w-[450px] h-full overflow-hidden pb-4">
                                    <LiveDropBoard onSpend={spend} />
                                </div>

                                {/* Right: Impulse Panel */}
                                <div className="w-[420px] h-full overflow-y-auto overflow-x-hidden pr-1 custom-scroll pb-4">
                                    <ImpulsePanel onSpend={spend} />
                                </div>
                            </div>

                            {/* Bottom bundle bar - inside the centered container */}
                            <div className="px-10 py-6">
                                <div className="flex flex-col md:flex-row items-center justify-center gap-0 rounded-xl overflow-hidden fd-neon-border-md bg-black/40 backdrop-blur-md">
                                    {bundles.map((bundle, i) => (
                                        <div key={bundle.name} className="flex-1 w-full flex flex-col items-center gap-0.5 px-4 py-2 relative">
                                            {i < bundles.length - 1 && (
                                                <div className="hidden md:block absolute right-0 top-2 bottom-2 w-px bg-primary/30" />
                                            )}
                                            <div
                                                className="fd-font-display text-xl my-1"
                                                style={{
                                                    color: "hsl(330 100% 75%)",
                                                    textShadow: "0 0 10px hsl(330 100% 70% / 0.8), 0 0 25px hsl(330 100% 70% / 0.5)",
                                                }}
                                            >
                                                {bundle.name}
                                            </div>
                                            <div className="fd-font-body text-xs text-foreground/60">{bundle.subtitle}</div>
                                            <button
                                                onClick={() => spend(bundle.price, `🎁 Pack Unlocked: ${bundle.name}`)}
                                                className="mt-2 mb-1 px-6 py-1.5 rounded fd-font-tech font-bold text-sm text-white transition-all hover:scale-105"
                                                style={{
                                                    background: `linear-gradient(135deg, hsl(330 80% 35%), hsl(330 100% 50%))`,
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
