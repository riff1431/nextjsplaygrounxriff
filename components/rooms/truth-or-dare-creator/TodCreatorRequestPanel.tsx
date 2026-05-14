"use client";

import { Zap, Play, Pause } from "lucide-react";
import { cs } from "@/utils/currency";

interface QueueItem {
    id: string;
    type: string;
    createdAt: number;
    fanName?: string;
    amount: number;
    meta: Record<string, any>;
}

interface ActivityDisplayItem {
    id: string;
    fanName: string;
    amount: number;
    type: 'tip' | 'reaction';
    emoji?: string;
    message?: string;
    timestamp: number;
}

interface TodCreatorRequestPanelProps {
    title: string;
    accentColor: "pink" | "blue";
    queue: QueueItem[];
    activityItems?: ActivityDisplayItem[];
    onServe: (item: QueueItem) => void;
    onDismiss: (item: QueueItem) => void;
}

const TodCreatorRequestPanel = ({ title, accentColor, queue, activityItems, onServe, onDismiss }: TodCreatorRequestPanelProps) => {
    const borderClass = accentColor === "pink" ? "tod-creator-neon-border-pink" : "tod-creator-neon-border-blue";
    const iconColor = accentColor === "pink" ? "tod-creator-text-neon-pink" : "tod-creator-text-neon-blue";

    // Helper to format item display
    const renderContent = (q: QueueItem) => {
        if (q.type === "TIER_PURCHASE") {
            return `Tier: ${String(q.meta.tier).toUpperCase()}`;
        }
        if (q.type === "CUSTOM_TRUTH" || q.type === "CUSTOM_DARE") {
            return `"${String(q.meta.text || q.meta.content || "Custom Request")}"`;
        }
        return q.type.replaceAll("_", " ");
    };

    const activityCount = activityItems?.length || 0;

    return (
        <div className={`tod-creator-panel-bg rounded-xl ${borderClass} p-4 flex flex-col h-full min-h-[300px]`}>
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${iconColor}`} />
                    <h3 className="font-bold text-white tracking-widest uppercase text-sm">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {activityCount > 0 && (
                        <div className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">
                            {activityCount} activity
                        </div>
                    )}
                    <div className="text-[10px] text-gray-400">{queue.length} incoming</div>
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {/* Actionable Queue Items (Truth/Dare requests — with Serve/Dismiss) */}
                {queue.length === 0 && activityCount === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-white/40 text-xs tracking-wider uppercase">No requests yet</p>
                    </div>
                )}
                {queue.map((q) => (
                    <div key={q.id} className="flex items-start gap-3 bg-black/40 border border-white/5 rounded-lg p-3 group hover:border-white/10 transition-colors">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className={`font-bold text-sm ${iconColor}`}>{q.fanName ?? "Anonymous"}</span>
                                <span className="font-bold text-green-400 text-sm">{cs()}{q.amount}</span>
                            </div>
                            <p className="text-xs text-white/80 mt-1 line-clamp-2 leading-relaxed">
                                {renderContent(q)}
                            </p>
                            <div className="text-[10px] text-white/40 mt-1">
                                {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                            <button
                                onClick={() => onServe(q)}
                                className={`px-2.5 py-1.5 text-[10px] rounded flex items-center gap-1 font-bold tracking-wider uppercase text-black transition-opacity hover:opacity-80 ${accentColor === 'pink' ? 'bg-pink-500' : 'bg-blue-400'}`}
                            >
                                <Play className="w-3 h-3" /> Serve
                            </button>
                            <button
                                onClick={() => onDismiss(q)}
                                className="px-2.5 py-1 text-[10px] rounded border border-white/20 text-white/60 hover:text-white flex items-center gap-1 font-bold tracking-wider uppercase transition-colors"
                            >
                                <Pause className="w-3 h-3" /> Dismiss
                            </button>
                        </div>
                    </div>
                ))}

                {/* Activity Section (Tips & Reactions — read-only, no action buttons) */}
                {activityItems && activityItems.length > 0 && (
                    <>
                        <div className="flex items-center gap-2 mt-4 mb-2">
                            <div className="h-px flex-1 bg-white/10" />
                            <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Activity</span>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>
                        {activityItems.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-lg p-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-300"
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 flex-shrink-0">
                                    <span className="text-base">
                                        {a.type === 'reaction' ? (a.emoji || '💋') : '💰'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-xs text-white/80 truncate">{a.fanName}</span>
                                        <span className="text-[10px] text-white/40">
                                            {a.type === 'reaction' ? `sent ${a.message || 'a reaction'}` : 'tipped'}
                                        </span>
                                    </div>
                                    <div className="text-[9px] text-white/30 mt-0.5">
                                        {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-green-400 flex-shrink-0">+{cs()}{a.amount}</span>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default TodCreatorRequestPanel;
