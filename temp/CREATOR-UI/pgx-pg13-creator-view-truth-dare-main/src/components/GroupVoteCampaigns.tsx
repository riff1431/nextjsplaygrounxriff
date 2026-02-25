import { Zap } from "lucide-react";

const GroupVoteCampaigns = () => (
  <div className="panel-bg rounded-xl neon-border-blue p-4 flex flex-col h-full">
    <div className="flex items-center gap-2 mb-4">
      <Zap className="w-4 h-4 text-neon-yellow" />
      <h3 className="font-bold text-foreground">Group Vote Campaigns</h3>
    </div>

    {/* Group Truth */}
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-neon-blue font-bold text-sm">⚡ GROUP TRUTH</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">INACTIVE</span>
      </div>
      <input
        className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-2"
        placeholder="Prompt (e.g. Tell secret about ex"
      />
      <div className="flex gap-2 mb-2">
        <input className="w-1/2 bg-muted rounded-lg px-3 py-2 text-sm text-foreground outline-none" defaultValue="50" />
        <input className="w-1/2 bg-muted rounded-lg px-3 py-2 text-sm text-foreground outline-none" defaultValue="$ 10" />
      </div>
      <button className="w-full py-2 rounded-lg bg-neon-blue text-foreground font-bold text-sm hover:opacity-90 transition-opacity glow-blue">
        ▶ Start Truth
      </button>
    </div>

    {/* Group Dare */}
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-neon-pink font-bold text-sm">🎭 GROUP DARE</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">INACTIVE</span>
      </div>
      <input
        className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none mb-2"
        placeholder="Prompt (e.g. Do 50 squats)"
      />
      <div className="flex gap-2 mb-2">
        <input className="w-1/2 bg-muted rounded-lg px-3 py-2 text-sm text-foreground outline-none" defaultValue="50" />
        <input className="w-1/2 bg-muted rounded-lg px-3 py-2 text-sm text-foreground outline-none" defaultValue="$ 10" />
      </div>
      <button className="w-full py-2 rounded-lg bg-neon-pink text-foreground font-bold text-sm hover:opacity-90 transition-opacity glow-pink">
        ▶ Start Dare
      </button>
    </div>
  </div>
);

export default GroupVoteCampaigns;
