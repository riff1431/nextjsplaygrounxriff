"use client";

import React, { useState, useEffect } from "react";

import { ArrowLeft, Video, Send, Zap, Star, Sparkles, MessageCircle, Crown, Search, Bell, LogOut, User, CreditCard, Users, Settings, Heart, Image as ImageIcon, Link as LinkIcon, Lock } from "lucide-react";

/**
 * Bar Lounge Room — Fan View Preview
 * ----------------------------------
 * Purpose: A chill, music-focused room where billing is time-based (per minute)
 * but ONLY starts after the fan interacts (send message, buy drink, spin bottle).
 *
 * Concepts:
 * - "Impulse" buy drinks (visual effect)
 * - Spin the bottle (rng perks)
 * - VIP Booth (upgrade)
 */

// ---- Shared Logic/Components -----------------------------------------------

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-violet-500/25 bg-black",
                "shadow-[0_0_22px_rgba(167,139,250,0.14),0_0_52px_rgba(139,92,246,0.08)]",
                "hover:shadow-[0_0_34px_rgba(167,139,250,0.20),0_0_78px_rgba(139,92,246,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

// Tone helper
const toneClasses = (tone: "pink" | "purple" | "blue" | "green" | "yellow" | "red") => {
    const map = {
        pink: {
            border: "border-pink-500/30",
            text: "text-pink-200",
            glow: "shadow-[0_0_15px_rgba(236,72,153,0.15)]",
        },
        purple: {
            border: "border-purple-500/30",
            text: "text-purple-200",
            glow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
        },
        blue: {
            border: "border-cyan-400/30",
            text: "text-cyan-200",
            glow: "shadow-[0_0_15px_rgba(34,211,238,0.15)]",
        },
        green: {
            border: "border-emerald-400/30",
            text: "text-emerald-200",
            glow: "shadow-[0_0_15px_rgba(52,211,153,0.15)]",
        },
        yellow: {
            border: "border-yellow-400/30",
            text: "text-yellow-200",
            glow: "shadow-[0_0_15px_rgba(250,204,21,0.15)]",
        },
        red: {
            border: "border-red-500/30",
            text: "text-red-200",
            glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]",
        },
    };
    return map[tone] || map.pink;
};

// ---- Bar Lounge Room (Preview) ------------------------------------------

