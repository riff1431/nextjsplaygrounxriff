"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Trophy,
    Users,
    Clock,
    Crown,
    ChevronRight,
    Video,
    Sparkles,
    DollarSign,
    CheckCircle2,
    Info,
    ArrowLeft,
    Flame,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

/**
 * PlayGroundX — Competitions Room (FAN VIEW PREVIEW)
 * --------------------------------------------------
 * This is a UI-only mock for Preview.
 * - Competition Hub (signup + topic voting + overview)
 * - Live Arena (4 creators, 20-second rotations, voting + tips + buy votes)
 *
 * Notes:
 * - Fan entry: $50
 * - Free votes: 2 per round
 * - Paid votes: packages ($5=5, $15=20, $50=100)
 * - Tips: shown as UI action (payout logic is backend)
 */

type Topic = { id: string; label: string; votes: number };

type Creator = {
    id: string;
    name: string;
    votes: number;
    tips: number;
    badge?: "VIP" | "Elite" | "Star" | "Rising";
};

type FanWallet = {
    hasPaidEntry: boolean;
    freeVotesRemaining: number;
    paidVotes: number;
};

type Phase = "TOPIC_VOTING" | "TOPIC_LOCKED" | "LIVE" | "ENDED";

type Screen = "hub" | "arena";

export function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function money(n: number) {
    return `$${n.toFixed(0)}`;
}

export function formatHMS(seconds: number) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function Badge({
    text,
    tone = "pink",
}: {
    text: string;
    tone?: "pink" | "yellow" | "blue" | "gray";
}) {
    const toneCls =
        tone === "yellow"
            ? "border-yellow-400/35 text-yellow-200"
            : tone === "blue"
                ? "border-cyan-300/25 text-cyan-200"
                : tone === "gray"
                    ? "border-white/10 text-gray-200"
                    : "border-pink-500/30 text-pink-200";
    return (
        <span className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", toneCls)}>
            {text}
        </span>
    );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                className
            )}
        >
            {children}
        </div>
    );
}

function Btn({
    children,
    onClick,
    disabled,
    variant = "default",
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "default" | "ghost" | "gold" | "blue";
}) {
    const cls =
        variant === "gold"
            ? "border-yellow-400/35 text-yellow-200 bg-yellow-600/10 hover:bg-yellow-600/20"
            : variant === "blue"
                ? "border-cyan-300/25 text-cyan-200 bg-cyan-600/10 hover:bg-cyan-600/20"
                : variant === "ghost"
                    ? "border-white/10 text-gray-200 bg-black/30 hover:bg-white/5"
                    : "border-pink-500/25 text-pink-200 bg-pink-600/10 hover:bg-pink-600/20";
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={cx(
                "rounded-xl border px-3 py-2 text-sm transition inline-flex items-center justify-center gap-2",
                cls,
                disabled ? "opacity-40 cursor-not-allowed" : ""
            )}
        >
            {children}
        </button>
    );
}

function CreatorTile({
    c,
    onVote,
    onTip,
    canVote,
}: {
    c: Creator;
    onVote: () => void;
    onTip: () => void;
    canVote: boolean;
}) {
    return (
        <Card className="p-4">
            <div className="aspect-video rounded-xl border border-white/10 bg-[radial-gradient(circle_at_25%_20%,rgba(170,80,255,0.18),transparent_55%),radial-gradient(circle_at_70%_35%,rgba(0,230,255,0.14),transparent_55%),radial-gradient(circle_at_45%_90%,rgba(255,0,200,0.10),transparent_60%)] flex items-center justify-center">
                <div className="text-gray-200 inline-flex items-center gap-2">
                    <Video className="w-4 h-4 text-cyan-200" />
                    <span className="text-sm">LIVE VIDEO · {c.name}</span>
                </div>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                    <div className="text-gray-100 font-medium">{c.name}</div>
                    <div className="mt-1 text-[11px] text-gray-400">
                        <span className="text-pink-200">{c.votes}</span> votes ·{" "}
                        <span className="text-yellow-200">{money(c.tips)}</span> tips
                    </div>
                    <div className="mt-2">
                        <Badge text={c.badge ?? "Star"} tone="blue" />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Btn onClick={onVote} disabled={!canVote}>
                        Vote
                    </Btn>
                    <Btn variant="gold" onClick={onTip}>
                        Tip $10
                    </Btn>
                </div>
            </div>
        </Card>
    );
}

