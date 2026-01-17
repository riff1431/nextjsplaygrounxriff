"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Video,
    Sparkles,
    Crown,
    ShieldCheck,
    Users,
    DollarSign,
    Pin,
    MessageCircle,
    Ban,
    VolumeX,
    Zap,
    ChevronDown,
    Settings,
    Martini,
} from "lucide-react";

/**
 * Bar Lounge — Creator Studio (Preview)
 * ------------------------------------
 * Mirrors the fan room's monetization surfaces:
 * - Drinks (incl Champagne + VIP Bottle)
 * - Reactions
 * - VIP Booth ($150) + Ultra VIP ($400)
 * - Spin the Bottle ($25) outcomes
 *
 * Fan-side billing rule exists in fan view (billing starts after interaction).
 * Creator studio focuses on:
 * - Live revenue feed
 * - Fan prioritization (Priority Cam, pinned message)
 * - Moderation
 * - Room tuning (menu/prices/odds)
 */

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
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

type BadgeTier = "Rookie" | "Rising" | "Star" | "Elite" | "VIP";

type DrinkTone = "pink" | "purple" | "blue" | "green" | "yellow" | "red";
type Drink = {
    id: string;
    name: string;
    price: number;
    icon: string;
    tone: DrinkTone;
    special?: "champagne" | "vipbottle";
};

type Reaction = { id: string; label: string; price: number };

type SpinOutcome = {
    id: string;
    label: string;
    odds: number; // percent
    note: string;
};

type FanRow = {
    id: string;
    handle: string;
    tier: BadgeTier;
    spentTotal: number;
    priorityUntilTs?: number; // if set and in future => priority cam
    vipDiscountCents?: number; // e.g. 5000 = $50 off
    muted?: boolean;
};

type RevenueEvent =
    | { id: string; ts: number; kind: "drink"; fanId: string; label: string; amount: number; meta?: any }
    | { id: string; ts: number; kind: "reaction"; fanId: string; label: string; amount: number }
    | { id: string; ts: number; kind: "vip"; fanId: string; label: string; amount: number }
    | { id: string; ts: number; kind: "spin"; fanId: string; label: string; amount: number; outcome: SpinOutcome };

function tierChip(tier: BadgeTier) {
    const base = "text-[10px] px-2 py-[2px] rounded-full border bg-black/40";
    switch (tier) {
        case "VIP":
            return cx(base, "border-yellow-400/40 text-yellow-200");
        case "Elite":
            return cx(base, "border-fuchsia-400/30 text-fuchsia-200");
        case "Star":
            return cx(base, "border-cyan-300/25 text-cyan-200");
        case "Rising":
            return cx(base, "border-violet-300/25 text-violet-200");
        default:
            return cx(base, "border-white/10 text-gray-200");
    }
}

function toneBorder(t: DrinkTone) {
    switch (t) {
        case "yellow":
            return "border-yellow-400/40";
        case "purple":
            return "border-violet-300/40";
        case "blue":
            return "border-cyan-300/35";
        case "green":
            return "border-emerald-300/35";
        case "red":
            return "border-rose-300/35";
        default:
            return "border-fuchsia-300/35";
    }
}

function money(n: number) {
    return `$${n.toFixed(0)}`;
}