export default function BarLoungeRoomPreview() {
    const onBack = () => window.history.back();

    const ENTRY_FEE = 10;
    const ENTRY_FEE = 10;


    // Billing model: NO charge until the fan interacts (send message / react / buy drink / VIP / spin)
    const [billingActive, setBillingActive] = useState(false);
    const [chat, setChat] = useState("");

    // We intentionally do NOT display “total spent” to avoid anchoring/limiting spend.
    // Still used internally for effects + preview behaviors.
    const [spentHidden, setSpentHidden] = useState(32);

    const activateBilling = () => {
        if (!billingActive) {
            setBillingActive(true);
        }
    };

    // --- Effects (champagne / VIP bottle) ---------------------------------
    type FX = { id: string; kind: "confetti" | "spotlight"; createdAt: number };
    const [fx, setFx] = useState<FX[]>([]);
    const [toast, setToast] = useState<string | null>(null);

    const pushFx = (kinds: Array<FX["kind"]>, toastMsg?: string) => {
        const now = Date.now();
        const items: FX[] = kinds.map((k) => ({ id: `${k}_${now}_${Math.random().toString(16).slice(2)}`, kind: k, createdAt: now }));
        setFx((rows) => [...rows, ...items]);
        if (toastMsg) setToast(toastMsg);

        // Auto-clear
        window.setTimeout(() => {
            setFx((rows) => rows.filter((x) => now - x.createdAt < 1800));
            setToast((t) => (t === toastMsg ? null : t));
        }, 1600);
    };

    const playPop = () => {
        // “Sound cue” via WebAudio (safe: only on user gesture + guarded).
        try {
            if (typeof window === "undefined") return;
            const AC = (window.AudioContext || (window as any).webkitAudioContext) as any;
            if (!AC) return;
            const ctx = new AC();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "triangle";
            o.frequency.setValueAtTime(520, ctx.currentTime);
            o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.11);
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
            o.connect(g);
            g.connect(ctx.destination);
            o.start();
            o.stop(ctx.currentTime + 0.15);
            window.setTimeout(() => ctx.close?.(), 240);
        } catch {
            // ignore
        }
    };

    const onChampagneEffect = (tier: "champagne" | "vipbottle") => {
        // Champagne: confetti + spotlight + sound cue.
        playPop();
        if (tier === "champagne") pushFx(["confetti", "spotlight"], "🍾 Champagne popped");
        if (tier === "vipbottle") pushFx(["confetti", "spotlight"], "👑 VIP bottle served");
    };

    type DrinkTone = "pink" | "purple" | "blue" | "green" | "yellow" | "red";
    type Drink = {
        id: string;
        name: string;
        price: number;
        icon: React.ReactNode;
        tone: DrinkTone;
        onSpecial?: () => void;
    };

    const drinks: Drink[] = [
        {
            id: "d1",
            name: "Whiskey Shot",
            price: 8,
            icon: "🥃",
            tone: "red",
        },
        {
            id: "d2",
            name: "Neon Martini",
            price: 25,
            icon: "🍸",
            tone: "pink",
        },
        {
            id: "d3",
            name: "Blue Lagoon",
            price: 25,
            icon: "🧊",
            tone: "blue",
        },
        {
            id: "d4",
            name: "Champagne Bottle",
            price: 100,
            icon: "🍾",
            tone: "yellow",
            onSpecial: () => onChampagneEffect("champagne"),
        },
        {
            id: "d5",
            name: "VIP Bottle",
            price: 250,
            icon: "👑",
            tone: "purple",
            onSpecial: () => onChampagneEffect("vipbottle"),
        },
    ];

    const reactions = [
        { id: "r1", label: "🍻 Cheers", price: 2 },
        { id: "r2", label: "🔥 Heat", price: 5 },
        { id: "r3", label: "💎 Ice", price: 10 },
        { id: "r4", label: "💖 Heart", price: 15 },
    ];

    // --- Spin the Bottle (pay upfront per spin) ----------------------------
    type SpinOutcome = {
        id: string;
        label: string;
        odds: number; // percent
        note: string;
    };

    const SPIN_PRICE = 25;
    const spinOutcomes: SpinOutcome[] = [
        { id: "o1", label: "Pinned Message (1 min)", odds: 30, note: "Your next message pins above chat." },
        { id: "o2", label: "Priority Cam (2 min)", odds: 20, note: "Your badge glows; creator sees you first." },
        { id: "o3", label: "VIP Booth Discount $50", odds: 12, note: "Applies to VIP Booth unlock." },

        { id: "o5", label: "Creator Dares You", odds: 10, note: "Unlocks a spicy prompt." },
        { id: "o6", label: "Try Again", odds: 10, note: "No perk, but you get a hype shoutout." },
    ];

    const spinOddsTotal = spinOutcomes.reduce((s, x) => s + x.odds, 0);
    const [spinning, setSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState<SpinOutcome | null>(null);

    const pickOutcome = () => {
        // Weighted random by odds.
        let r = Math.random() * spinOddsTotal;
        for (const o of spinOutcomes) {
            r -= o.odds;
            if (r <= 0) return o;
        }
        return spinOutcomes[spinOutcomes.length - 1];
    };

    const doSpin = () => {
        if (spinning) return;
        activateBilling();
        setSpentHidden((s) => s + SPIN_PRICE);

        const out = pickOutcome();
        setSpinResult(null);
        setSpinning(true);
        window.setTimeout(() => {
            setSpinning(false);
            setSpinResult(out);
            // Subtle celebration for certain outcomes
            if (out.id === "o2" || out.id === "o1") pushFx(["spotlight"], `🎰 ${out.label}`);
            if (out.id === "o5") pushFx(["confetti"], `🎰 ${out.label}`);
        }, 1100);
    };

    return (
        <div className="min-h-screen bg-black text-white">
            <style>{`
        @keyframes blBottleSpin {
          0% { transform: rotate(0deg) scale(1); }
          60% { transform: rotate(720deg) scale(1.04); }
          100% { transform: rotate(1080deg) scale(1); }
        }
        @keyframes blSpotlight {
          0% { opacity: 0; }
          10% { opacity: 1; }
          70% { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes blConfettiFall {
          0% { transform: translateY(-10px) rotate(0deg); }
          100% { transform: translateY(110vh) rotate(540deg); }
        }
        .bl-bottle {
          font-size: 68px;
          line-height: 1;
          filter: saturate(1.8) contrast(1.15);
          text-shadow: 0 0 18px rgba(170,80,255,0.55), 0 0 42px rgba(255,0,200,0.25);
          transform: translateZ(0);
        }
        .bl-bottle-spin { animation: blBottleSpin 1.1s cubic-bezier(.18,.9,.2,1) both; }

        .bl-spotlight {
          background: radial-gradient(circle at 50% 40%, rgba(255,215,0,0.24), transparent 55%),
                      radial-gradient(circle at 60% 52%, rgba(255,0,200,0.18), transparent 62%),
                      radial-gradient(circle at 42% 48%, rgba(0,230,255,0.14), transparent 60%);
          animation: blSpotlight 1.6s ease-out both;
          mix-blend-mode: screen;
        }

        .bl-confetti {
          position: absolute;
          width: 10px;
          height: 12px;
          border-radius: 3px;
          background: rgba(255,0,200,0.9);
          box-shadow: 0 0 14px rgba(255,0,200,0.55);
          animation-name: blConfettiFall;
          animation-timing-function: ease-in;
          animation-fill-mode: both;
        }
        
        .vip-glow {
          box-shadow:
            0 0 16px rgba(255, 215, 0, 0.55),
            0 0 44px rgba(255, 215, 0, 0.28),
            0 0 22px rgba(255, 0, 200, 0.20);
        }
      `}</style>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Effects overlay */}
                {fx.length > 0 && (
                    <div className="fixed inset-0 pointer-events-none z-[60]">
                        {fx.some((x) => x.kind === "spotlight") && <div className="absolute inset-0 bl-spotlight" />}
                        {fx.some((x) => x.kind === "confetti") && (
                            <div className="absolute inset-0 overflow-hidden">
                                {Array.from({ length: 42 }).map((_, i) => (
                                    <span
                                        key={i}
                                        className="bl-confetti"
                                        style={{
                                            left: `${Math.random() * 100}%`,
                                            top: `-12px`,
                                            animationDelay: `${Math.random() * 0.35}s`,
                                            animationDuration: `${1.1 + Math.random() * 0.6}s`,
                                            opacity: 0.9,
                                            transform: `translateY(0) rotate(${Math.random() * 360}deg)`,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                        {toast && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 rounded-2xl border border-white/10 bg-black/70 px-4 py-2 text-sm text-gray-100 shadow-[0_0_40px_rgba(255,0,200,0.25)]">
                                {toast}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <div>
                            <div className="text-violet-200 text-sm">Bar Lounge — Fan View (Preview)</div>
                            <div className="text-[11px] text-gray-400">Entry + per-minute billing starts only after interaction</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={cx(
                            "rounded-2xl border px-3 py-2",
                            billingActive ? "border-emerald-300/25 bg-emerald-500/10" : "border-white/10 bg-black/30"
                        )}>
                            <div className="text-[10px] text-gray-400">Billing status</div>
                            <div className={cx("text-sm font-semibold", billingActive ? "text-emerald-100" : "text-gray-200")}>{billingActive ? "Active" : "Not started"}</div>
                        </div>

                        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 vip-glow">
                            <div className="text-[10px] text-yellow-200">Pricing</div>
                            <div className="text-sm text-yellow-100 font-semibold">Entry ${ENTRY_FEE}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <NeonCard className="lg:col-span-8 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="text-violet-200 text-sm">Live Lounge</div>
                                <span className="text-[10px] px-2 py-[2px] rounded-full border border-violet-300/35 text-violet-200 bg-black/40">Music • Vibes</span>
                            </div>
                        </div>

                        <div className="rounded-2xl overflow-hidden border border-violet-300/15 bg-black/40">
                            <div className="relative aspect-video bg-[radial-gradient(circle_at_25%_20%,rgba(170,80,255,0.18),transparent_55%),radial-gradient(circle_at_70%_35%,rgba(0,230,255,0.14),transparent_55%),radial-gradient(circle_at_45%_90%,rgba(255,0,200,0.10),transparent_60%)] flex items-center justify-center">
                                <div className="flex items-center gap-2 text-cyan-200">
                                    <Video className="w-5 h-5" />
                                    <span className="text-sm">DJ/Creator stream (preview)</span>
                                </div>
                                <div className="absolute bottom-3 left-3 text-xs text-gray-200 bg-black/45 border border-white/10 rounded-full px-3 py-1">
                                    @PinkVibe • Star
                                </div>
                                <div className="absolute bottom-3 right-3 text-xs text-yellow-200 bg-black/45 border border-yellow-400/30 rounded-full px-3 py-1 vip-glow">
                                    {billingActive ? `Active` : "Interact to start billing"}
                                </div>
                            </div>
                        </div>



                        {/* DRINKS (first) */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <div className="text-violet-200 text-sm">Buy Drinks</div>
                                <div className="text-[10px] text-gray-400">Icons + neon glow (impulse)</div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {drinks.map((d) => {
                                    const t = toneClasses(d.tone === "yellow" ? "yellow" : d.tone === "green" ? "green" : d.tone === "blue" ? "blue" : d.tone === "red" ? "red" : d.tone === "purple" ? "purple" : "pink");
                                    return (
                                        <div
                                            key={d.id}
                                            className={cx(
                                                "rounded-2xl border bg-black/35 p-3",
                                                t.border,
                                                t.glow
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className={cx("text-sm font-semibold flex items-center gap-2", t.text)}>
                                                        <span className="text-lg" aria-hidden="true">{d.icon}</span>
                                                        <span className="truncate">{d.name}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">${d.price}</div>
                                                    {(d.price === 100 || d.price === 250) && (
                                                        <div className="mt-2 text-[10px] text-gray-300">Includes: confetti • spotlight • sound cue</div>
                                                    )}
                                                </div>
                                                <button
                                                    className={cx(
                                                        "shrink-0 rounded-xl border px-3 py-2 text-sm",
                                                        t.border,
                                                        "bg-black/40 hover:bg-white/5"
                                                    )}
                                                    onClick={() => {
                                                        activateBilling();
                                                        setSpentHidden((s) => s + d.price);
                                                        d.onSpecial?.();
                                                    }}
                                                >
                                                    Buy
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* VIP BOOTH (second) */}
                        <div className="mt-5 rounded-2xl border border-yellow-400/40 bg-yellow-500/10 p-4 vip-glow">
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-yellow-200 text-sm">VIP Booth</div>
                                <span className="text-[10px] text-yellow-200">Upgrade</span>
                            </div>
                            <div className="text-[11px] text-gray-200 mb-3">Pinned message · Priority cam · Badge</div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    className="rounded-xl border border-yellow-400/40 bg-yellow-500/20 py-2 text-sm hover:bg-yellow-500/30"
                                    onClick={() => {
                                        activateBilling();
                                        setSpentHidden((s) => s + 150);
                                        pushFx(["spotlight"], "👑 VIP Booth unlocked");
                                    }}
                                >
                                    VIP Booth $150
                                </button>
                                <button
                                    className="rounded-xl border border-yellow-400/60 bg-yellow-600/30 py-2 text-sm hover:bg-yellow-600/40"
                                    onClick={() => {
                                        activateBilling();
                                        setSpentHidden((s) => s + 400);
                                        pushFx(["confetti", "spotlight"], "👑 Ultra VIP unlocked");
                                        playPop();
                                    }}
                                >
                                    Ultra VIP $400
                                </button>
                            </div>
                        </div>

                        {/* Spin the Bottle (third) */}
                        <div className="mt-5 rounded-2xl border border-violet-300/30 bg-black/45 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-violet-200 text-sm">Spin the Bottle</div>
                                <span className="text-[10px] text-gray-400">Pay upfront • ${SPIN_PRICE}/spin</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                                <div className="md:col-span-5">
                                    <div className="rounded-2xl border border-violet-300/20 bg-black/30 p-4 flex items-center justify-center min-h-[170px]">
                                        <div className={cx("bl-bottle", spinning && "bl-bottle-spin")}>🍾</div>
                                    </div>
                                    <button
                                        className={cx(
                                            "mt-3 w-full rounded-xl border border-violet-300/40 bg-violet-600/30 py-3 text-sm hover:bg-violet-600/40",
                                            spinning && "opacity-80 cursor-not-allowed"
                                        )}
                                        onClick={doSpin}
                                        disabled={spinning}
                                    >
                                        {spinning ? "Spinning…" : `Spin Bottle — $${SPIN_PRICE}`}
                                    </button>
                                    {spinResult && (
                                        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                                            <div className="text-sm text-gray-100 font-semibold">Result: {spinResult.label}</div>
                                            <div className="mt-1 text-[11px] text-gray-300">{spinResult.note}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-7">
                                    <div className="text-[11px] text-gray-400">Odds (preview)</div>
                                    <div className="mt-2 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                                        <div className="divide-y divide-white/10">
                                            {spinOutcomes.map((o) => (
                                                <div key={o.id} className="px-3 py-2 flex items-center justify-between">
                                                    <div className="text-sm text-gray-100">{o.label}</div>
                                                    <div className="text-[11px] text-gray-300">{o.odds}%</div>
                                                </div>
                                            ))}
                                            <div className="px-3 py-2 flex items-center justify-between bg-black/35">
                                                <div className="text-[11px] text-gray-400">Total</div>
                                                <div className={cx("text-[11px]", spinOddsTotal === 100 ? "text-emerald-200" : "text-rose-200")}>{spinOddsTotal}%</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-400">Odds are illustrative; production should be server-authoritative.</div>
                                </div>
                            </div>
                        </div>

                        {/* Reactions */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <div className="text-violet-200 text-sm">Reactions</div>
                                <div className="text-[10px] text-gray-400">Fast-click spend</div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {reactions.map((r) => (
                                    <button
                                        key={r.id}
                                        className="rounded-xl border border-violet-300/25 bg-black/40 py-2 text-sm hover:bg-white/5 shadow-[0_0_18px_rgba(170,80,255,0.18)]"
                                        onClick={() => {
                                            activateBilling();
                                            setSpentHidden((s) => s + r.price);
                                        }}
                                    >
                                        {r.label} <span className="text-gray-300">${r.price}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </NeonCard>

                    <div className="lg:col-span-4 space-y-6">
                        <NeonCard className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-violet-200 text-sm">Lounge Chat</div>
                                <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">Room</span>
                            </div>

                            {/* Extended chat (double-size) */}
                            <div className="rounded-2xl border border-white/10 bg-black/30 p-3 h-[420px] overflow-auto">
                                {[
                                    "Welcome to Bar Lounge. Buy a drink to get noticed.",
                                    "Who’s live tonight?",
                                    "VIP bottles get priority attention.",
                                    "Spin the bottle for perks.",
                                ].map((m, idx) => (
                                    <div key={idx} className="text-sm text-gray-200 mb-2">
                                        <span className="text-violet-200">@fan{idx + 1}</span>: {m}
                                    </div>
                                ))}
                                <div className="text-sm text-gray-200 mb-2">
                                    <span className="text-fuchsia-300">@PinkVibe</span>: Keep the drinks coming.
                                </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                                <input
                                    value={chat}
                                    onChange={(e) => setChat(e.target.value)}
                                    className="flex-1 rounded-xl border border-violet-300/20 bg-black/40 px-3 py-2 text-sm outline-none"
                                    placeholder="Type message…"
                                />
                                <button
                                    className="rounded-xl border border-violet-300/30 bg-violet-600 px-3 py-2 text-sm hover:bg-violet-700 inline-flex items-center gap-2"
                                    onClick={() => {
                                        if (chat.trim()) activateBilling();
                                        setChat("");
                                    }}
                                >
                                    <Send className="w-4 h-4" /> Send
                                </button>
                            </div>

                            <div className="mt-4 rounded-2xl border border-violet-300/15 bg-black/35 p-3">
                                <div className="mt-1 text-sm text-gray-100">
                                    Entry: <span className="text-violet-200">${ENTRY_FEE}</span>
                                </div>
                                <div className="mt-2 text-[11px] text-gray-300">Charges start only after your first interaction.</div>
                                <div className="mt-1 text-[11px] text-gray-300">Drinks, spin, reactions, and VIP are separate add-ons.</div>
                            </div>
                        </NeonCard>
                    </div>
                </div>
            </div >
        </div >
    );
}