export default function CompetitionsFanPreview() {
    // Preview routing (simulates left sidebar)
    const [activeNav, setActiveNav] = useState<"home" | "competitions">("competitions");
    const [screen, setScreen] = useState<Screen>("hub");

    // Event state
    const [phase, setPhase] = useState<Phase>("LIVE");
    const [theme] = useState("Wet T-Shirt");
    const [fanCountPaid] = useState(1200);
    const [eventRemaining, setEventRemaining] = useState(2 * 3600);

    // Fan wallet
    const [wallet, setWallet] = useState<FanWallet>({
        hasPaidEntry: false,
        freeVotesRemaining: 2,
        paidVotes: 0,
    });

    // Topics
    const [topics, setTopics] = useState<Topic[]>([
        { id: "t1", label: "Short Skirts", votes: 182 },
        { id: "t2", label: "Wet T-Shirt", votes: 244 },
        { id: "t3", label: "School Teacher", votes: 199 },
        { id: "t4", label: "Cheer Captain", votes: 155 },
    ]);

    // Creators universe (sample)
    const [creators, setCreators] = useState<Creator[]>(() =>
        Array.from({ length: 32 }, (_, i) => ({
            id: `c${i + 1}`,
            name: `Creator ${i + 1}`,
            votes: Math.floor(Math.random() * 220),
            tips: Math.floor(Math.random() * 900),
            badge: i % 5 === 0 ? "VIP" : i % 4 === 0 ? "Elite" : i % 3 === 0 ? "Rising" : "Star",
        }))
    );

    // Round state
    const [roundEndsIn, setRoundEndsIn] = useState(20);
    const [roundCreators, setRoundCreators] = useState<Creator[]>(() => creators.slice(0, 4));

    const prizeSummary = useMemo(() => {
        if (fanCountPaid < 500) {
            return "Low attendance: Top 3 split entry fees 40% / 30% / 20%, 10% house. Tips are 90/10.";
        }
        return "Fixed prizes: Top 25 (1st $7,500; 2nd $5,000; 3rd $2,500; 4th $500; 5th $300; 6–25 $100). Tips are 90/10.";
    }, [fanCountPaid]);

    const leaderboard = useMemo(() => {
        return [...creators]
            .sort((a, b) => b.votes - a.votes || b.tips - a.tips)
            .slice(0, 10);
    }, [creators]);

    // Simulate event countdown + 20s rotations (Preview only)
    useEffect(() => {
        if (phase !== "LIVE") return;
        const t = setInterval(() => {
            setEventRemaining((s) => Math.max(0, s - 1));
            setRoundEndsIn((s) => {
                if (s <= 1) {
                    // new round
                    setWallet((w) => ({ ...w, freeVotesRemaining: 2 }));
                    const shuffled = [...creators].sort(() => Math.random() - 0.5);
                    setRoundCreators(shuffled.slice(0, 4));
                    return 20;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [phase, creators]);

    const voteFor = (creatorId: string) => {
        setWallet((w) => {
            const hasAny = w.freeVotesRemaining > 0 || w.paidVotes > 0;
            if (!hasAny) return w;

            let free = w.freeVotesRemaining;
            let paid = w.paidVotes;
            if (free > 0) free -= 1;
            else if (paid > 0) paid -= 1;

            // apply vote
            setCreators((cs) => cs.map((c) => (c.id === creatorId ? { ...c, votes: c.votes + 1 } : c)));
            return { ...w, freeVotesRemaining: free, paidVotes: paid };
        });
    };

    const tipCreator = (creatorId: string) => {
        setCreators((cs) => cs.map((c) => (c.id === creatorId ? { ...c, tips: c.tips + 10 } : c)));
    };

    const buyVotes = (pkg: 5 | 20 | 100) => {
        setWallet((w) => ({ ...w, paidVotes: w.paidVotes + pkg }));
    };

    const enterCompetition = () => {
        setWallet((w) => ({ ...w, hasPaidEntry: true }));
    };

    const canEnterArena = wallet.hasPaidEntry && phase === "LIVE";

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-pink-500/20">
                <div className="flex items-center gap-2">
                    <BrandLogo showBadge={false} />
                </div>

                <div className="text-[11px] text-gray-400 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatHMS(eventRemaining)} left
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {fanCountPaid} fans paid
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> {theme}
                    </span>
                    <Badge text={phase} tone="gray" />
                </div>
            </div>

            <div className="flex">
                {/* Left sidebar */}
                <aside className="w-[260px] shrink-0 border-r border-white/10 min-h-[calc(100vh-72px)] p-4 bg-black">
                    <div className="text-[11px] text-gray-500 mb-2">Rooms</div>

                    <button
                        onClick={() => setActiveNav("home")}
                        className={cx(
                            "w-full rounded-xl border px-3 py-2 text-sm text-left mb-2",
                            activeNav === "home" ? "border-white/20 bg-white/5" : "border-white/10 bg-black/30 hover:bg-white/5"
                        )}
                    >
                        Home
                    </button>

                    <button
                        onClick={() => {
                            setActiveNav("competitions");
                            setScreen("hub");
                        }}
                        className={cx(
                            "w-full rounded-xl border px-3 py-2 text-sm text-left inline-flex items-center justify-between",
                            activeNav === "competitions"
                                ? "border-pink-500/30 bg-pink-600/10"
                                : "border-white/10 bg-black/30 hover:bg-white/5"
                        )}
                    >
                        <span className="inline-flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-200" /> Competitions
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[11px] text-gray-400">Fan status</div>
                        <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm text-gray-100">Entry paid</span>
                            {wallet.hasPaidEntry ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                            ) : (
                                <span className="text-[11px] text-gray-400">No</span>
                            )}
                        </div>
                        <div className="mt-2 text-[11px] text-gray-400">
                            Free votes/round: <span className="text-pink-200">2</span>
                        </div>
                    </div>

                    <div className="mt-4 text-[11px] text-gray-500">Tips pay creators 90% / house 10%.</div>
                </aside>

                {/* Main content */}
                <main className="flex-1 p-6 max-w-6xl">
                    {activeNav !== "competitions" ? (
                        <Card className="p-6">
                            <div className="text-pink-200 text-sm">Home (placeholder)</div>
                            <div className="text-[11px] text-gray-400 mt-2">
                                Click Competitions in the left sidebar to preview the room.
                            </div>
                        </Card>
                    ) : (
                        <>
                            {/* Screen selector */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="text-pink-200 text-sm inline-flex items-center gap-2">
                                        <Trophy className="w-4 h-4" /> Competitions
                                    </div>
                                    <Badge text={screen === "hub" ? "Hub" : "Arena"} tone="pink" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Btn variant="ghost" onClick={() => setScreen("hub")}>
                                        Hub
                                    </Btn>
                                    <Btn variant="ghost" onClick={() => setScreen("arena")} disabled={!canEnterArena}>
                                        Arena
                                    </Btn>
                                </div>
                            </div>

                            {screen === "hub" && (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    <div className="lg:col-span-8 space-y-6">
                                        <Card className="p-5">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="text-pink-200 text-sm">Event Overview</div>
                                                    <div className="mt-2 text-[11px] text-gray-400 inline-flex items-start gap-2">
                                                        <Info className="w-4 h-4 mt-[1px] text-gray-500" />
                                                        <span>{prizeSummary}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[11px] text-gray-400">Remaining</div>
                                                    <div className="text-yellow-200 font-semibold">{formatHMS(eventRemaining)}</div>
                                                </div>
                                            </div>

                                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                                                    <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                                                        <Users className="w-3 h-3" /> Fans paid
                                                    </div>
                                                    <div className="text-sm text-gray-100 mt-1">{fanCountPaid}</div>
                                                </div>
                                                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                                                    <div className="text-[10px] text-gray-400">Entry fee</div>
                                                    <div className="text-sm text-gray-100 mt-1">$50</div>
                                                </div>
                                                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                                                    <div className="text-[10px] text-gray-400">Round format</div>
                                                    <div className="text-sm text-gray-100 mt-1">4-up · 20s</div>
                                                </div>
                                                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                                                    <div className="text-[10px] text-gray-400">Theme</div>
                                                    <div className="text-sm text-gray-100 mt-1">{theme}</div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2">
                                                {!wallet.hasPaidEntry ? (
                                                    <Btn variant="gold" onClick={enterCompetition}>
                                                        <DollarSign className="w-4 h-4" /> Enter Competition $50
                                                    </Btn>
                                                ) : (
                                                    <Btn onClick={() => setScreen("arena")} disabled={!canEnterArena}>
                                                        Enter Arena <ChevronRight className="w-4 h-4" />
                                                    </Btn>
                                                )}
                                                <Btn
                                                    variant="ghost"
                                                    onClick={() => setPhase(phase === "LIVE" ? "TOPIC_VOTING" : "LIVE")}
                                                >
                                                    Toggle Phase (preview)
                                                </Btn>
                                            </div>
                                        </Card>

                                        <Card className="p-5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-pink-200 text-sm">Topic Voting</div>
                                                    <div className="text-[11px] text-gray-400 mt-1">
                                                        Fans vote in advance. Admin locks and selects the winner 2 days before the event at 10:00 PM.
                                                    </div>
                                                </div>
                                                <Badge
                                                    text={phase === "TOPIC_VOTING" ? "Voting Open" : "Voting Closed"}
                                                    tone={phase === "TOPIC_VOTING" ? "blue" : "gray"}
                                                />
                                            </div>

                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {topics.map((t) => (
                                                    <div
                                                        key={t.id}
                                                        className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <div className="text-gray-100">{t.label}</div>
                                                            <div className="text-[11px] text-gray-400">{t.votes} votes</div>
                                                        </div>
                                                        <Btn
                                                            onClick={() =>
                                                                setTopics((ts) =>
                                                                    ts.map((x) => (x.id === t.id ? { ...x, votes: x.votes + 1 } : x))
                                                                )
                                                            }
                                                            disabled={phase !== "TOPIC_VOTING"}
                                                        >
                                                            Vote
                                                        </Btn>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="lg:col-span-4 space-y-6">
                                        <Card className="p-5">
                                            <div className="text-pink-200 text-sm">Leaderboard (Top 10)</div>
                                            <div className="text-[11px] text-gray-400 mt-1">
                                                Sorted by votes, tie-breaker tips (preview).
                                            </div>
                                            <div className="mt-3 space-y-2">
                                                {leaderboard.map((c, idx) => (
                                                    <div
                                                        key={c.id}
                                                        className="rounded-xl border border-white/10 bg-black/30 p-2 flex items-center justify-between"
                                                    >
                                                        <div className="text-sm text-gray-100 inline-flex items-center gap-2">
                                                            <span className="text-gray-400">#{idx + 1}</span> {c.name}
                                                            <Badge text={c.badge ?? "Star"} tone="blue" />
                                                        </div>
                                                        <div className="text-[11px] text-gray-400">
                                                            <span className="text-pink-200">{c.votes}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>

                                        <Card className="p-5">
                                            <div className="text-pink-200 text-sm">How it works</div>
                                            <ul className="mt-3 text-[11px] text-gray-300 space-y-2 list-disc pl-5">
                                                <li>4 creators appear per round for 20 seconds.</li>
                                                <li>You get 2 free votes each round.</li>
                                                <li>You can buy additional votes anytime during the event.</li>
                                                <li>Tips go directly to creators (90% creator / 10% house).</li>
                                            </ul>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {screen === "arena" && (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                    <div className="lg:col-span-8 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="inline-flex items-center gap-2">
                                                <Btn variant="ghost" onClick={() => setScreen("hub")}>
                                                    <ArrowLeft className="w-4 h-4" /> Back
                                                </Btn>
                                                <div className="text-pink-200 text-sm inline-flex items-center gap-2">
                                                    <Flame className="w-4 h-4" /> Live Arena
                                                </div>
                                                <Badge text={`Next rotation in ${roundEndsIn}s`} tone="yellow" />
                                            </div>

                                            <div className="text-[11px] text-gray-400 flex items-center gap-3">
                                                <span>
                                                    Free votes: <span className="text-pink-200">{wallet.freeVotesRemaining}</span>
                                                </span>
                                                <span>
                                                    Paid votes: <span className="text-pink-200">{wallet.paidVotes}</span>
                                                </span>
                                                <Badge
                                                    text={wallet.hasPaidEntry ? "Entry Paid" : "Not Entered"}
                                                    tone={wallet.hasPaidEntry ? "blue" : "gray"}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {roundCreators.map((c) => (
                                                <CreatorTile
                                                    key={c.id}
                                                    c={c}
                                                    canVote={wallet.freeVotesRemaining > 0 || wallet.paidVotes > 0}
                                                    onVote={() => voteFor(c.id)}
                                                    onTip={() => tipCreator(c.id)}
                                                />
                                            ))}
                                        </div>

                                        <Card className="p-5">
                                            <div className="flex items-center justify-between">
                                                <div className="text-pink-200 text-sm">Buy votes</div>
                                                <div className="text-[11px] text-gray-400">Votes apply immediately (preview).</div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <Btn variant="blue" onClick={() => buyVotes(5)}>
                                                    $5 · 5 votes
                                                </Btn>
                                                <Btn variant="blue" onClick={() => buyVotes(20)}>
                                                    $15 · 20 votes
                                                </Btn>
                                                <Btn variant="blue" onClick={() => buyVotes(100)}>
                                                    $50 · 100 votes
                                                </Btn>
                                            </div>
                                            <div className="mt-3 text-[11px] text-gray-500 inline-flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" /> You can vote multiple creators.
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="lg:col-span-4 space-y-6">
                                        <Card className="p-5">
                                            <div className="text-pink-200 text-sm">Leaderboard (Top 10)</div>
                                            <div className="mt-3 space-y-2">
                                                {leaderboard.map((c, idx) => (
                                                    <div
                                                        key={c.id}
                                                        className="rounded-xl border border-white/10 bg-black/30 p-2 flex items-center justify-between"
                                                    >
                                                        <div className="text-sm text-gray-100 inline-flex items-center gap-2">
                                                            <span className="text-gray-400">#{idx + 1}</span>
                                                            {c.name}
                                                            {idx === 0 ? <Crown className="w-4 h-4 text-yellow-200" /> : null}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400">
                                                            <span className="text-pink-200">{c.votes}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>

                                        <Card className="p-5">
                                            <div className="text-pink-200 text-sm">Prize Rules</div>
                                            <div className="mt-2 text-[11px] text-gray-400">{prizeSummary}</div>
                                        </Card>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>

            <DevTests />
        </div>
    );
}

/**
 * Minimal “tests” for Preview environments without a test runner.
 * These never render UI and only log in development.
 */
function DevTests() {
    useEffect(() => {
        // Run only if someone explicitly enables it
        const w = window as any;
        if (!w?.__PGX_RUN_TESTS__) return;

        const assert = (name: string, cond: boolean) => {
            if (!cond) throw new Error(`Test failed: ${name}`);
            // eslint-disable-next-line no-console
            console.log(`✓ ${name}`);
        };

        assert("formatHMS(0)", formatHMS(0) === "00:00:00");
        assert("formatHMS(59)", formatHMS(59) === "00:00:59");
        assert("formatHMS(60)", formatHMS(60) === "00:01:00");
        assert("formatHMS(3661)", formatHMS(3661) === "01:01:01");

        assert("money(10)", money(10) === "$10");
        assert("money(10.2)", money(10.2) === "$10");

        assert("cx filters falsy", cx("a", false, null, undefined, "b") === "a b");
    }, []);

    return null;
}
