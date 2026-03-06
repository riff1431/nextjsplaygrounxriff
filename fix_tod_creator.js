const fs = require('fs');
const oldPath = 'app/creator/rooms/truth-or-dare/page.tsx';
const newPath = 'app/rooms/truth-or-dare-creator/page.tsx';

let oldContent = fs.readFileSync(oldPath, 'utf8');
let newContent = fs.readFileSync(newPath, 'utf8');

// We want to extract the state logic from TruthOrDareCreatorRoom
const startIdx = oldContent.indexOf('export default function TruthOrDareCreatorRoom() {');
const renderIdx = oldContent.indexOf('return (', startIdx);

if (startIdx === -1 || renderIdx === -1) {
    console.error("Could not find TruthOrDareCreatorRoom logic");
    process.exit(1);
}

// all the state variables and useEffects
const stateLogic = oldContent.substring(startIdx + 'export default function TruthOrDareCreatorRoom() {'.length, renderIdx);

// Now wrap TruthOrDareCreatorPage
const newStartIdx = newContent.indexOf('const TruthOrDareCreatorPage = () => {');
const newRenderIdx = newContent.indexOf('return (', newStartIdx);

// We replace the logic inside TruthOrDareCreatorPage
let merged = newContent.substring(0, newStartIdx) + 
   '// --- Added imports for state ---\n' +
   'import { useEffect, useMemo, useRef, useState } from "react";\n' +
   'import { createClient } from "@/utils/supabase/client";\n' +
   'import { toast } from "sonner";\n' +
   'import { playNotificationSound, playMoneySound } from "@/utils/sounds";\n' +
   'import CreatorCountdown from "@/app/creator/rooms/truth-or-dare/components/CreatorCountdown";\n' +
   'import EarningsModal from "@/app/creator/rooms/truth-or-dare/components/EarningsModal";\n' +
   'import InteractionOverlay from "@/components/rooms/InteractionOverlay";\n' +
   '\n' + 
   '// ---------- Pricing / constants ----------\n' +
   'const TIERS = [\n' +
   '    { id: "bronze", label: "Bronze", price: 5, desc: "Light & playful" },\n' +
   '    { id: "silver", label: "Silver", price: 10, desc: "Spicy" },\n' +
   '    { id: "gold", label: "Gold", price: 20, desc: "Very explicit" },\n' +
   '] as const;\n' +
   'type TierId = (typeof TIERS)[number]["id"];\n' +
   'type CustomType = "truth" | "dare";\n' +
   '\n' +
   'type QueueItemType = "TIER_PURCHASE" | "CUSTOM_TRUTH" | "CUSTOM_DARE" | "TIP" | "CROWD_VOTE_TIER" | "CROWD_VOTE_TV" | "REPLAY_PURCHASE" | "TIME_EXTENSION" | "ANGLE_UNLOCK" | "DOUBLE_DARE";\n' +
   '\n' +
   'type QueueItem = { id: string; type: QueueItemType; createdAt: number; fanName?: string; amount: number; meta: Record<string, any>; };\n' +
   '\n' +
   '// --- End Added Imports ---\n\n' +
   'const TruthOrDareCreatorPage = () => {\n' +
   stateLogic + 
   newContent.substring(newRenderIdx);

// We also need to map state into the static UI props!
merged = merged.replace('<TodCreatorLiveChat roomId={null} />', '<TodCreatorLiveChat roomId={roomId} />');
merged = merged.replace('<TodCreatorRoomEarnings />', '<TodCreatorRoomEarnings earnings={sessionEarnings as any} />');

// TRUTH QUEUE
merged = merged.replace(
    '<TodCreatorRequestPanel title="Truth Requests" accentColor="blue" queue={[]} onServe={() => { }} onDismiss={() => { }} />',
    '<TodCreatorRequestPanel title="Truth Requests" accentColor="blue" queue={queue.filter(q => q.type.includes("TRUTH") || q.type === "TIER_PURCHASE" || q.type === "TIP") as any} onServe={serveQueueItem as any} onDismiss={(q: any) => setQueue(qq => qq.filter(x => x.id !== q.id))} />'
);

// DARE QUEUE
merged = merged.replace(
    '<TodCreatorRequestPanel title="Dare Requests" accentColor="pink" queue={[]} onServe={() => { }} onDismiss={() => { }} />',
    '<TodCreatorRequestPanel title="Dare Requests" accentColor="pink" queue={queue.filter(q => q.type.includes("DARE") || q.type === "CROWD_VOTE_TIER" || q.type === "CROWD_VOTE_TV") as any} onServe={serveQueueItem as any} onDismiss={(q: any) => setQueue(qq => qq.filter(x => x.id !== q.id))} />'
);

// GROUP VOTE
merged = merged.replace(
    '<TodCreatorGroupVote />',
    '{roomId && <TodCreatorGroupVote />}'
);

// Add Top UI Overlays like EarningsModal & Tip overlay inside the final </div>
const overlays = `
            {/* NEW: Cute Real-time Tip Alert Dialog */}
            {activeTip && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none p-4">
                    <div className="bg-black/80 backdrop-blur-xl border-2 border-green-500/50 rounded-[2rem] p-8 shadow-[0_0_100px_rgba(34,197,94,0.4)] animate-in zoom-in-50 fade-in duration-500 pointer-events-auto relative overflow-hidden max-w-sm w-full text-center">
                        <div className="text-3xl font-black text-white mb-1 uppercase drop-shadow-lg">New Tip!</div>
                        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-300 to-green-400">$\{activeTip.amount}</div>
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
`;

merged = merged.replace('</div>\n    );\n};', overlays + '\n        </div>\n    );\n};');

fs.writeFileSync(newPath, merged);
console.log('Merged properly!');