function nowId(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function BarLoungeCreatorStudioPage() {
    const router = useRouter();
    const onBack = () => router.push('/creator/dashboard');

    // --- Canonical pricing surfaces (matches fan view spec) ---
    const SPIN_PRICE = 25;
    const [vipPrice, setVipPrice] = useState(150);
    const [ultraVipPrice, setUltraVipPrice] = useState(400);

    const [drinks, setDrinks] = useState<Drink[]>([
        { id: "d1", name: "Whiskey Shot", price: 8, icon: "🥃", tone: "red" },
        { id: "d2", name: "Neon Martini", price: 25, icon: "🍸", tone: "pink" },
        { id: "d3", name: "Blue Lagoon", price: 25, icon: "🧊", tone: "blue" },
        { id: "d4", name: "Champagne Bottle", price: 100, icon: "🍾", tone: "yellow", special: "champagne" },
        { id: "d5", name: "VIP Bottle", price: 250, icon: "👑", tone: "purple", special: "vipbottle" },
    ]);

    const reactions: Reaction[] = [
        { id: "r1", label: "🍻 Cheers", price: 2 },
        { id: "r2", label: "🔥 Heat", price: 5 },
        { id: "r3", label: "💎 Ice", price: 10 },
        { id: "r4", label: "💖 Heart", price: 15 },
    ];

    const [spinOutcomes, setSpinOutcomes] = useState<SpinOutcome[]>([
        { id: "o1", label: "Pinned Message (1 min)", odds: 30, note: "Fan’s next message pins above chat." },
        { id: "o2", label: "Priority Cam (2 min)", odds: 20, note: "Fan badge glows; creator sees first." },
        { id: "o3", label: "VIP Booth Discount $50", odds: 12, note: "Applies to VIP Booth unlock." },
        { id: "o4", label: "Free +2 Minutes", odds: 18, note: "Adds 2 minutes of free time." },
        { id: "o5", label: "Creator Dares You", odds: 10, note: "Creator can send a dare prompt." },
        { id: "o6", label: "Try Again", odds: 10, note: "No perk, but creator shoutout." },
    ]);

    // --- Creator session / room state ---
    const [isLive, setIsLive] = useState(true);
    const [pinnedMsg, setPinnedMsg] = useState<string>("VIP bottles get priority attention.");
    const [toast, setToast] = useState<string | null>(null);

    // Mock fans in-room
    const [fans, setFans] = useState<FanRow[]>([
        { id: "f1", handle: "@fan1", tier: "Star", spentTotal: 180 },
        { id: "f2", handle: "@fan2", tier: "VIP", spentTotal: 420 },
        { id: "f3", handle: "@fan3", tier: "Rising", spentTotal: 55 },
        { id: "f4", handle: "@fan4", tier: "Elite", spentTotal: 260 },
        { id: "f5", handle: "@fan5", tier: "Rookie", spentTotal: 15 },
    ]);

    // Revenue event feed (append-only)
    const [events, setEvents] = useState<RevenueEvent[]>(() => {
        const ts = Date.now() - 1000 * 60;
        return [
            { id: nowId("e"), ts: ts + 5000, kind: "drink", fanId: "f2", label: "VIP Bottle", amount: 250 },
            { id: nowId("e"), ts: ts + 9000, kind: "reaction", fanId: "f4", label: "💖 Heart", amount: 15 },
            { id: nowId("e"), ts: ts + 12000, kind: "vip", fanId: "f1", label: "VIP Booth", amount: 150 },
        ];
    });

    const feedRef = useRef<HTMLDivElement | null>(null);

    const pushToast = (msg: string) => {
        setToast(msg);
        window.setTimeout(() => setToast(null), 1600);
    };

    const bumpFanSpend = (fanId: string, delta: number) => {
        setFans((rows) => rows.map((f) => (f.id === fanId ? { ...f, spentTotal: f.spentTotal + delta } : f)));
    };

    const addEvent = (evt: RevenueEvent) => {
        setEvents((rows) => [evt, ...rows].slice(0, 50));
        window.setTimeout(() => {
            if (feedRef.current) feedRef.current.scrollTop = 0;
        }, 0);
    };

    const totals = useMemo(() => {
        let total = 0,
            drinks = 0,
            reacts = 0,
            vip = 0,
            spin = 0;

        for (const e of events) {
            total += e.amount;
            if (e.kind === "drink") drinks += e.amount;
            if (e.kind === "reaction") reacts += e.amount;
            if (e.kind === "vip") vip += e.amount;
            if (e.kind === "spin") spin += e.amount;
        }

        const top = [...fans].sort((a, b) => b.spentTotal - a.spentTotal)[0];
        return {
            total,
            drinks,
            reacts,
            vip,
            spin,
            topHandle: top?.handle ?? "—",
            activeFans: fans.length,
        };
    }, [events, fans]);

    const spinOddsTotal = useMemo(() => spinOutcomes.reduce((s, o) => s + o.odds, 0), [spinOutcomes]);

    // Weighted pick (preview only; production should be server-authoritative)
    const pickOutcome = () => {
        const total = spinOutcomes.reduce((s, x) => s + x.odds, 0);
        let r = Math.random() * total;
        for (const o of spinOutcomes) {
            r -= o.odds;
            if (r <= 0) return o;
        }
        return spinOutcomes[spinOutcomes.length - 1];
    };

    // Simulate incoming purchases (preview buttons)
    const simulateDrink = (fanId: string, drinkId: string) => {
        const fan = fans.find((f) => f.id === fanId);
        const d = drinks.find((x) => x.id === drinkId);
        if (!fan || !d) return;

        bumpFanSpend(fanId, d.price);
        addEvent({
            id: nowId("evt"),
            ts: Date.now(),
            kind: "drink",
            fanId,
            label: d.name,
            amount: d.price,
            meta: { special: d.special },
        });

        if (d.special === "champagne") pushToast("🍾 Champagne moment (creator sees spotlight/confetti)");
        if (d.special === "vipbottle") pushToast("👑 VIP bottle served (creator sees spotlight/confetti)");
    };

    const simulateReaction = (fanId: string, reactionId: string) => {
        const fan = fans.find((f) => f.id === fanId);
        const r = reactions.find((x) => x.id === reactionId);
        if (!fan || !r) return;

        bumpFanSpend(fanId, r.price);
        addEvent({ id: nowId("evt"), ts: Date.now(), kind: "reaction", fanId, label: r.label, amount: r.price });
    };

    const simulateVip = (fanId: string, tier: "vip" | "ultra") => {
        const fan = fans.find((f) => f.id === fanId);
        if (!fan) return;

        const base = tier === "vip" ? vipPrice : ultraVipPrice;
        const discount = fans.find((f) => f.id === fanId)?.vipDiscountCents ? (fans.find((f) => f.id === fanId)!.vipDiscountCents! / 100) : 0;
        const charged = Math.max(0, base - discount);

        // clear discount once used
        setFans((rows) =>
            rows.map((f) => (f.id === fanId ? { ...f, vipDiscountCents: 0, spentTotal: f.spentTotal + charged } : f))
        );

        addEvent({
            id: nowId("evt"),
            ts: Date.now(),
            kind: "vip",
            fanId,
            label: tier === "vip" ? "VIP Booth" : "Ultra VIP",
            amount: charged,
        });

        pushToast(tier === "vip" ? "👑 VIP Booth unlocked" : "👑 Ultra VIP unlocked");
    };

    const simulateSpin = (fanId: string) => {
        const fan = fans.find((f) => f.id === fanId);
        if (!fan) return;

        const out = pickOutcome();

        bumpFanSpend(fanId, SPIN_PRICE);
        addEvent({ id: nowId("evt"), ts: Date.now(), kind: "spin", fanId, label: "Spin", amount: SPIN_PRICE, outcome: out });

        // Apply perk side-effects (preview)
        if (out.id === "o1") {
            pushToast("📌 Pin perk granted (1 min) — creator can pin next fan message");
        }
        if (out.id === "o2") {
            const until = Date.now() + 2 * 60 * 1000;
            setFans((rows) => rows.map((f) => (f.id === fanId ? { ...f, priorityUntilTs: until } : f)));
            pushToast("✨ Priority Cam active (2 min)");
        }
        if (out.id === "o3") {
            setFans((rows) => rows.map((f) => (f.id === fanId ? { ...f, vipDiscountCents: 5000 } : f)));
            pushToast("🏷️ VIP Booth Discount $50 applied");
        }
        if (out.id === "o5") {
            pushToast("🎯 Dare unlocked — creator can send a dare to this fan");
        }
    };

    // Moderation actions
    const muteFan = (fanId: string) => setFans((rows) => rows.map((f) => (f.id === fanId ? { ...f, muted: true } : f)));
    const unmuteFan = (fanId: string) => setFans((rows) => rows.map((f) => (f.id === fanId ? { ...f, muted: false } : f)));
    const kickFan = (fanId: string) => setFans((rows) => rows.filter((f) => f.id !== fanId));

    // Creator actions
    const [selectedFanId, setSelectedFanId] = useState<string>("f2");
    const [dareText, setDareText] = useState<string>("Tell me your wildest nightlife confession in 10 seconds.");

    const selectedFan = fans.find((f) => f.id === selectedFanId);

    const livePriority = (f: FanRow) => (f.priorityUntilTs && f.priorityUntilTs > Date.now() ? true : false);

    return (
        <div className="max-w-7xl mx-auto px-6 py-6 min-h-screen bg-black text-white">
            {/* Top toast */}
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] rounded-2xl border border-white/10 bg-black/70 px-4 py-2 text-sm text-gray-100 shadow-[0_0_40px_rgba(255,0,200,0.25)]">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div>
                        <div className="text-violet-200 text-sm">Bar Lounge — Creator Studio (Preview)</div>
                        <div className="text-[11px] text-gray-400">
                            Live controls + revenue feed. (Fan billing begins after interaction in fan view.)
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2">
                        <div className="text-[10px] text-gray-400">Status</div>
                        <button
                            onClick={() => setIsLive((v) => !v)}
                            className={cx(
                                "mt-1 w-full rounded-xl border px-3 py-1 text-sm inline-flex items-center gap-2 justify-center",
                                isLive
                                    ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-100"
                                    : "border-white/10 bg-black/30 text-gray-200"
                            )}
                        >
                            <ShieldCheck className="w-4 h-4" />
                            {isLive ? "Live" : "Offline"}
                        </button>
                    </div>

                    <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-3 py-2">
                        <div className="text-[10px] text-yellow-200">Session revenue</div>
                        <div className="text-sm text-yellow-100 font-semibold">{money(totals.total)}</div>
                    </div>
                </div>
            </div>

            {/* KPI Strip */}
            <NeonCard className="p-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Users className="w-3 h-3" /> Active fans
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{totals.activeFans}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Drinks
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{money(totals.drinks)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Reactions
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{money(totals.reacts)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Crown className="w-3 h-3" /> VIP
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{money(totals.vip)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Spin
                        </div>
                        <div className="text-sm text-gray-100 font-semibold mt-1">{money(totals.spin)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400">Top spender</div>
                        <div className="text-sm text-yellow-200 font-semibold mt-1">{totals.topHandle}</div>
                    </div>
                </div>
            </NeonCard>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Stage */}
                <NeonCard className="lg:col-span-7 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-violet-200 text-sm">Creator Stream Preview</div>
                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-violet-300/25 text-violet-200 bg-black/40">
                            Studio
                        </span>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-violet-300/15 bg-black/40">
                        <div className="relative aspect-video bg-[radial-gradient(circle_at_25%_20%,rgba(170,80,255,0.18),transparent_55%),radial-gradient(circle_at_70%_35%,rgba(0,230,255,0.14),transparent_55%),radial-gradient(circle_at_45%_90%,rgba(255,0,200,0.10),transparent_60%)] flex items-center justify-center">
                            <div className="flex items-center gap-2 text-cyan-200">
                                <Video className="w-5 h-5" />
                                <span className="text-sm">Creator camera (preview)</span>
                            </div>

                            <div className="absolute bottom-3 left-3 text-xs text-gray-200 bg-black/45 border border-white/10 rounded-full px-3 py-1">
                                @PinkVibe • Star
                            </div>

                            <div className="absolute bottom-3 right-3 text-xs text-yellow-200 bg-black/45 border border-yellow-400/30 rounded-full px-3 py-1">
                                Session: {money(totals.total)}
                            </div>
                        </div>
                    </div>

                    {/* Pinned message */}
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[11px] text-gray-400 inline-flex items-center gap-2">
                            <Pin className="w-3 h-3" /> Pinned message (fans see this at top)
                        </div>
                        <div className="mt-2 text-sm text-gray-100">{pinnedMsg}</div>
                    </div>

                    {/* Quick show controls */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                            className="rounded-2xl border border-violet-300/25 bg-black/35 p-3 hover:bg-white/5"
                            onClick={() => pushToast("🔦 Spotlight pulse (preview)")}
                        >
                            <div className="text-sm text-violet-200 inline-flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Spotlight Pulse
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">Boost hype moment</div>
                        </button>

                        <button
                            className="rounded-2xl border border-fuchsia-300/25 bg-black/35 p-3 hover:bg-white/5"
                            onClick={() => pushToast("🎉 Confetti moment (preview)")}
                        >
                            <div className="text-sm text-fuchsia-200 inline-flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Confetti Moment
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">For big purchases</div>
                        </button>

                        <button
                            className="rounded-2xl border border-yellow-400/25 bg-black/35 p-3 hover:bg-white/5"
                            onClick={() => pushToast("🔊 Pop sound cue (preview)")}
                        >
                            <div className="text-sm text-yellow-200 inline-flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Play Pop Cue
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">Champagne / VIP bottle</div>
                        </button>
                    </div>

                    {/* Creator Actions */}
                    <div className="mt-6 rounded-2xl border border-violet-300/20 bg-black/35 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-violet-200 text-sm">Creator Actions</div>
                            <span className="text-[10px] text-gray-400">Pin • Dare • Highlight</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5">
                                <div className="text-[11px] text-gray-400 mb-2">Select fan</div>
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
                                    <select
                                        value={selectedFanId}
                                        onChange={(e) => setSelectedFanId(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                                    >
                                        {fans.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.handle} ({f.tier})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-sm text-gray-100 font-semibold inline-flex items-center gap-2">
                                        {selectedFan?.handle ?? "—"} <span className={tierChip(selectedFan?.tier ?? "Rookie")}>{selectedFan?.tier ?? "—"}</span>
                                    </div>
                                    <div className="mt-1 text-[11px] text-gray-400">
                                        Total spent (creator-visible): <span className="text-yellow-200">{money(selectedFan?.spentTotal ?? 0)}</span>
                                    </div>
                                    {selectedFan && livePriority(selectedFan) && (
                                        <div className="mt-2 text-[11px] text-emerald-200">Priority Cam: ACTIVE</div>
                                    )}
                                    {selectedFan?.vipDiscountCents ? (
                                        <div className="mt-1 text-[11px] text-yellow-200">VIP discount: {money(selectedFan.vipDiscountCents / 100)} pending</div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="md:col-span-7">
                                <div className="text-[11px] text-gray-400 mb-2">Pin message</div>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={pinnedMsg}
                                        onChange={(e) => setPinnedMsg(e.target.value)}
                                        className="flex-1 rounded-xl border border-violet-300/20 bg-black/40 px-3 py-2 text-sm outline-none"
                                        placeholder="Type pinned message…"
                                    />
                                    <button
                                        className="rounded-xl border border-violet-300/30 bg-violet-600 px-3 py-2 text-sm hover:bg-violet-700 inline-flex items-center gap-2"
                                        onClick={() => pushToast("📌 Pinned message updated")}
                                    >
                                        <Pin className="w-4 h-4" /> Set
                                    </button>
                                </div>

                                <div className="mt-4 text-[11px] text-gray-400 mb-2">Send a dare (for “Creator Dares You” outcome)</div>
                                <textarea
                                    value={dareText}
                                    onChange={(e) => setDareText(e.target.value)}
                                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none min-h-[74px]"
                                    placeholder="Write a dare…"
                                />
                                <div className="mt-2 flex gap-2">
                                    <button
                                        className="flex-1 rounded-xl border border-emerald-300/25 bg-emerald-600/20 py-2 text-sm hover:bg-emerald-600/30 inline-flex items-center gap-2 justify-center"
                                        onClick={() => pushToast(`🎯 Dare sent to ${selectedFan?.handle ?? "fan"}`)}
                                    >
                                        <MessageCircle className="w-4 h-4" /> Send Dare
                                    </button>
                                    <button
                                        className="flex-1 rounded-xl border border-fuchsia-300/25 bg-black/40 py-2 text-sm hover:bg-white/5 inline-flex items-center gap-2 justify-center"
                                        onClick={() => pushToast(`✨ Highlighted ${selectedFan?.handle ?? "fan"}`)}
                                    >
                                        <Sparkles className="w-4 h-4" /> Highlight
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </NeonCard>

                {/* Right rail: Feed + Fans + Settings */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Live revenue feed */}
                    <NeonCard className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-violet-200 text-sm">Live Revenue Feed</div>
                            <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                Latest first
                            </span>
                        </div>

                        <div ref={feedRef} className="rounded-2xl border border-white/10 bg-black/30 p-3 h-[240px] overflow-auto">
                            {events.map((e) => {
                                const fan = fans.find((f) => f.id === e.fanId);
                                const badge = tierChip(fan?.tier ?? "Rookie");

                                return (
                                    <div key={e.id} className="mb-3 last:mb-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-sm text-gray-100 inline-flex items-center gap-2">
                                                <span className="text-violet-200">{fan?.handle ?? "@fan"}</span>
                                                <span className={badge}>{fan?.tier ?? "—"}</span>
                                                <span className="text-gray-300">{e.kind.toUpperCase()}</span>
                                            </div>
                                            <div className="text-sm text-yellow-200 font-semibold">{money(e.amount)}</div>
                                        </div>

                                        <div className="mt-1 text-[11px] text-gray-300">
                                            {e.kind === "spin" ? (
                                                <>
                                                    Spin outcome: <span className="text-gray-100">{e.outcome.label}</span> — {e.outcome.note}
                                                </>
                                            ) : (
                                                <>
                                                    {e.label}
                                                    {e.kind === "drink" && e.meta?.special === "vipbottle" ? " (VIP moment)" : null}
                                                    {e.kind === "drink" && e.meta?.special === "champagne" ? " (Champagne moment)" : null}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Preview simulation controls */}
                        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                            <div className="text-[11px] text-gray-400 mb-2">Preview: simulate fan purchases</div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <button
                                    className="rounded-xl border border-fuchsia-300/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                    onClick={() => simulateDrink("f2", "d5")}
                                >
                                    👑 Simulate VIP Bottle ($250)
                                </button>
                                <button
                                    className="rounded-xl border border-yellow-400/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                    onClick={() => simulateDrink("f1", "d4")}
                                >
                                    🍾 Simulate Champagne ($100)
                                </button>
                                <button
                                    className="rounded-xl border border-violet-300/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                    onClick={() => simulateSpin("f4")}
                                >
                                    🎰 Simulate Spin ($25)
                                </button>
                                <button
                                    className="rounded-xl border border-cyan-300/25 bg-black/40 py-2 text-sm hover:bg-white/5"
                                    onClick={() => simulateReaction("f3", "r4")}
                                >
                                    💖 Simulate Heart ($15)
                                </button>
                                <button
                                    className="rounded-xl border border-yellow-400/35 bg-yellow-600/20 py-2 text-sm hover:bg-yellow-600/30"
                                    onClick={() => simulateVip("f1", "vip")}
                                >
                                    👑 Simulate VIP Booth ({money(vipPrice)})
                                </button>
                                <button
                                    className="rounded-xl border border-yellow-400/45 bg-yellow-700/20 py-2 text-sm hover:bg-yellow-700/30"
                                    onClick={() => simulateVip("f1", "ultra")}
                                >
                                    👑 Simulate Ultra VIP ({money(ultraVipPrice)})
                                </button>
                            </div>
                        </div>
                    </NeonCard>

                    {/* Fan roster + moderation */}
                    <NeonCard className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-violet-200 text-sm">Fans in Room</div>
                            <span className="text-[10px] text-gray-400">Priority • Spend • Moderation</span>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                            <div className="divide-y divide-white/10">
                                {fans
                                    .slice()
                                    .sort((a, b) => b.spentTotal - a.spentTotal)
                                    .map((f) => (
                                        <div key={f.id} className="px-3 py-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm text-gray-100 truncate">{f.handle}</div>
                                                    <span className={tierChip(f.tier)}>{f.tier}</span>
                                                    {livePriority(f) && (
                                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-emerald-300/25 text-emerald-200 bg-black/40">
                                                            Priority
                                                        </span>
                                                    )}
                                                    {f.vipDiscountCents ? (
                                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-yellow-400/25 text-yellow-200 bg-black/40">
                                                            −{money(f.vipDiscountCents / 100)} VIP
                                                        </span>
                                                    ) : null}
                                                    {f.muted ? (
                                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-rose-300/25 text-rose-200 bg-black/40">
                                                            Muted
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="text-[11px] text-gray-400 mt-1">
                                                    Spent: <span className="text-yellow-200">{money(f.spentTotal)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="rounded-xl border border-fuchsia-300/20 bg-black/40 px-3 py-2 text-xs hover:bg-white/5"
                                                    onClick={() => {
                                                        setSelectedFanId(f.id);
                                                        pushToast(`Selected ${f.handle}`);
                                                    }}
                                                >
                                                    Select
                                                </button>

                                                {f.muted ? (
                                                    <button
                                                        className="rounded-xl border border-emerald-300/20 bg-emerald-600/10 px-3 py-2 text-xs hover:bg-emerald-600/20 inline-flex items-center gap-1"
                                                        onClick={() => unmuteFan(f.id)}
                                                    >
                                                        <VolumeX className="w-3 h-3" /> Unmute
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="rounded-xl border border-rose-300/20 bg-rose-600/10 px-3 py-2 text-xs hover:bg-rose-600/20 inline-flex items-center gap-1"
                                                        onClick={() => muteFan(f.id)}
                                                    >
                                                        <VolumeX className="w-3 h-3" /> Mute
                                                    </button>
                                                )}

                                                <button
                                                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs hover:bg-white/5 inline-flex items-center gap-1"
                                                    onClick={() => {
                                                        kickFan(f.id);
                                                        pushToast(`Kicked ${f.handle} (preview)`);
                                                    }}
                                                >
                                                    <Ban className="w-3 h-3" /> Kick
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </NeonCard>

                    {/* Settings / tuning */}
                    <NeonCard className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-violet-200 text-sm inline-flex items-center gap-2">
                                <Settings className="w-4 h-4" /> Room Settings (Creator/Admin)
                            </div>
                            <span className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", spinOddsTotal === 100 ? "border-emerald-300/25 text-emerald-200" : "border-rose-300/25 text-rose-200")}>
                                Odds total: {spinOddsTotal}%
                            </span>
                        </div>

                        {/* VIP prices */}
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 mb-3">
                            <div className="text-[11px] text-gray-400 mb-2">VIP Booth pricing</div>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="text-xs text-gray-300">
                                    VIP Booth
                                    <input
                                        type="number"
                                        value={vipPrice}
                                        onChange={(e) => setVipPrice(Number(e.target.value || 0))}
                                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                                    />
                                </label>
                                <label className="text-xs text-gray-300">
                                    Ultra VIP
                                    <input
                                        type="number"
                                        value={ultraVipPrice}
                                        onChange={(e) => setUltraVipPrice(Number(e.target.value || 0))}
                                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                                    />
                                </label>
                            </div>
                            <div className="mt-2 text-[10px] text-gray-400">Preview uses any pending VIP discount against VIP/Ultra VIP.</div>
                        </div>

                        {/* Drinks editor (lightweight) */}
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-3 mb-3">
                            <div className="text-[11px] text-gray-400 mb-2 inline-flex items-center gap-2">
                                <Martini className="w-4 h-4" /> Drink menu (quick edit)
                            </div>

                            <div className="space-y-2">
                                {drinks.map((d) => (
                                    <div key={d.id} className={cx("rounded-2xl border bg-black/35 p-2", toneBorder(d.tone))}>
                                        <div className="flex items-center gap-2">
                                            <div className="text-lg">{d.icon}</div>
                                            <input
                                                value={d.name}
                                                onChange={(e) =>
                                                    setDrinks((rows) => rows.map((x) => (x.id === d.id ? { ...x, name: e.target.value } : x)))
                                                }
                                                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                                            />
                                            <input
                                                type="number"
                                                value={d.price}
                                                onChange={(e) =>
                                                    setDrinks((rows) => rows.map((x) => (x.id === d.id ? { ...x, price: Number(e.target.value || 0) } : x)))
                                                }
                                                className="w-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                                            />
                                        </div>
                                        {d.special ? (
                                            <div className="mt-1 text-[10px] text-gray-300">Special moment: {d.special}</div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Spin outcomes editor (label + odds) */}
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                            <div className="text-[11px] text-gray-400 mb-2 inline-flex items-center gap-2">
                                <Zap className="w-4 h-4" /> Spin outcomes (preview)
                            </div>

                            <div className="space-y-2">
                                {spinOutcomes.map((o) => (
                                    <div key={o.id} className="rounded-2xl border border-violet-300/20 bg-black/35 p-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={o.label}
                                                onChange={(e) =>
                                                    setSpinOutcomes((rows) => rows.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))
                                                }
                                                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
                                            />
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={o.odds}
                                                    onChange={(e) =>
                                                        setSpinOutcomes((rows) => rows.map((x) => (x.id === o.id ? { ...x, odds: Number(e.target.value || 0) } : x)))
                                                    }
                                                    className="w-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none pr-6"
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                                            </div>
                                        </div>
                                        <input
                                            value={o.note}
                                            onChange={(e) =>
                                                setSpinOutcomes((rows) => rows.map((x) => (x.id === o.id ? { ...x, note: e.target.value } : x)))
                                            }
                                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs outline-none"
                                            placeholder="Outcome note…"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-2 text-[10px] text-gray-400">
                                Production: RNG + perk assignment must be server-authoritative. Preview uses local weighted pick.
                            </div>
                        </div>
                    </NeonCard>
                </div>
            </div>
        </div>
    );
}
