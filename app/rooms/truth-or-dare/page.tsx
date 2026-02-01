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
    X,
    TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import BrandLogo from "@/components/common/BrandLogo";
import RoomRequestManager from "@/components/rooms/RoomRequestManager"; // New Component
import InteractionOverlay, { OverlayPrompt } from "@/components/rooms/InteractionOverlay";
// import AgoraProvider, { createAgoraClient } from "@/components/providers/AgoraProvider"; // Removed
// import FanStream from "@/components/rooms/FanStream"; // Removed

import dynamic from 'next/dynamic';
const LiveStreamWrapper = dynamic(() => import('@/components/rooms/LiveStreamWrapper'), { ssr: false });
const QuestionCountdown = dynamic(() => import('./components/QuestionCountdown'), { ssr: false });

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

/**
 * PlayGroundX — Truth or Dare Room (Fan View)
 * Entry: $10
 * 4 Creators, 10 Fans max on camera.
 */

const DEFAULT_TIERS = [
    { id: "bronze", label: "Bronze", price: 5, desc: "Light & playful" },
    { id: "silver", label: "Silver", price: 10, desc: "Spicy" },
    { id: "gold", label: "Gold", price: 20, desc: "Very explicit" },
] as const;


type TierId = "bronze" | "silver" | "gold";

type Votes = { truth: number; dare: number };

const CROWD_TIER_FEES: Record<TierId, number> = {
    bronze: 5,
    silver: 10,
    gold: 15,
};

const CROWD_TV_FEES = { truth: 5, dare: 10 } as const;
const ENTRY_FEE = 10;
const TIP_AMOUNTS = [5, 10, 25, 50] as const;

function TruthOrDareContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();
    const roomId = searchParams.get("roomId");

    // Dynamic Pricing State
    const [truthTiers, setTruthTiers] = useState<{ id: TierId; label: string; price: number; desc: string }[]>([...DEFAULT_TIERS]);
    const [dareTiers, setDareTiers] = useState<{ id: TierId; label: string; price: number; desc: string }[]>([...DEFAULT_TIERS]);

    // Fetch Pricing
    useEffect(() => {
        async function loadPricing() {
            const { data } = await supabase.from('admin_settings').select('value').eq('key', 'global_pricing').single();
            if (data?.value) {
                const config = data.value;

                setTruthTiers(prev => prev.map(t => ({
                    ...t,
                    price: Number(config[`system_truth_${t.id}`] ?? t.price)
                })));

                setDareTiers(prev => prev.map(t => ({
                    ...t,
                    price: Number(config[`system_dare_${t.id}`] ?? t.price)
                })));
            }
        }
        loadPricing();
    }, [supabase]);

    // ... existing onBack ...
    const onBack = () => {
        router.push("/home");
    };

    // Session State
    const [loading, setLoading] = useState(true);
    const [sessionStatus, setSessionStatus] = useState<'active' | 'ended' | 'loading'>('loading');
    const [access, setAccess] = useState<'granted' | 'locked'>('locked'); // Default locked for security
    const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
    const [sessionInfo, setSessionInfo] = useState<{ title: string; desc: string; price: number; isPrivate: boolean } | null>(null);
    const [hostId, setHostId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [unlocking, setUnlocking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal States
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: string;
        tier?: string | null;
        content?: string;
        price: number;
    } | null>(null);

    const [resultModal, setResultModal] = useState<{
        isOpen: boolean;
        success: boolean;
        message: string;
        type?: string;
    } | null>(null);

    const [overlayPrompt, setOverlayPrompt] = useState<OverlayPrompt | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);

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
                const { data: game, error: gameError } = await supabase
                    .from('truth_dare_games')
                    .select(`*, room:rooms(host_id)`)
                    .eq('room_id', roomId)
                    .maybeSingle();

                if (gameError || !game || game.status !== 'active') {
                    console.warn("Session ended or not found", gameError);
                    setSessionStatus('ended');
                    setLoading(false);
                    return;
                }

                setSessionStatus('active');
                setHostId(game.room?.host_id);
                setSessionInfo({
                    title: game.session_title || "Truth or Dare",
                    desc: game.session_description,
                    price: Number(game.unlock_price),
                    isPrivate: game.is_private
                });

                // 2. Check Access
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setUserId(user.id);

                    // A. Check Payment (Unlocks table) - Valid for both Public and Private
                    const { data: unlock } = await supabase
                        .from('truth_dare_unlocks')
                        .select('id')
                        .eq('room_id', roomId)
                        .eq('fan_id', user.id)
                        .maybeSingle();

                    if (unlock) {
                        console.log("Access Granted: User has paid.");
                        setAccess('granted');
                        return; // Done
                    }

                    // B. If Private, check Request Status
                    if (game.is_private) {
                        const { data: req } = await supabase
                            .from('room_requests')
                            .select('status')
                            .eq('room_id', roomId)
                            .eq('user_id', user.id)
                            .maybeSingle();

                        if (req) {
                            setRequestStatus(req.status as any);
                        } else {
                            setRequestStatus('none');
                        }
                    } else {
                        // Public Room: Auto-approve request logic for payment flow
                        setRequestStatus('approved');
                    }
                } else {
                    console.log("Access Locked: No user.");
                }

                // Default: Locked
                setAccess('locked');

            } catch (e) {
                console.error("checkAccess failed", e);
                // If error, keep loading or show error, do not expose content
                setSessionStatus('ended'); // Safest fallback
            } finally {
                setLoading(false);
            }
        }
        checkAccess();
    }, [roomId, supabase]);

    // Realtime Status Updates
    useEffect(() => {
        if (!roomId) return;

        const gameStatusChannel = supabase.channel(`room_status_${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'truth_dare_games', filter: `room_id=eq.${roomId}` }, (payload) => {
                const newData = payload.new as any;
                if (newData.status === 'ended') {
                    setSessionStatus('ended');
                } else if (newData.status === 'active') {
                    setSessionStatus('active');
                }
            })
            .subscribe();

        const roomRequestChannel = supabase.channel(`room_requests_${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'room_requests', filter: `room_id=eq.${roomId}` },
                (payload) => {
                    const newRecord = payload.new as any;
                    // If my request was updated
                    if (userId && newRecord.user_id === userId) { // Changed fan_id to user_id based on schema
                        if (newRecord.status === 'approved') {
                            setRequestStatus('approved');
                            // toast.success("Host approved your request! Proceeding to payment..."); // Removed toast as it's not imported
                        } else if (newRecord.status === 'rejected') {
                            setRequestStatus('rejected');
                            // toast.error("Host declined your request."); // Removed toast
                        }
                    }
                }
            )
            .subscribe();

        // Reveal Listener (Game Updates)
        const gameChannel = supabase.channel(`room:${roomId}`)
            .on('broadcast', { event: 'game_update' }, (payload) => {
                if (payload.payload?.type === 'reveal') {
                    const p = payload.payload.prompt;
                    setOverlayPrompt(p);
                    setShowOverlay(true);
                    setTimeout(() => setShowOverlay(false), 6000); // Hide after 6s
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(gameStatusChannel);
            supabase.removeChannel(roomRequestChannel);
            supabase.removeChannel(gameChannel);
        };
    }, [roomId, userId, supabase]);

    async function sendJoinRequest() {
        if (!roomId || !userId) return;
        setUnlocking(true);
        try {
            const { error } = await supabase
                .from('room_requests')
                .insert({ room_id: roomId, user_id: userId, status: 'pending' });

            if (error) throw error;
            setRequestStatus('pending');
            alert("Request sent! Waiting for host approval.");
        } catch (e) {
            console.error("Request failed", e);
            alert("Failed to send request.");
        } finally {
            setUnlocking(false);
        }
    }

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

    const truthWins = votes.truth >= votes.dare; // Simple check

    function openConfirmation(type: string, tier: string | null = null, content: string = "", price: number = 0) {
        setConfirmModal({ isOpen: true, type, tier, content, price });
    }

    async function processPayment() {
        if (!roomId || !confirmModal || isSubmitting) return;
        setIsSubmitting(true);
        setLastAction("Processing transaction...");

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/interact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: confirmModal.type,
                    tier: confirmModal.tier,
                    content: confirmModal.content,
                    amount: confirmModal.price
                })
            });

            const data = await res.json();

            if (res.ok) {
                setLastAction("Request sent successfully!");
                setConfirmModal(null);

                // Update resultModal based on the new structure
                setResultModal({
                    isOpen: true,
                    success: true,
                    message: data.message || "Your request was sent successfully!",
                    type: confirmModal.type
                });

                setCustomText("");
                setCustomType(null);
                setSelectedTier(null);

                // Show countdown for system truth/dare purchases
                if (confirmModal.type === 'system_truth' || confirmModal.type === 'system_dare') {
                    setShowCountdown(true);
                }
            } else {
                setLastAction(`Error: ${data.error || "Failed to send"}`);
                setResultModal({
                    isOpen: true,
                    success: false,
                    message: data.error || "Failed to send your request."
                });
            }
        } catch (e) {
            setLastAction("Network error. Please try again.");
            setResultModal({
                isOpen: true,
                success: false,
                message: "Network error. Please try again."
            });
        } finally {
            setIsSubmitting(false);
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

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Host Tools: Request Manager (Private Rooms) */}
            {userId && hostId && userId === hostId && sessionInfo?.isPrivate && (
                <RoomRequestManager roomId={roomId!} />
            )}

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
                        {sessionInfo?.isPrivate ? "Private" : "Public"} Entry ${sessionInfo?.price ?? 0}
                    </span>
                </div>
            </div>

            {/* Paywall Overlay */}
            {
                access === 'locked' && sessionInfo && (
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
                                onClick={
                                    sessionInfo.isPrivate && requestStatus !== 'approved'
                                        ? sendJoinRequest
                                        : unlockSession
                                }
                                disabled={unlocking || (sessionInfo.isPrivate && requestStatus === 'pending') || (sessionInfo.isPrivate && requestStatus === 'rejected')}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${sessionInfo.isPrivate && requestStatus !== 'approved'
                                    ? "bg-blue-600 hover:bg-blue-500 shadow-blue-900/40 text-white"
                                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/40"
                                    }`}
                            >
                                {unlocking ? (
                                    "Processing..."
                                ) : sessionInfo.isPrivate && requestStatus === 'pending' ? (
                                    <>Request Pending...</>
                                ) : sessionInfo.isPrivate && requestStatus === 'rejected' ? (
                                    <>Request Declined</>
                                ) : sessionInfo.isPrivate && requestStatus !== 'approved' ? (
                                    <>Request to Join</>
                                ) : (
                                    <>Unlock Access <Play className="w-5 h-5 fill-current" /></>
                                )}
                            </button>
                            <p className="mt-4 text-xs text-gray-600">
                                {sessionInfo.isPrivate && requestStatus !== 'approved'
                                    ? "Host must approve your request before payment."
                                    : "Secure payment via PlaygroundX Wallet"
                                }
                            </p>
                        </div>
                    </div>
                )
            }

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
                                {truthTiers.map((t) => (
                                    <button
                                        key={`truth-${t.id}`}
                                        disabled={isSubmitting}
                                        onClick={() => openConfirmation('system_truth', t.id, "", t.price)}
                                        className="w-full rounded-xl border border-blue-500/30 p-2 text-left hover:bg-blue-600/10 transition disabled:opacity-50"
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
                                {dareTiers.map((t) => (
                                    <button
                                        key={`dare-${t.id}`}
                                        disabled={isSubmitting}
                                        onClick={() => openConfirmation('system_dare', t.id, "", t.price)}
                                        className="w-full rounded-xl border border-pink-500/30 p-2 text-left hover:bg-pink-600/10 transition disabled:opacity-50"
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
                            disabled={isSubmitting || !customType || !customText.trim()}
                            onClick={() => {
                                const price = customType === 'truth' ? 25 : 35;
                                openConfirmation(`custom_${customType}`, null, customText, price);
                            }}
                            className="mt-2 w-full rounded-xl border border-pink-500/40 py-2 text-sm flex items-center justify-center gap-2 hover:bg-pink-600/10 disabled:opacity-50"
                        >
                            <CreditCard className="w-4 h-4" /> {isSubmitting ? "Processing..." : "Pay & Submit"}
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
                                    onClick={() => openConfirmation('tip', null, "", t)}
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
                                {truthTiers.map((t) => (
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
            <AnimatePresence>
                {/* 1. Confirmation Modal */}
                {confirmModal && confirmModal.isOpen && (
                    <motion.div
                        key="confirm-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-sm bg-gray-900 border border-pink-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
                        >
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${confirmModal.type === 'tip' ? 'from-green-500 to-emerald-400' : 'from-pink-500 to-purple-600'}`}></div>
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="text-center space-y-4">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${confirmModal.type === 'tip' ? 'bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-pink-500/20'}`}>
                                    {confirmModal.type === 'tip' ? (
                                        <TrendingUp className="w-8 h-8 text-green-400" />
                                    ) : (
                                        <Crown className="w-8 h-8 text-pink-400" />
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        {confirmModal.type === 'tip' ? 'Send a Tip' : 'Confirm Interaction'}
                                    </h3>
                                    <p className="text-sm text-gray-400 mt-1">
                                        {confirmModal.type === 'tip' ? (
                                            <>Show some love to the creators!</>
                                        ) : (
                                            <>You are about to send a <span className="text-pink-300 font-bold uppercase">{confirmModal.tier || "Custom"} {confirmModal.type.split('_')[1]}</span>.</>
                                        )}
                                    </p>
                                </div>

                                <div className={`p-4 rounded-2xl border ${confirmModal.type === 'tip' ? 'bg-green-950/30 border-green-500/30' : 'bg-black/40 border-white/10'}`}>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Cost</div>
                                    <div className={`text-3xl font-bold flex items-center justify-center gap-1 ${confirmModal.type === 'tip' ? 'text-green-400' : 'text-white'}`}>
                                        <span className={confirmModal.type === 'tip' ? 'text-green-600' : 'text-pink-500'}>$</span>{confirmModal.price}
                                    </div>
                                </div>

                                <button
                                    onClick={processPayment}
                                    disabled={isSubmitting}
                                    className={`w-full py-3 rounded-xl font-bold text-lg shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${confirmModal.type === 'tip'
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-green-900/40'
                                        : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-pink-900/40'
                                        }`}
                                >
                                    {isSubmitting ? (
                                        <>Processing...</>
                                    ) : (
                                        <>Confirm & Pay</>
                                    )}
                                </button>
                                <p className="text-[10px] text-gray-500">Funds will be deducted from your wallet immediately.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* 2. Result Reveal Modal */}
                {resultModal && resultModal.isOpen && (
                    <motion.div
                        key="result-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ rotateX: 90, opacity: 0 }}
                            animate={{ rotateX: 0, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 20 }}
                            className={`w-full max-w-md aspect-[4/5] ${resultModal.type === 'tip' ? 'bg-gradient-to-tr from-green-900 to-emerald-900 border-green-500 shadow-[0_0_60px_rgba(34,197,94,0.3)]' : resultModal.success ? 'bg-gradient-to-tr from-green-900 to-green-800 border-green-500 shadow-[0_0_60px_rgba(236,72,153,0.3)]' : 'bg-gradient-to-tr from-red-900 to-red-800 border-red-500'} border-2 rounded-[2rem] p-8 relative flex flex-col items-center justify-center text-center`}
                        >
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gray-700/50 rounded-full"></div>

                            {/* Custom Icon for Tips */}
                            {resultModal.type === 'tip' && resultModal.success && (
                                <div className="mb-6 w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)] animate-bounce">
                                    <TrendingUp className="w-12 h-12 text-green-400" />
                                </div>
                            )}

                            <div className="mb-8">
                                <div className={`text-sm font-black tracking-[0.4em] ${resultModal.success ? (resultModal.type === 'tip' ? 'text-green-400' : 'text-green-500') : 'text-red-500'} uppercase mb-2`}>
                                    {resultModal.success ? (resultModal.type === 'tip' ? 'TIP SENT!' : 'SUCCESS') : 'FAILED'}
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                                    {resultModal.type === 'tip' && resultModal.success ? "Thanks for your support!" : resultModal.message}
                                </h2>
                            </div>

                            <button
                                onClick={() => setResultModal(null)}
                                className={`px-8 py-3 rounded-full font-bold transition ${resultModal.type === 'tip' ? 'bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-900/40' : 'bg-white text-black hover:bg-gray-200'}`}
                            >
                                Close & Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Question Countdown & Reveal */}
            {showCountdown && userId && roomId && (
                <QuestionCountdown
                    roomId={roomId}
                    userId={userId}
                    onClose={() => setShowCountdown(false)}
                />
            )}

            {/* Overlay */}
            <InteractionOverlay
                prompt={overlayPrompt}
                isVisible={showOverlay}
                onClose={() => setShowOverlay(false)}
            />
        </div >
    );
}

export default function TruthOrDareRoom() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Room...</div>}>
            <TruthOrDareContent />
        </Suspense>
    );
}
