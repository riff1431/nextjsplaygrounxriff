const fs = require('fs');

const inOld = fs.readFileSync('app/creator/rooms/truth-or-dare/page.tsx', 'utf8');

const startHead = inOld.indexOf('export default function TruthOrDareCreatorRoom() {');

// Find the final return( that starts the render block
const renderStr = '    return (\n        <div className="min-h-screen bg-black text-white">';
const endHead = inOld.indexOf(renderStr);

if (endHead === -1) {
    console.error("Could not find renderStr");
    process.exit(1);
}

// Get the logic
let logic = inOld.substring(startHead + 'export default function TruthOrDareCreatorRoom() {'.length, endHead);

// Clean up the `loading...` return which caused problems
logic = logic.replace(
    /if \(!roomId && isLive\) {\s*return <div[^>]*>Loading Room...<\/div>;\s*}/g, 
    'if (!roomId && isLive) { return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Room...</div>; }'
);

const fullFile = `"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { playNotificationSound, playMoneySound } from "@/utils/sounds";

import TodCreatorLiveChat from "@/components/rooms/truth-or-dare-creator/TodCreatorLiveChat";
import TodCreatorStreamViewer from "@/components/rooms/truth-or-dare-creator/TodCreatorStreamViewer";
import TodCreatorRoomEarnings from "@/components/rooms/truth-or-dare-creator/TodCreatorRoomEarnings";
import TodCreatorRequestPanel from "@/components/rooms/truth-or-dare-creator/TodCreatorRequestPanel";
import GroupVoteManager from "@/app/creator/rooms/truth-or-dare/components/GroupVoteManager";

import CreatorCountdown from "@/app/creator/rooms/truth-or-dare/components/CreatorCountdown";
import EarningsModal from "@/app/creator/rooms/truth-or-dare/components/EarningsModal";
import InteractionOverlay, { OverlayPrompt } from "@/components/rooms/InteractionOverlay";

// ---------- Pricing / constants ----------
const TIERS = [
    { id: "bronze", label: "Bronze", price: 5, desc: "Light & playful" },
    { id: "silver", label: "Silver", price: 10, desc: "Spicy" },
    { id: "gold", label: "Gold", price: 20, desc: "Very explicit" },
] as const;
type TierId = (typeof TIERS)[number]["id"];
type CustomType = "truth" | "dare";

type QueueItemType = "TIER_PURCHASE" | "CUSTOM_TRUTH" | "CUSTOM_DARE" | "TIP" | "CROWD_VOTE_TIER" | "CROWD_VOTE_TV" | "REPLAY_PURCHASE" | "TIME_EXTENSION" | "ANGLE_UNLOCK" | "DOUBLE_DARE";

type QueueItem = { id: string; type: QueueItemType; createdAt: number; fanName?: string; amount: number; meta: Record<string, any>; };
type ActivityItem = { id: string; timestamp: number; fanName: string; type: 'truth' | 'dare' | 'tip' | 'custom_truth' | 'custom_dare'; tier?: TierId; amount: number; message?: string; };
type SessionEarnings = { total: number; tips: number; truths: number; dares: number; custom: number; };
type TipItem = { id: string; fanName: string; amount: number; message?: string; };
type CountdownRequest = { requestId: string; fanId: string; fanName: string; type: string; tier: string; content: string; amount: number; startedAt: number; };
type Creator = { id: string; name: string; isHost?: boolean };
type Fan = { id: string; name: string; avatar?: string | null; paidEntry: boolean; minutesInRoom: number; onCamera: boolean; walletOk: boolean; spendTotal: number; };
type CurrentPrompt = { id: string; label: string; source: "tier" | "custom"; tier?: TierId; customType?: CustomType; purchaser?: string; isDoubleDare?: boolean; startedAt?: number; durationSeconds?: number; };

function timeAgo(ts: number) {
    const d = Math.max(0, Date.now() - ts);
    const s = Math.floor(d / 1000);
    if (s < 60) return \`\${s}s ago\`;
    const m = Math.floor(s / 60);
    if (m < 60) return \`\${m}m ago\`;
    return \`\${Math.floor(m / 60)}h ago\`;
}
function formatCanadaDate(isoString: string | null | undefined) {
    if (!isoString) return "-";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    try {
        return d.toLocaleDateString("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" });
    } catch (e) {
        return d.toLocaleDateString("en-CA");
    }
}

export default function TruthOrDareCreatorPage() {
${logic}
    return (
        <div className="tod-creator-theme min-h-screen p-3 lg:p-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-3 lg:mb-4">
                <button
                    onClick={() => handleBackNavigation()}
                    className="tod-creator-panel-bg tod-creator-neon-border-blue px-3 py-2 rounded-lg flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-[18px] h-[18px]" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tod-creator-text-neon-pink flex items-center gap-2">
                        🎭 Truth or Dare — Creator View
                    </h1>
                    <span
                        className={\`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 \${realtimeStatus === 'connected' ? 'border-green-500/40 text-green-300 bg-green-500/10' :
                            realtimeStatus === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' :
                                realtimeStatus === 'closed' ? 'border-gray-500/40 text-gray-300 bg-gray-500/10' :
                                    'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'
                            }\`}
                    >
                        <span className={\`w-2 h-2 rounded-full \${realtimeStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                            realtimeStatus === 'error' ? 'bg-red-400' :
                                realtimeStatus === 'closed' ? 'bg-gray-400' :
                                    'bg-yellow-400 animate-pulse'
                            }\`} />
                        {realtimeStatus === 'connected' ? 'LIVE' :
                            realtimeStatus === 'error' ? 'ERROR' :
                                realtimeStatus === 'closed' ? 'OFFLINE' :
                                    'CONNECTING...'}
                    </span>
                </div>
                <div className="w-24 flex justify-end">
                     {sessionActive && isHost && (
                        <button
                            onClick={() => setShowExitConfirmation(true)}
                            className="text-xs bg-red-900/40 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-900/60 transition text-red-200"
                        >
                            End Session
                        </button>
                    )}
                </div>
            </div>

            {/* Top row: Chat | Stream | Earnings */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-3 lg:gap-4 mb-3 lg:mb-4">
                <div className="h-[420px]">
                    <TodCreatorLiveChat roomId={roomId} />
                </div>
                <div className="h-[420px]">
                    <TodCreatorStreamViewer />
                </div>
                <div className="h-[420px]">
                    <TodCreatorRoomEarnings earnings={sessionEarnings as any} />
                </div>
            </div>

            {/* Bottom row: Truth | Dare | GroupVote */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_280px] gap-3 lg:gap-4 flex-1">
                <div className="h-[400px] lg:h-[450px]">
                    <TodCreatorRequestPanel 
                        title="Truth Requests" 
                        accentColor="blue" 
                        queue={queue.filter(q => q.type.includes("TRUTH") || q.type === "TIER_PURCHASE" || q.type === "TIP") as any} 
                        onServe={serveQueueItem as any} 
                        onDismiss={(q: any) => setQueue(qq => qq.filter(x => x.id !== q.id))} 
                    />
                </div>
                <div className="h-[400px] lg:h-[450px]">
                    <TodCreatorRequestPanel 
                        title="Dare Requests" 
                        accentColor="pink" 
                        queue={queue.filter(q => q.type.includes("DARE") || q.type === "CROWD_VOTE_TIER" || q.type === "CROWD_VOTE_TV") as any} 
                        onServe={serveQueueItem as any} 
                        onDismiss={(q: any) => setQueue(qq => qq.filter(x => x.id !== q.id))} 
                    />
                </div>
                <div className="h-[400px] lg:h-[450px] overflow-hidden">
                    {roomId && <GroupVoteManager roomId={roomId} />}
                </div>
            </div>

            {/* Exit/End Confirmation Modal */}
            {showExitConfirmation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                    <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <span className="text-3xl">🛑</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">End Live Session?</h2>
                        <p className="text-gray-400 mb-8">
                            This will stop the stream for all viewers and close the session. Are you sure you want to exit?
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowExitConfirmation(false)}
                                className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={endSession}
                                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-900/20 transition"
                            >
                                End Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW: Cute Real-time Tip Alert Dialog */}
            {activeTip && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none p-4">
                    <div className="bg-black/80 backdrop-blur-xl border-2 border-green-500/50 rounded-[2rem] p-8 shadow-[0_0_100px_rgba(34,197,94,0.4)] animate-in zoom-in-50 fade-in duration-500 pointer-events-auto relative overflow-hidden max-w-sm w-full text-center">
                        <div className="text-3xl font-black text-white mb-1 uppercase drop-shadow-lg">New Tip!</div>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-400">$\${activeTip.amount}</div>
                        <p className="text-green-200 mt-2">\${activeTip.fanName}</p>
                        <button onClick={() => setActiveTip(null)} className="mt-4 px-4 py-2 bg-white/10 rounded">Dismiss</button>
                    </div>
                </div>
            )}
            
            {/* Creator Countdown Overlay */}
            <CreatorCountdown
                request={activeCountdown}
                roomId={roomId || ''}
                onComplete={(earnedAmount: number) => {
                    setActiveCountdown(null);
                    if (earnedAmount > 0) {
                        setSessionEarnings(prev => ({
                            ...prev,
                            total: prev.total + earnedAmount
                        }));
                        setTimeout(() => {
                            setEarningsNotification({
                                amount: earnedAmount,
                                fanName: activeCountdown?.fanName || 'Fan',
                                type: activeCountdown?.type || 'dare',
                                tier: activeCountdown?.tier
                            });
                        }, 500);
                    }
                }}
                onDismiss={() => setActiveCountdown(null)}
            />

            {/* Overlay */}
            <InteractionOverlay
                prompt={overlayPrompt}
                isVisible={showOverlay}
                onClose={() => setShowOverlay(false)}
            />

            {/* Earnings Notification Modal */}
            <EarningsModal
                notification={earningsNotification}
                onClose={() => setEarningsNotification(null)}
            />
        </div>
    );
}
`;

fs.writeFileSync('app/rooms/truth-or-dare-creator/page.tsx', fullFile);
console.log('Saved');
