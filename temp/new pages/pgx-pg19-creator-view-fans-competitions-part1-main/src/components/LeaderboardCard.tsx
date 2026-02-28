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
  VIP: "bg-primary/20 text-primary border-primary/30",
  Star: "bg-neon-blue/20 text-neon-blue border-neon-blue/50",
  Elite: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
};

const LeaderboardCard = () => (
  <div className="glass-card neon-border rounded-lg p-6 flex flex-col w-full h-full min-h-0">
    <div className="mb-4 shrink-0">
      <h2 className="text-xl font-semibold text-foreground">Leaderboard (Top 10)</h2>
      <p className="text-xs text-muted-foreground mt-1">Sorted by votes, tie-breaker tips (preview)</p>
    </div>
    <ScrollArea className="flex-1 min-h-0 pr-2 [&_[data-radix-scroll-area-thumb]]:bg-primary/40 [&_[data-radix-scroll-area-scrollbar]]:bg-muted/30 [&_[data-radix-scroll-area-scrollbar]]:rounded-full">
      <div className="space-y-1">
        {leaders.map((l, i) => (
          <div
            key={i}
            className="flex items-center justify-between glass-card rounded-md px-4 py-2.5 border border-border/30 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold text-sm w-6">#{l.rank}</span>
              <span className="text-foreground font-medium text-sm">{l.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${badgeColors[l.badge]}`}>
                {l.badge}
              </span>
            </div>
            <span className="text-foreground font-bold">{l.score}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
);

export default LeaderboardCard;
