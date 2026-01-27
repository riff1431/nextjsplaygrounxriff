"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";

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
    Lock,
    Play,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import BrandLogo from "@/components/common/BrandLogo";
// import AgoraProvider, { createAgoraClient } from "@/components/providers/AgoraProvider"; // Removed
// import FanStream from "@/components/rooms/FanStream"; // Removed

import dynamic from 'next/dynamic';
const LiveStreamWrapper = dynamic(() => import('@/components/rooms/LiveStreamWrapper'), { ssr: false });

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

/**
 * PlayGroundX — Truth or Dare Room (Fan View)
 * Entry: $10
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


function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

const TIP_AMOUNTS = [5, 10, 25, 50] as const;

function TruthOrDareContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();
    const roomId = searchParams.get("roomId");

    // Agora Client
    // Agora Client removed form here

    const onBack = () => {
        router.push("/home");
    };

    // Session State
    const [loading, setLoading] = useState(true);
    const [sessionStatus, setSessionStatus] = useState<'active' | 'ended' | 'loading'>('loading');
    const [access, setAccess] = useState<'granted' | 'locked'>('granted'); // Default granted for backward compat, strictly checked below
    const [sessionInfo, setSessionInfo] = useState<{ title: string; desc: string; price: number; isPrivate: boolean } | null>(null);
    const [hostId, setHostId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [unlocking, setUnlocking] = useState(false);

    // Moved Hooks from bottom to fix "Rendered fewer hooks" error
    const [selectedTier, setSelectedTier] = useState<TierId | null>(null);
    const [customType, setCustomType] = useState<"truth" | "dare" | null>(null);
    const [customText, setCustomText] = useState("");
    const [lastAction, setLastAction] = useState<string | null>(null);

    const [votes, setVotes] = useState<Votes>({ truth: 0, dare: 0 });
    const [replayAvailable, setReplayAvailable] = useState(false);
    const [topFan] = useState("TopSuga");

    const [creatorCount] = useState(1);
    const [fanCount] = useState(2);

    // Load Session Data
    useEffect(() => {
        if (!roomId) return;

        async function checkAccess() {
            try {
                // 1. Get Game State
                const { data: game } = await supabase
                    .from('truth_dare_games')
                    .select(`
                        *,
                        room:rooms (
                            host_id
                        )
                    `)
                    .eq('room_id', roomId)
                    .single();

                if (!game || game.status !== 'active') {
                    setSessionStatus('ended');
                    setLoading(false);
                    return;
                }
                setSessionStatus('active');
                setHostId(game.room?.host_id); // Store host ID correctly from join
                setSessionInfo({
                    title: game.session_title || "Truth or Dare",
                    desc: game.session_description,
                    price: Number(game.unlock_price),
                    isPrivate: game.is_private
                });

                // 2. Check Access (if private)
                if (game.is_private) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        setUserId(user.id);
                        // Check unlocks table
                        const { data: unlock } = await supabase
                            .from('truth_dare_unlocks')
                            .select('id')
                            .eq('room_id', roomId)
                            .eq('fan_id', user.id)
                            .single();

                        if (unlock) setAccess('granted');
                        else setAccess('locked');
                    } else {
                        setAccess('locked');
                    }
                } else {
                    setAccess('granted');
                    // Even if public, try to get user for streaming UID
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) setUserId(user.id);
                }

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        checkAccess();
    }, [roomId, supabase]);

    // Realtime Status Updates
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(`room_status_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_games', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.status === 'ended') {
                    setSessionStatus('ended');
                } else if (newData.status === 'active') {
                    // Optional: Handling re-activation if needed, but primary goal is END handling
                    setSessionStatus('active');
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, supabase]);

    async function unlockSession() {
        if (!roomId || !sessionInfo) return;
        setUnlocking(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/unlock`, {
                method: 'POST'
            });
            const data = await res.json();

            if (res.ok) {
                setAccess('granted');
            } else {
                alert(data.error || "Failed to unlock");
            }
        } catch (e) {
            alert("Payment failed");
        } finally {
            setUnlocking(false);
        }
    }

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-pink-500">Checking access...</div>;

    if (sessionStatus === 'ended' && roomId) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="text-xl font-bold mb-2">Session Ended</div>
                <p className="text-gray-400 mb-6">This Truth or Dare session is no longer active.</p>
                <button onClick={onBack} className="px-6 py-2 bg-pink-600 rounded-xl">Back to Home</button>
            </div>
        );
    }



    // const truthWins = useMemo(() => votes.truth >= votes.dare, [votes]);
    // Fix: truthWins is not used in the return JSX yet? 
    // Wait, it is used for styling: ${truthWins ? ...
    const truthWins = votes.truth >= votes.dare; // Simple check

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
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-pink-500/20 relative z-20 bg-black/50 backdrop-blur-md">
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
                    <Crown className="w-4 h-4" /> {sessionInfo?.title || "Truth or Dare Room"}
                    <span className="hidden sm:inline text-[10px] text-gray-400">
                        {sessionInfo?.isPrivate ? `Private Entry $${sessionInfo.price}` : `Entry $${ENTRY_FEE}`}
                    </span>
                </div>
            </div>

            {/* Paywall Overlay */}
            {access === 'locked' && sessionInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                    <div className="max-w-md w-full bg-gray-900 border border-purple-500/30 rounded-3xl p-8 text-center shadow-[0_0_100px_rgba(168,85,247,0.2)]">
                        <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-8 h-8 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">{sessionInfo.title}</h2>
                        <p className="text-gray-400 mb-8">{sessionInfo.desc || "This is a private VIP session. Unlock to enter and participate."}</p>

                        <div className="p-4 rounded-xl bg-black/40 border border-white/10 mb-8">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Entry Fee</div>
                            <div className="text-3xl font-bold text-purple-300">${sessionInfo.price}</div>
                        </div>

                        <button
                            onClick={unlockSession}
                            disabled={unlocking}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg shadow-lg shadow-purple-900/40 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {unlocking ? "Processing..." : <>Unlock Access <Play className="w-5 h-5 fill-current" /></>}
                        </button>
                        <p className="mt-4 text-xs text-gray-600">Secure payment via PlaygroundX Wallet</p>
                    </div>
                </div>
            )}

            <main className="p-8 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                <div className="lg:col-span-3 flex flex-col gap-4">
                    <div className={`grid gap-4 ${creatorCount === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {Array.from({ length: creatorCount }).map((_, i) => (
                            <div
                                key={`creator-${i}`}
                                className="relative rounded-2xl border border-pink-500/40 aspect-video flex items-center justify-center bg-gray-950 overflow-hidden"
                            >
                                {/* Fan View - Only Creator 1 (index 0) is streaming for now */}
                                {i === 0 && roomId ? (
                                    <LiveStreamWrapper
                                        role="fan"
                                        appId={APP_ID}
                                        roomId={roomId}
                                        uid={userId || 0} // Pass actual user ID if available, else 0 (anon)
                                        hostId={hostId || 0} // Now correctly populated
                                    />
                                ) : (
                                    <>
                                        <Video className="w-10 h-10 text-pink-400" />
                                        <span className="absolute bottom-2 left-2 text-xs text-pink-300">Creator {i + 1}</span>
                                    </>
                                )}
                            </div>
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
                    <div className="rounded-xl border border-pink-500/20 bg-black/40 p-3 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-pink-200">
                            <CrownIcon className="w-5 h-5 text-yellow-400" />
                            Dare King
                        </div>
                        <div className="text-sm font-bold bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent">
                            {topFan}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-pink-300 mb-2">Choose a Prompt</h3>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {/* Column 1: Truths */}
                            <div className="space-y-2">
                                <div className="text-xs text-blue-300 font-semibold mb-1 text-center">System Truths</div>
                                {TIERS.map((t) => (
                                    <button
                                        key={`truth-${t.id}`}
                                        onClick={() => {
                                            setSelectedTier(t.id);
                                            setCustomType(null); // It's a system prompt
                                            setLastAction(`Purchased ${t.label} Truth`);
                                        }}
                                        className="w-full rounded-xl border border-blue-500/30 p-2 text-left hover:bg-blue-600/10 transition"
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white">{t.label}</span>
                                                <span className="text-xs text-blue-200">${t.price}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 truncate">{t.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Column 2: Dares */}
                            <div className="space-y-2">
                                <div className="text-xs text-pink-300 font-semibold mb-1 text-center">System Dares</div>
                                {TIERS.map((t) => (
                                    <button
                                        key={`dare-${t.id}`}
                                        onClick={() => {
                                            setSelectedTier(t.id);
                                            setCustomType(null);
                                            setLastAction(`Purchased ${t.label} Dare`);
                                        }}
                                        className="w-full rounded-xl border border-pink-500/30 p-2 text-left hover:bg-pink-600/10 transition"
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white">{t.label}</span>
                                                <span className="text-xs text-pink-200">${t.price}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 truncate">{t.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-gray-400 flex items-center gap-1 justify-center">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span>Creator-defined list (or system defaults)</span>
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
                            <Timer className="w-4 h-4" /> Dare ($5)
                        </button>

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
                            <DollarSign className="w-3 h-3" /> Fan entry ${ENTRY_FEE}
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

export default function TruthOrDareRoom() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Room...</div>}>
            <TruthOrDareContent />
        </Suspense>
    );
}
