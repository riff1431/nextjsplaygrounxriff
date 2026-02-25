"use client";

import { Zap } from "lucide-react";

interface Request {
    user: string;
    text: string;
}

interface TodCreatorRequestPanelProps {
    title: string;
    requests: Request[];
    accentColor: "pink" | "blue";
}

const TodCreatorRequestPanel = ({ title, requests, accentColor }: TodCreatorRequestPanelProps) => {
    const borderClass = accentColor === "pink" ? "tod-creator-neon-border-pink" : "tod-creator-neon-border-blue";
    const iconColor = accentColor === "pink" ? "tod-creator-text-neon-pink" : "tod-creator-text-neon-blue";

    return (
        <div className={`tod-creator-panel-bg rounded-xl ${borderClass} p-4 flex flex-col`}>
            <div className="flex items-center gap-2 mb-3">
                <Zap className={`w-4 h-4 ${iconColor}`} />
                <h3 className="font-bold text-white">{title}</h3>
            </div>
            <div className="space-y-2.5 flex-1 overflow-y-auto min-h-0">
                {requests.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0">
                            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-blue-500 rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-white">{r.user}</p>
                            <p className="text-xs text-white/60 truncate">{r.text}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                            <button className="px-2.5 py-1 text-xs rounded tod-creator-bg-neon-green text-white font-semibold hover:opacity-80 transition-opacity">
                                Accept
                            </button>
                            <button className="px-2.5 py-1 text-xs rounded border border-white/20 text-white/60 font-semibold hover:opacity-80 transition-opacity">
                                Decline
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TodCreatorRequestPanel;
