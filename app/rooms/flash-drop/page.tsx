"use client";

import React, { useState } from "react";
import { ArrowLeft, Video, Send, Zap, Star, Sparkles, MessageCircle, Crown, Search, Bell, LogOut, User, CreditCard, Users, Settings, Heart, Image as ImageIcon, Link as LinkIcon, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute } from "@/app/context/AuthContext";

/**
 * Flash Drops Room — Fan View Preview
 * -----------------------------------
 * Purpose: Time-limited content drops with aggressive high-value purchase lanes.
 */

// ---- Shared Logic/Components -----------------------------------------------

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-blue-500/25 bg-black",
                "shadow-[0_0_22px_rgba(59,130,246,0.14),0_0_52px_rgba(37,99,235,0.08)]",
                "hover:shadow-[0_0_34px_rgba(59,130,246,0.20),0_0_78px_rgba(37,99,235,0.12)] transition-shadow",
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

// ---- Flash Drops Room (Fan) ----------------------------------------------

export default function FlashDropsRoomPreview() {
    const router = useRouter();
    const onBack = () => router.push("/home");

    // NOTE: Preview-only. No real payments.
    // Designed to show many high-value options for "whale" spend.

    type DropKind = "Photo Set" | "Video" | "Live Replay" | "DM Pack" | "Vault";
    type Drop = {
        id: string;
        title: string;
        kind: DropKind;
        price: number;
        rarity: "Common" | "Rare" | "Epic" | "Legendary";
        endsInMin: number;
    };

    const creator = { handle: "@NovaHeat", level: "Star" as const };

    const [walletSpent, setWalletSpent] = useState(420);
    const [selected, setSelected] = useState<string | null>("d3");
    const [bid, setBid] = useState(500);
    const [bidRaw, setBidRaw] = useState("500");
    const [toast, setToast] = useState<string | null>(null);
    const [autoSnipe, setAutoSnipe] = useState(false);
    const [customSpend, setCustomSpend] = useState(2500);
    const [customRaw, setCustomRaw] = useState("2500");

    const normalizeMoney = (raw: string, fallback: number) => {
        const n = Number(String(raw).replace(/[^0-9.]/g, ""));
        if (!Number.isFinite(n) || n <= 0) return fallback;
        return Math.floor(n);
    };

    const drops: Drop[] = [
        { id: "d1", title: "After Hours — Tease Set", kind: "Photo Set", price: 25, rarity: "Common", endsInMin: 28 },
        { id: "d2", title: "Neon Confetti — Clip", kind: "Video", price: 60, rarity: "Rare", endsInMin: 22 },
        { id: "d3", title: "VIP Backstage — Full Reel", kind: "Live Replay", price: 250, rarity: "Epic", endsInMin: 15 },
        { id: "d4", title: "Private DMs — 10 Pack", kind: "DM Pack", price: 400, rarity: "Epic", endsInMin: 12 },
        { id: "d5", title: "Vault Drop — Uncut", kind: "Vault", price: 1000, rarity: "Legendary", endsInMin: 7 },
    ];

    const whalePacks = [
        { id: "p1", label: "Boost My Rank", price: 150 },
        { id: "p2", label: "Priority Unlock Pass", price: 300 },
        { id: "p3", label: "Golden Key (Vault Access)", price: 750 },
        { id: "p4", label: "Diamond Patron", price: 1500 },
        { id: "p5", label: "Private Drop Sponsor", price: 2500 },
        { id: "p6", label: "Legend Crown (Room-wide)", price: 250 },
    ];

    const micro = [
        { id: "m1", label: "⚡ Quick Like", price: 5 },
        { id: "m2", label: "🔥 Hype", price: 10 },
        { id: "m3", label: "💎 Boost", price: 25 },
        { id: "m4", label: "👑 Flex", price: 50 },
    ];

    const bundles = [
        { id: "b1", title: "Weekend Bundle", note: "3 drops + 1 DM", price: 500 },
        { id: "b2", title: "Backstage Bundle", note: "5 drops + Vault preview", price: 1000 },
        { id: "b3", title: "Whale Bundle", note: "All drops today + priority", price: 2500 },
        { id: "b4", title: "Sponsor Bundle", note: "All drops + sponsor placement", price: 2500 },
    ];

    const selectedDrop = drops.find((d) => d.id === selected) ?? drops[0];

    const spend = (amount: number, msg: string) => {
        setWalletSpent((s) => s + amount);
        setToast(msg);
        window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1400);
    };

    const QUICK_AMTS = [10, 25, 50, 60, 100, 150, 250, 400, 500, 750, 1000, 1500, 2000, 2500];
    const MEGA_AMTS = [250, 500, 1000, 1500, 2500];
    const SUPER_AMTS = [1500, 2000, 2500];

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen bg-black text-white">
                <style>{`
            .vip-glow {
              box-shadow:
                0 0 16px rgba(255, 215, 0, 0.55),
                0 0 44px rgba(255, 215, 0, 0.28),
                0 0 22px rgba(255, 0, 200, 0.20);
            }
          `}</style>

                <div className="max-w-7xl mx-auto px-6 py-6">
                    {toast && (
                        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border border-white/10 bg-black/75 px-4 py-2 text-sm text-gray-100 shadow-[0_0_40px_rgba(0,230,255,0.20)]">
                            {toast}
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="rounded-xl border border-blue-500/25 bg-black/40 px-3 py-2 text-sm text-blue-200 hover:bg-white/5 inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <div>
                                <div className="text-cyan-200 text-sm">Flash Drops — Fan View (Preview)</div>
                                <div className="text-[11px] text-gray-400">Time-limited content + aggressive high-value purchase lanes</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-blue-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400">Creator</div>
                                <div className="text-sm text-gray-100 font-semibold">
                                    {creator.handle} <span className="text-[11px] text-blue-200">• {creator.level}</span>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2">
                                <div className="text-[10px] text-gray-400">Wallet (preview)</div>
                                <div className="text-sm text-emerald-100 font-semibold">Spent: ${walletSpent}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <NeonCard className="lg:col-span-8 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-cyan-200 text-sm">Live Drop Board</div>
                                    <span className="text-[10px] px-2 py-[2px] rounded-full border border-blue-500/25 text-blue-200 bg-black/40">Limited Time</span>
                                    <span className="text-[10px] px-2 py-[2px] rounded-full border border-yellow-400/30 text-yellow-200 bg-black/40 vip-glow">Whale Friendly</span>
                                </div>
                                <button
                                    className="rounded-xl border border-blue-500/25 bg-black/40 px-3 py-2 text-sm hover:bg-white/5"
                                    onClick={() => spend(0, "🔄 Refreshed drops")}
                                >
                                    Refresh
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {drops.map((d) => {
                                    const rarityTone = d.rarity === "Legendary" ? "yellow" : d.rarity === "Epic" ? "purple" : d.rarity === "Rare" ? "blue" : "pink";
                                    const t = toneClasses(rarityTone);
                                    const active = selected === d.id;
                                    return (
                                        <button
                                            key={d.id}
                                            onClick={() => setSelected(d.id)}
                                            className={cx("text-left rounded-2xl border bg-black/35 p-3 transition", t.border, t.glow, active && "ring-1 ring-cyan-200/30")}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className={cx("text-sm font-semibold", t.text)}>{d.title}</div>
                                                    <div className="mt-1 text-xs text-gray-300">
                                                        {d.kind} • <span className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", t.border, t.text)}>{d.rarity}</span>
                                                    </div>
                                                    <div className="mt-2 text-[11px] text-gray-400">Ends in {d.endsInMin}m</div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <div className="text-sm text-yellow-200 font-semibold">${d.price}</div>
                                                    <div className="mt-2 text-[10px] text-gray-400">Tap to focus</div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-5 rounded-2xl border border-blue-500/20 bg-black/35 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-cyan-200 text-sm">Focused Drop</div>
                                        <div className="mt-1 text-lg text-gray-100 font-semibold">{selectedDrop.title}</div>
                                        <div className="mt-2 text-sm text-gray-300">
                                            Type: <span className="text-gray-100">{selectedDrop.kind}</span> • Rarity: <span className="text-gray-100">{selectedDrop.rarity}</span>
                                        </div>
                                        <div className="mt-2 text-[11px] text-gray-400">Countdown: {selectedDrop.endsInMin} minutes</div>
                                        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[11px] text-gray-400">Auto-Snipe (preview)</div>
                                                <label className="text-[11px] text-gray-200 inline-flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={autoSnipe}
                                                        onChange={(e) => {
                                                            const v = e.target.checked;
                                                            setAutoSnipe(v);
                                                            if (v) spend(1500, "🧲 Auto-Snipe armed — $1500");
                                                            else spend(0, "Auto-Snipe disabled");
                                                        }}
                                                    />
                                                    Enabled
                                                </label>
                                            </div>
                                            <div className="mt-1 text-[10px] text-gray-400">Guarantee priority capture on the next limited drop (escrow in production).</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[11px] text-gray-400">Price</div>
                                        <div className="text-2xl text-yellow-200 font-semibold">${selectedDrop.price}</div>
                                        <button
                                            className="mt-2 w-44 rounded-xl border border-blue-500/30 bg-blue-600/30 py-2 text-sm hover:bg-blue-600/40"
                                            onClick={() => spend(selectedDrop.price, `✅ Unlocked: ${selectedDrop.title}`)}
                                        >
                                            Unlock Now
                                        </button>
                                        <button
                                            className="mt-2 w-44 rounded-xl border border-yellow-400/40 bg-yellow-600/20 py-2 text-sm hover:bg-yellow-600/30 vip-glow"
                                            onClick={() => spend(selectedDrop.price * 2, `⚡ Instant + Gift unlock (${selectedDrop.title})`)}
                                        >
                                            Unlock + Gift (2×)
                                        </button>
                                        <button
                                            className="mt-2 w-44 rounded-xl border border-violet-300/30 bg-violet-600/20 py-2 text-sm hover:bg-violet-600/30"
                                            onClick={() => spend(500, "📌 Pinned placement — $500")}
                                        >
                                            Pin Me $500
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
                                    {QUICK_AMTS.map((amt) => (
                                        <button
                                            key={amt}
                                            className="rounded-xl border border-blue-500/20 bg-black/40 py-2 text-sm hover:bg-white/5"
                                            onClick={() => spend(amt, `💳 Quick-buy $${amt}`)}
                                        >
                                            Quick $<span className="text-gray-200">{amt}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 rounded-2xl border border-violet-300/25 bg-black/35 p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-violet-200 text-sm">Mega Spend Buttons</div>
                                        <span className="text-[10px] text-gray-400">One-tap whale lane</span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {MEGA_AMTS.map((amt) => (
                                            <button
                                                key={amt}
                                                className="rounded-xl border border-violet-300/25 bg-black/40 py-3 text-sm hover:bg-white/5 shadow-[0_0_18px_rgba(170,80,255,0.18)]"
                                                onClick={() => spend(amt, `💎 Mega spend — $${amt}`)}
                                            >
                                                Drop ${amt.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3 vip-glow">
                                        <div className="flex items-center justify-between">
                                            <div className="text-yellow-200 text-sm">Super Mega</div>
                                            <span className="text-[10px] text-gray-400">Step-up auth in prod</span>
                                        </div>
                                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {SUPER_AMTS.map((amt) => (
                                                <button
                                                    key={amt}
                                                    className="rounded-xl border border-yellow-400/35 bg-black/40 py-3 text-sm hover:bg-white/5 vip-glow"
                                                    onClick={() => spend(amt, `👑 Super Mega — $${amt.toLocaleString()}`)}
                                                >
                                                    Crown ${amt.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-2 text-[10px] text-gray-500">
                                            Production note: velocity checks, risk scoring, step-up auth, and reversibility constraints for large spends.
                                        </div>
                                    </div>

                                    <div className="mt-3 rounded-2xl border border-blue-500/25 bg-black/35 p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-cyan-200 text-sm">Custom Amount</div>
                                            <span className="text-[10px] text-gray-400">One-tap or type</span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={customRaw}
                                                onChange={(e) => setCustomRaw(e.target.value)}
                                                onBlur={() => {
                                                    const n = normalizeMoney(customRaw, customSpend);
                                                    setCustomSpend(n);
                                                    setCustomRaw(String(n));
                                                }}
                                                inputMode="numeric"
                                                className="flex-1 rounded-xl border border-blue-500/20 bg-black/40 px-3 py-2 text-sm outline-none"
                                                placeholder="Enter any amount"
                                            />
                                            <button
                                                className="rounded-xl border border-blue-500/30 bg-blue-600/30 px-4 py-2 text-sm hover:bg-blue-600/40"
                                                onClick={() => {
                                                    const n = normalizeMoney(customRaw, customSpend);
                                                    setCustomSpend(n);
                                                    setCustomRaw(String(n));
                                                    spend(n, `💳 Custom spend — $${n.toLocaleString()}`);
                                                }}
                                            >
                                                Drop
                                            </button>
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            {[250, 500, 1000, 1500, 2000, 2500].map((x) => (
                                                <button
                                                    key={x}
                                                    className="rounded-xl border border-white/10 bg-black/30 py-2 text-sm hover:bg-white/5"
                                                    onClick={() => setCustomSpend(x)}
                                                >
                                                    ${x.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 text-[10px] text-gray-400">Preview note: Unlocks should be server-authoritative and idempotent.</div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4 vip-glow">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-yellow-200 text-sm">Bundles</div>
                                    <span className="text-[10px] text-gray-200">Higher AOV</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    {bundles.map((b) => (
                                        <div key={b.id} className="rounded-2xl border border-yellow-400/25 bg-black/35 p-3">
                                            <div className="text-sm text-gray-100 font-semibold">{b.title}</div>
                                            <div className="mt-1 text-[11px] text-gray-300">{b.note}</div>
                                            <button
                                                className="mt-3 w-full rounded-xl border border-yellow-400/40 bg-yellow-600/20 py-2 text-sm hover:bg-yellow-600/30"
                                                onClick={() => spend(b.price, `📦 Bundle purchased: ${b.title}`)}
                                            >
                                                Buy • ${b.price}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-violet-300/30 bg-black/45 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-violet-200 text-sm">Live Auction (Preview)</div>
                                    <span className="text-[10px] text-gray-400">Exclusive access</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                                    <div className="md:col-span-7 rounded-2xl border border-white/10 bg-black/30 p-3">
                                        <div className="text-sm text-gray-100 font-semibold">"One-of-One" Vault Unlock</div>
                                        <div className="mt-1 text-[11px] text-gray-300">Winner gets: private replay + custom DM + name on leaderboard.</div>
                                        <div className="mt-3 text-[11px] text-gray-400">Current bid (preview): <span className="text-yellow-200 font-semibold">$1,500</span></div>
                                        <div className="mt-2 text-[10px] text-gray-500">Illustrative only; production must be anti-fraud hardened.</div>
                                    </div>

                                    <div className="md:col-span-5 rounded-2xl border border-violet-300/20 bg-black/30 p-3">
                                        <div className="text-[11px] text-gray-400 mb-2">Place bid</div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={bidRaw}
                                                onChange={(e) => setBidRaw(e.target.value)}
                                                onBlur={() => {
                                                    const n = normalizeMoney(bidRaw, bid);
                                                    setBid(n);
                                                    setBidRaw(String(n));
                                                }}
                                                inputMode="numeric"
                                                className="flex-1 rounded-xl border border-violet-300/20 bg-black/40 px-3 py-2 text-sm outline-none"
                                                placeholder="Enter any amount"
                                            />
                                            <button
                                                className="rounded-xl border border-violet-300/30 bg-violet-600/30 px-4 py-2 text-sm hover:bg-violet-600/40"
                                                onClick={() => {
                                                    const n = normalizeMoney(bidRaw, bid);
                                                    setBid(n);
                                                    setBidRaw(String(n));
                                                    spend(n, `🏁 Bid placed: $${n.toLocaleString()}`);
                                                }}
                                            >
                                                Bid
                                            </button>
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            {[250, 500, 1000, 1500, 2000, 2500].map((x) => (
                                                <button
                                                    key={x}
                                                    className="rounded-xl border border-white/10 bg-black/30 py-2 text-sm hover:bg-white/5"
                                                    onClick={() => {
                                                        setBid(x);
                                                        spend(x, `🏁 Bid quick-set: $${x.toLocaleString()}`);
                                                    }}
                                                >
                                                    ${x}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </NeonCard>

                        <div className="lg:col-span-4 space-y-6">
                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-cyan-200 text-sm">Impulse Spend</div>
                                    <span className="text-[10px] text-gray-400">Fast-click</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {micro.map((m) => (
                                        <button
                                            key={m.id}
                                            className="rounded-xl border border-blue-500/20 bg-black/40 py-2 text-sm hover:bg-white/5"
                                            onClick={() => spend(m.price, `${m.label} • $${m.price}`)}
                                        >
                                            {m.label} <span className="text-gray-300">${m.price}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3 vip-glow">
                                    <div className="text-yellow-200 text-sm">High Roller Packs</div>
                                    <div className="mt-2 space-y-2">
                                        {whalePacks.map((p) => (
                                            <button
                                                key={p.id}
                                                className="w-full rounded-xl border border-yellow-400/30 bg-black/35 px-3 py-2 text-sm hover:bg-white/5 flex items-center justify-between"
                                                onClick={() => spend(p.price, `💎 Purchased: ${p.label}`)}
                                            >
                                                <span className="text-gray-100">{p.label}</span>
                                                <span className="text-yellow-200 font-semibold">${p.price.toLocaleString()}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-[11px] text-gray-400">Subscription (preview)</div>
                                    <div className="mt-1 text-sm text-gray-100">Auto-unlock every Flash Drop.</div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button
                                            className="rounded-xl border border-blue-500/30 bg-blue-600/30 py-2 text-sm hover:bg-blue-600/40"
                                            onClick={() => spend(199, "✅ Subscribed: $199/mo")}
                                        >
                                            $199/mo
                                        </button>
                                        <button
                                            className="rounded-xl border border-yellow-400/40 bg-yellow-600/20 py-2 text-sm hover:bg-yellow-600/30 vip-glow"
                                            onClick={() => spend(499, "✅ Subscribed VIP: $499/mo")}
                                        >
                                            VIP $499/mo
                                        </button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button
                                            className="rounded-xl border border-violet-300/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                            onClick={() => spend(999, "✅ Annual: $999")}
                                        >
                                            Annual $999
                                        </button>
                                        <button
                                            className="rounded-xl border border-violet-300/35 bg-violet-600/20 py-2 text-sm hover:bg-violet-600/30"
                                            onClick={() => spend(2999, "✅ VIP Annual: $2,999")}
                                        >
                                            VIP Annual $2,999
                                        </button>
                                    </div>
                                </div>
                            </NeonCard>

                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-cyan-200 text-sm">Whale Leaderboard</div>
                                    <span className="text-[10px] text-gray-400">Social proof</span>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                    {[
                                        { u: "@BigSpender", v: 125000 },
                                        { u: "@NeonKing", v: 91000 },
                                        { u: "@GoldRush", v: 72000 },
                                        { u: "@VIPVault", v: 60000 },
                                        { u: "@You", v: walletSpent },
                                    ].map((r, i) => (
                                        <div key={r.u} className={cx("flex items-center justify-between py-2", i !== 0 && "border-t border-white/10")}>
                                            <div className="text-sm text-gray-100">{i + 1}. {r.u}</div>
                                            <div className="text-sm text-yellow-200 font-semibold">${r.v.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <button
                                        className="w-full rounded-xl border border-blue-500/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                        onClick={() => spend(250, "🚀 Boosted visibility")}
                                    >
                                        Boost Visibility • $250
                                    </button>
                                    <button
                                        className="w-full rounded-xl border border-violet-300/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                        onClick={() => spend(2500, "🏆 Sponsored placement — $2,500")}
                                    >
                                        Sponsor Slot • $2,500
                                    </button>
                                </div>
                            </NeonCard>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
}
