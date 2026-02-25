"use client";

import { Zap } from "lucide-react";

const TodCreatorGroupVote = () => (
    <div className="tod-creator-panel-bg rounded-xl tod-creator-neon-border-blue p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 tod-creator-text-neon-yellow" />
            <h3 className="font-bold text-white">Group Vote Campaigns</h3>
        </div>

        {/* Group Truth */}
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
                <span className="tod-creator-text-neon-blue font-bold text-sm">⚡ GROUP TRUTH</span>
                <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">INACTIVE</span>
            </div>
            <input
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none mb-2"
                placeholder="Prompt (e.g. Tell secret about ex)"
            />
            <div className="flex gap-2 mb-2">
                <input className="w-1/2 bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none" defaultValue="50" />
                <input className="w-1/2 bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none" defaultValue="$ 10" />
            </div>
            <button className="w-full py-2 rounded-lg tod-creator-bg-neon-blue text-white font-bold text-sm hover:opacity-90 transition-opacity tod-creator-glow-blue">
                ▶ Start Truth
            </button>
        </div>

        {/* Group Dare */}
        <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="tod-creator-text-neon-pink font-bold text-sm">🎭 GROUP DARE</span>
                <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">INACTIVE</span>
            </div>
            <input
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none mb-2"
                placeholder="Prompt (e.g. Do 50 squats)"
            />
            <div className="flex gap-2 mb-2">
                <input className="w-1/2 bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none" defaultValue="50" />
                <input className="w-1/2 bg-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none" defaultValue="$ 10" />
            </div>
            <button className="w-full py-2 rounded-lg tod-creator-bg-neon-pink text-white font-bold text-sm hover:opacity-90 transition-opacity tod-creator-glow-pink">
                ▶ Start Dare
            </button>
        </div>
    </div>
);

export default TodCreatorGroupVote;
