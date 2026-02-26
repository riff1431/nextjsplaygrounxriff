"use client";

import { ScrollArea } from "@/components/ui/scroll-area";

const leaders = [
    { rank: 1, name: "Creator 26", badge: "VIP", score: 219 },
    { rank: 2, name: "Creator 1", badge: "VIP", score: 219 },
    { rank: 3, name: "Creator 14", badge: "Star", score: 215 },
    { rank: 4, name: "Creator 32", badge: "Star", score: 206 },
    { rank: 5, name: "Creator 11", badge: "VIP", score: 204 },
    { rank: 6, name: "Creator 9", badge: "Elite", score: 193 },
    { rank: 7, name: "Creator 17", badge: "Star", score: 172 },
    { rank: 8, name: "Creator 17", badge: "Star", score: 172 },
    { rank: 9, name: "Creator 9", badge: "Elite", score: 193 },
    { rank: 10, name: "Creator 10", badge: "Elite", score: 193 },
];

const badgeColors: Record<string, string> = {
    VIP: "bg-[hsl(330,90%,60%)]/20 text-[hsl(330,90%,60%)] border-[hsl(330,90%,60%)]/30",
    Star: "bg-[hsl(220,90%,60%)]/20 text-[hsl(220,90%,60%)] border-[hsl(220,90%,60%)]/50",
    Elite: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
};

const FcLeaderboardCard = () => (
    <div className="fc-glass-card fc-neon-border rounded-lg p-6 flex flex-col w-full h-[600px] min-h-0">
        <div className="mb-4 shrink-0">
            <h2 className="text-xl font-semibold text-white">Leaderboard (Top 10)</h2>
            <p className="text-xs text-white/60 mt-1">Sorted by votes, tie-breaker tips (preview)</p>
        </div>
        <ScrollArea className="flex-1 min-h-0 pr-2 [&_[data-radix-scroll-area-thumb]]:bg-[hsl(330,90%,60%)]/40 [&_[data-radix-scroll-area-scrollbar]]:bg-[hsl(260,20%,18%)]/30 [&_[data-radix-scroll-area-scrollbar]]:rounded-full">
            <div className="space-y-1">
                {leaders.map((l, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between fc-glass-card rounded-md px-4 py-2.5 border border-white/20 hover:border-[hsl(330,90%,60%)]/40 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="fc-text-primary font-bold text-sm w-6">#{l.rank}</span>
                            <span className="text-white font-medium text-sm">{l.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${badgeColors[l.badge]}`}>
                                {l.badge}
                            </span>
                        </div>
                        <span className="text-white font-bold">{l.score}</span>
                    </div>
                ))}
            </div>
        </ScrollArea>
    </div>
);

export default FcLeaderboardCard;
