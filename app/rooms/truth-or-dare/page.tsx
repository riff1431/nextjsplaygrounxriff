"use client";

import React, { useEffect, useMemo, useState } from "react";

import {
    Crown,
    Video,
    Users,
    DollarSign,
    Star,
    Zap,
    Timer,
    Eye,
    Crown as CrownIcon,
    MessageCircle,
    CreditCard,
    ArrowLeft,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

/**
 * PlayGroundX — Truth or Dare Room (Fan View)
 * Entry: $10 (first 10 mins free, then $2/min)
 * 4 Creators, 10 Fans max on camera.
 */

const TIERS = [
    { id: "bronze", label: "Bronze", price: 5, desc: "Light & playful" },
    { id: "silver", label: "Silver", price: 10, desc: "Spicy" },
    { id: "gold", label: "Gold", price: 20, desc: "Very explicit" },
] as const;

type TierId = (typeof TIERS)[number]["id"];
type Votes = { truth: number; dare: number };

const CROWD_TIER_FEES: Record<TierId, number> = {
    bronze: 5,
    silver: 10,
    gold: 15,
};

const CROWD_TV_FEES = { truth: 5, dare: 10 } as const;

const ENTRY_FEE = 10;
const FREE_MINUTES = 10;
const PER_MIN_FEE = 2;

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

const TIP_AMOUNTS = [5, 10, 25, 50] as const;

export default function TruthOrDareRoom() {
    const onBack = () => {
        window.location.href = "/home";
    };

    const [selectedTier, setSelectedTier] = useState<TierId | null>(null);
    const [customType, setCustomType] = useState<"truth" | "dare" | null>(null);
    const [customText, setCustomText] = useState("");
    const [lastAction, setLastAction] = useState<string | null>(null);

    const [votes, setVotes] = useState<Votes>({ truth: 0, dare: 0 });
    const [replayAvailable, setReplayAvailable] = useState(false);
    const [topFan] = useState("TopSuga");

    const [creatorCount, setCreatorCount] = useState(4);
    const [fanCount, setFanCount] = useState(2);

    const [minutesInRoom, setMinutesInRoom] = useState(0);
    const billableMinutes = Math.max(0, minutesInRoom - FREE_MINUTES);
    const roomTimeCost = billableMinutes * PER_MIN_FEE;

    const truthWins = useMemo(() => votes.truth >= votes.dare, [votes]);

    function submitBaseline() {
        if (customType) {
            const trimmed = customText.trim();
            if (!trimmed) return;
            setLastAction(`Custom ${customType.toUpperCase()} submitted`);
            setCustomText("");
            return;
        }
        if (selectedTier) {
            const tierLabel = TIERS.find((t) => t.id === selectedTier)?.label ?? selectedTier;
            setLastAction(`${tierLabel} prompt purchased`);
        }
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-pink-500/20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <BrandLogo showBadge={false} />
                </div>
                <div className="flex items-center gap-3 text-pink-300 text-sm">
                    <Crown className="w-4 h-4" /> Truth or Dare Room
                    <span className="hidden sm:inline text-[10px] text-gray-400">
                        Entry ${ENTRY_FEE} · First {FREE_MINUTES} min free · Then ${PER_MIN_FEE}/min
                    </span>
                </div>
            </div>

            <main className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                <div className="lg:col-span-3 flex flex-col gap-4">
                    <div className="grid grid-cols-2 grid-rows-2 gap-4">
                        {Array.from({ length: creatorCount }).map((_, i) => (
                            <div
                                key={`creator-${i}`}
                                className="relative rounded-2xl border border-pink-500/40 aspect-video flex items-center justify-center bg-gray-950"
                            >
                                <Video className="w-10 h-10 text-pink-400" />
                                <span className="absolute bottom-2 left-2 text-xs text-pink-300">Creator {i + 1}</span>
                            </div>
                        ))}
                        {Array.from({ length: Math.max(0, 4 - creatorCount) }).map((_, i) => (
                            <div
                                key={`creator-empty-${i}`}
                                className="rounded-2xl border border-pink-500/10 aspect-video bg-black/40"
                            />
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-3 justify-start">
                        {Array.from({ length: fanCount }).map((_, i) => (
                            <div
                                key={`fan-${i}`}
                                className="relative rounded-xl border border-blue-400/40 w-40 aspect-video flex items-center justify-center bg-gray-900"
                            >
                                <Users className="w-6 h-6 text-blue-400" />
                                <span className="absolute bottom-1 left-1 text-[10px] text-blue-300">Fan {i + 1}</span>
                            </div>
                        ))}
                    </div>

                    {lastAction && (
                        <div className="text-xs text-pink-300 flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" /> {lastAction}
                        </div>
                    )}
                </div>

                <aside className="rounded-2xl border border-pink-500/30 bg-gray-950 p-4 space-y-5">
                    <div className="rounded-xl border border-pink-500/20 bg-black/40 p-3">
                        <div className="text-xs text-pink-300">Room Billing</div>
                        <div className="mt-1 text-[11px] text-gray-300">
                            Entry fee: <span className="text-white">${ENTRY_FEE}</span>
                            <br />
                            Time: <span className="text-white">{minutesInRoom} min</span> (first {FREE_MINUTES} free)
                            <br />
                            Current time cost: <span className="text-white">${roomTimeCost}</span>
                        </div>
                        <button
                            onClick={() => setMinutesInRoom((m) => m + 1)}
                            className="mt-2 w-full rounded-lg border border-pink-500/30 py-1 text-xs hover:bg-pink-600/10 flex items-center justify-center gap-1"
                        >
                            <Timer className="w-3 h-3" /> Simulate +1 minute
                        </button>
                        <div className="mt-1 text-[10px] text-gray-500">In production this runs automatically.</div>
                    </div>

                    <div>
                        <h3 className="text-pink-300 mb-2">Room Screens</h3>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                                onClick={() => setCreatorCount((c) => clamp(c - 1, 1, 4))}
                                className="rounded border border-pink-500/30 py-1 hover:bg-pink-600/10"
                            >
                                − Creator
                            </button>
                            <button
                                onClick={() => setCreatorCount((c) => clamp(c + 1, 1, 4))}
                                className="rounded border border-pink-500/30 py-1 hover:bg-pink-600/10"
                            >
                                + Creator
                            </button>
                            <button
                                onClick={() => setFanCount((f) => clamp(f - 1, 0, 10))}
                                className="rounded border border-blue-400/30 py-1 hover:bg-blue-600/10"
                            >
                                − Fan
                            </button>
                            <button
                                onClick={() => setFanCount((f) => clamp(f + 1, 0, 10))}
                                className="rounded border border-blue-400/30 py-1 hover:bg-blue-600/10"
                            >
                                + Fan
                            </button>
                        </div>
                        <div className="mt-1 text-[10px] text-gray-400">Creators 1–4 · Fans 0–10</div>
                    </div>

                    <div>
                        <h3 className="text-pink-300 mb-2">Choose a Tier (Auto Prompt)</h3>
                        <div className="space-y-2">
                            {TIERS.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setSelectedTier(t.id);
                                        setCustomType(null);
                                    }}
                                    className={`w-full rounded-xl border p-3 text-left hover:bg-pink-600/10 ${selectedTier === t.id && !customType ? "border-pink-500/80" : "border-pink-500/40"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">{t.label}</span>
                                        <span className="text-sm">${t.price}</span>
                                    </div>
                                    <div className="text-xs text-pink-300">{t.desc}</div>
                                </button>
                            ))}
                        </div>
                        <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Selecting Gold again serves a new Gold prompt.
                        </div>
                    </div>

                    <div>
                        <h3 className="text-pink-300 mb-2">Custom Requests (Fan-Written)</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    setCustomType("truth");
                                    setSelectedTier(null);
                                }}
                                className={`rounded-xl py-2 text-sm ${customType === "truth" ? "bg-pink-600" : "bg-pink-600/60 hover:bg-pink-600"
                                    }`}
                            >
                                Custom Truth ($25)
                            </button>
                            <button
                                onClick={() => {
                                    setCustomType("dare");
                                    setSelectedTier(null);
                                }}
                                className={`rounded-xl py-2 text-sm ${customType === "dare" ? "bg-pink-700" : "bg-pink-700/70 hover:bg-pink-700"
                                    }`}
                            >
                                Custom Dare ($35)
                            </button>
                        </div>
                        <textarea
                            value={customText}
                            onChange={(e) => setCustomText(e.target.value)}
                            className="mt-2 w-full rounded-xl bg-black border border-pink-500/30 p-2 text-xs"
                            rows={3}
                            placeholder="Write your custom Truth/Dare here…"
                        />
                        <button
                            onClick={submitBaseline}
                            className="mt-2 w-full rounded-xl border border-pink-500/40 py-2 text-sm flex items-center justify-center gap-2 hover:bg-pink-600/10"
                        >
                            <CreditCard className="w-4 h-4" /> Pay & Submit
                        </button>
                        <div className="mt-1 text-[10px] text-gray-400">Custom requests are direct fan↔creator. No auto-approval.</div>
                    </div>

                    <div>
                        <h3 className="text-pink-300 mb-2">Tip the Creators</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {TIP_AMOUNTS.map((t) => (
                                <button
                                    key={t}
                                    className="rounded-xl border border-pink-500/30 py-2 text-sm hover:bg-pink-600/10"
                                    onClick={() => setLastAction(`Tipped $${t}`)}
                                >
                                    ${t}
                                </button>
                            ))}
                        </div>
                        <div className="mt-1 text-[10px] text-gray-400">Tips split 90/10 (creator/platform).</div>
                    </div>

                    <div className="pt-3 border-t border-pink-500/20">
                        <h3 className="text-pink-300 mb-2">Add-Ons (Optional)</h3>

                        <div className="mb-3">
                            <div className="text-xs text-gray-300 mb-1">Crowd Vote: Escalate Tier</div>
                            <div className="grid grid-cols-3 gap-2">
                                {TIERS.map((t) => (
                                    <button
                                        key={`vote-tier-${t.id}`}
                                        className="rounded-lg border border-pink-500/30 py-1 text-xs hover:bg-pink-600/10"
                                        onClick={() => setLastAction(`Crowd vote: ${t.label} ($${CROWD_TIER_FEES[t.id]})`)}
                                    >
                                        {t.label}
                                        <span className="ml-1 text-[10px] text-gray-400">${CROWD_TIER_FEES[t.id]}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-1 text-[10px] text-gray-400 flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Paid votes contribute toward auto-escalation.
                            </div>
                        </div>

                        <div className="mb-3">
                            <div className="text-xs text-gray-300 mb-1">Crowd Vote: Truth vs Dare</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        setVotes((v) => ({ ...v, truth: v.truth + 1 }));
                                        setLastAction(`Crowd vote: Truth ($${CROWD_TV_FEES.truth})`);
                                    }}
                                    className={`rounded-xl border py-2 text-xs hover:bg-pink-600/10 ${truthWins ? "border-pink-500/60" : "border-pink-500/30"
                                        }`}
                                >
                                    Truth ({votes.truth}) · ${CROWD_TV_FEES.truth}
                                </button>
                                <button
                                    onClick={() => {
                                        setVotes((v) => ({ ...v, dare: v.dare + 1 }));
                                        setLastAction(`Crowd vote: Dare ($${CROWD_TV_FEES.dare})`);
                                    }}
                                    className={`rounded-xl border py-2 text-xs hover:bg-pink-600/10 ${!truthWins ? "border-pink-500/60" : "border-pink-500/30"
                                        }`}
                                >
                                    Dare ({votes.dare}) · ${CROWD_TV_FEES.dare}
                                </button>
                            </div>
                            <div className="mt-1 text-[10px] text-gray-400">
                                This mock assumes Truth vote = ${CROWD_TV_FEES.truth} and Dare vote = ${CROWD_TV_FEES.dare}.
                            </div>
                        </div>

                        <button className="w-full rounded-xl bg-pink-600/90 hover:bg-pink-600 py-2 text-sm mb-2">
                            Double Dare (+$15)
                        </button>

                        <div className="mb-2">
                            <div className="text-xs text-gray-300 mb-1">Camera Views</div>
                            <div className="grid grid-cols-2 gap-2">
                                <button className="rounded-xl border border-pink-500/40 py-2 text-xs flex items-center justify-center gap-1 hover:bg-pink-600/10">
                                    <Eye className="w-4 h-4" /> Close-Up
                                </button>
                                <button className="rounded-xl border border-pink-500/40 py-2 text-xs flex items-center justify-center gap-1 hover:bg-pink-600/10">
                                    <Eye className="w-4 h-4" /> Full Body
                                </button>
                            </div>
                        </div>

                        <button className="w-full rounded-xl border border-pink-500/40 py-2 text-sm flex items-center justify-center gap-1 hover:bg-pink-600/10 mb-2">
                            <Timer className="w-4 h-4" /> +30s Dare ($5)
                        </button>

                        <div className="text-xs text-pink-300 flex items-center gap-1 mb-2">
                            <CrownIcon className="w-4 h-4" /> Dare King: {topFan}
                        </div>

                        <div className="text-xs text-gray-400 mb-2">
                            Creators may decline any prompt. A same-tier replacement is auto-served.
                        </div>

                        <button
                            onClick={() => setReplayAvailable(true)}
                            className="w-full rounded-xl border border-pink-500/40 py-2 text-sm hover:bg-pink-600/10"
                        >
                            Replay Last Dare ($10)
                        </button>
                        {replayAvailable && <div className="text-xs text-pink-300">Replay available for 2 minutes</div>}
                    </div>

                    <div className="text-xs text-gray-400 space-y-1">
                        <p className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> Up to 4 creators & 10 fans
                        </p>
                        <p className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Fan entry ${ENTRY_FEE} · First {FREE_MINUTES} min free · Then ${PER_MIN_FEE}/min
                        </p>
                        <p className="flex items-center gap-1">
                            <Star className="w-3 h-3" /> Tips split 90/10 (creator/platform)
                        </p>
                    </div>
                </aside>
            </main>
        </div>
    );
}
