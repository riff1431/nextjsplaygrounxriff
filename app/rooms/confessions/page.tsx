"use client";

import React, { useState } from "react";
import { ArrowLeft, Video, Lock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute } from "@/app/context/AuthContext";

/**
 * Confessions Room — Fan View Preview
 * -----------------------------------
 * Purpose: Premium "secret drop" room where creators post confessions (text/voice/video).
 * Fans pay to unlock each item.
 *
 * NOTE: This is a frontend-only mockup sourced from "Confessions Rm Fan View.txt".
 */

// ---- Shared Logic/Components -----------------------------------------------

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                "hover:shadow-[0_0_34px_rgba(236,72,153,0.20),0_0_78px_rgba(59,130,246,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

// ---- Confessions Room (Preview) ------------------------------------------

export default function ConfessionsRoomPreview() {
    const router = useRouter();
    const onBack = () => {
        router.push("/home");
    };

    const creator = { handle: "@NeonNyla", level: "Elite" as const };

    type ConfTier = "Soft" | "Spicy" | "Dirty" | "Dark" | "Forbidden";
    const tierMeta: Record<ConfTier, { price: number; label: string; tone: string }> = {
        Soft: { price: 5, label: "Soft", tone: "border-pink-500/25 text-pink-200" },
        Spicy: { price: 10, label: "Spicy", tone: "border-rose-400/30 text-rose-200" },
        Dirty: { price: 20, label: "Dirty", tone: "border-red-400/30 text-red-200" },
        Dark: { price: 35, label: "Dark", tone: "border-violet-300/30 text-violet-200" },
        Forbidden: { price: 60, label: "Forbidden", tone: "border-yellow-400/30 text-yellow-200" },
    };

    type Confession = {
        id: string;
        tier: ConfTier;
        title: string;
        preview: string;
        type: "Text" | "Voice" | "Video";
    };

    const [walletSpent, setWalletSpent] = useState(0);
    const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
    const [active, setActive] = useState<string | null>(null);

    const confessions: Confession[] = [
        { id: "x1", tier: "Spicy", type: "Voice", title: "Confession #14", preview: "I crave being watched when…" },
        { id: "x2", tier: "Dirty", type: "Text", title: "Confession #15", preview: "Last night I imagined you…" },
        { id: "x3", tier: "Dark", type: "Video", title: "Confession #16", preview: "I shouldn’t admit this but…" },
        { id: "x4", tier: "Soft", type: "Text", title: "Confession #17", preview: "Here’s what I really want…" },
        { id: "x5", tier: "Forbidden", type: "Voice", title: "VIP Confession #18", preview: "Only one person should hear…" },
    ];

    // Countdown confession (crowd push)
    const GOAL_TARGET = 250;
    const [goalTotal, setGoalTotal] = useState(140);

    const reactions = [
        { id: "r1", label: "Text Reply", price: 3 },
        { id: "r2", label: "Voice Reaction", price: 5 },
        { id: "r3", label: "Mini Video Reaction", price: 10 },
    ];

    const [requestTopic, setRequestTopic] = useState("");

    const unlock = (id: string, price: number) => {
        setUnlocked((m) => ({ ...m, [id]: true }));
        setWalletSpent((s) => s + price);
        setActive(id);
    };

    const pay = (amount: number) => setWalletSpent((s) => s + amount);

    const activeConf = confessions.find((c) => c.id === active) ?? null;

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen bg-black text-white">
                <style>{`
            .neon-flicker { animation: neonFlicker 3s infinite alternate; }
            @keyframes neonFlicker {
                0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
                20%, 24%, 55% { opacity: 0.5; }
            }
          `}</style>

                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <div>
                                <div className="text-rose-200 text-sm">Confessions — Room Preview</div>
                                <div className="text-[11px] text-gray-400">Creator-led secrets • Pay-to-unlock • Reactions • Requests</div>
                            </div>
                        </div>


                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Creator spotlight */}
                        <NeonCard className="lg:col-span-4 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-rose-200 text-sm">Creator Spotlight</div>
                                <span className="text-[10px] px-2 py-[2px] rounded-full border border-rose-400/30 text-rose-200 bg-black/40 neon-flicker">
                                    Live
                                </span>
                            </div>

                            <div className="rounded-2xl overflow-hidden border border-rose-400/20 bg-black/40">
                                <div className="relative aspect-video bg-gradient-to-b from-rose-500/18 via-black to-pink-500/10 flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-rose-200">
                                        <Video className="w-5 h-5" />
                                        <span className="text-sm">Creator cam / mic (preview)</span>
                                    </div>
                                    <div className="absolute bottom-3 left-3 text-xs text-gray-200 bg-black/45 border border-white/10 rounded-full px-3 py-1">
                                        {creator.handle} • {creator.level}
                                    </div>
                                    <div className="absolute bottom-3 right-3 text-xs text-rose-200 bg-black/45 border border-rose-400/30 rounded-full px-3 py-1">
                                        “Secrets you weren’t meant to hear”
                                    </div>
                                </div>
                            </div>

                            {/* Countdown confession */}
                            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-black/35 p-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-rose-200">Countdown Confession</div>
                                    <span className="text-[10px] px-2 py-[2px] rounded-full border border-yellow-400/30 text-yellow-200 bg-black/40">
                                        Goal ${GOAL_TARGET}
                                    </span>
                                </div>
                                <div className="mt-2 text-[11px] text-gray-300">Unlocks when the room pushes it over the edge.</div>

                                <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                        className="h-full bg-rose-500/70"
                                        style={{ width: `${clamp((goalTotal / GOAL_TARGET) * 100, 0, 100)}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-xs text-gray-200">
                                    ${goalTotal} / ${GOAL_TARGET}
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {[5, 10, 25].map((amt) => (
                                        <button
                                            key={amt}
                                            className="rounded-xl border border-rose-400/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                            onClick={() => {
                                                setGoalTotal((g) => g + amt);
                                                pay(amt);
                                            }}
                                        >
                                            +${amt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </NeonCard>

                        {/* Center: Confession wall */}
                        <NeonCard className="lg:col-span-5 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-rose-200 text-sm">Confession Wall</div>
                                <span className="text-[10px] text-gray-400">Unlock is per-fan</span>
                            </div>

                            <div className="space-y-3">
                                {confessions.map((c) => {
                                    const meta = tierMeta[c.tier];
                                    const isUnlocked = !!unlocked[c.id];
                                    return (
                                        <div
                                            key={c.id}
                                            className={cx(
                                                "rounded-2xl border bg-black/35 p-3 transition",
                                                isUnlocked ? "border-rose-400/35" : "border-white/10",
                                                active === c.id && "shadow-[0_0_22px_rgba(255,55,95,0.22)]"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm text-gray-100 flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-2">
                                                            <Lock className={cx("w-4 h-4", isUnlocked ? "opacity-0" : "text-rose-200")} />
                                                            <span>{c.title}</span>
                                                        </span>
                                                        <span className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", meta.tone)}>
                                                            {meta.label} • ${meta.price}
                                                        </span>
                                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                                            {c.type}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={cx("mt-2 text-sm", isUnlocked ? "text-gray-100" : "text-gray-300 blur-[1.5px]")}
                                                    >
                                                        {isUnlocked ? c.preview + " (unlocked)" : c.preview}
                                                    </div>
                                                </div>

                                                {!isUnlocked ? (
                                                    <button
                                                        className="shrink-0 rounded-xl border border-rose-400/30 bg-rose-600 px-3 py-2 text-sm hover:bg-rose-700"
                                                        onClick={() => unlock(c.id, meta.price)}
                                                    >
                                                        Unlock
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="shrink-0 rounded-xl border border-rose-400/25 bg-black/40 px-3 py-2 text-sm hover:bg-white/5"
                                                        onClick={() => setActive(c.id)}
                                                    >
                                                        Open
                                                    </button>
                                                )}
                                            </div>

                                            {!isUnlocked && (
                                                <div className="mt-2 text-[11px] text-gray-400">
                                                    Locked. Pay to reveal the full confession for you.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </NeonCard>

                        {/* Right: Reactions + Requests */}
                        <div className="lg:col-span-3 space-y-6">
                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-rose-200 text-sm">Reactions</div>
                                    <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                        Upsells
                                    </span>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-[11px] text-gray-400">Selected confession</div>
                                    <div className="mt-1 text-sm text-gray-100">{activeConf ? activeConf.title : "None selected"}</div>
                                    <div className="mt-2 text-[11px] text-gray-400">Unlock first, then buy reactions.</div>
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-2">
                                    {reactions.map((r) => (
                                        <button
                                            key={r.id}
                                            disabled={!activeConf || !unlocked[activeConf.id]}
                                            className={cx(
                                                "rounded-xl border py-2 text-sm",
                                                activeConf && unlocked[activeConf.id]
                                                    ? "border-rose-400/25 bg-black/40 hover:bg-white/5"
                                                    : "border-white/10 bg-black/20 opacity-50 cursor-not-allowed"
                                            )}
                                            onClick={() => pay(r.price)}
                                        >
                                            {r.label} <span className="text-gray-300">${r.price}</span>
                                        </button>
                                    ))}
                                </div>
                            </NeonCard>

                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-rose-200 text-sm">Request “Unlock for me”</div>
                                    <span className="text-[10px] text-gray-400">$10</span>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-[11px] text-gray-400 mb-2">Topic prompt</div>
                                    <input
                                        value={requestTopic}
                                        onChange={(e) => setRequestTopic(e.target.value)}
                                        className="w-full rounded-xl border border-rose-400/20 bg-black/40 px-3 py-2 text-sm outline-none"
                                        placeholder="Ask for a new confession topic…"
                                    />
                                    <button
                                        className="mt-3 w-full rounded-xl border border-rose-400/30 bg-rose-600 py-2 text-sm hover:bg-rose-700"
                                        onClick={() => {
                                            pay(10);
                                            setRequestTopic("");
                                        }}
                                    >
                                        Send Request ($10)
                                    </button>
                                    <div className="mt-2 text-[10px] text-gray-400">Creator may accept/decline (preview).</div>
                                </div>
                            </NeonCard>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
}
