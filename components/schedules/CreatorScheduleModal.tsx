"use client";

import { useEffect, useState, Fragment } from "react";
import { CalendarClock, Clock, X, Sparkles } from "lucide-react";

const ROOM_META: Record<string, { label: string; color: string; icon: string }> = {
    "flash-drop": { label: "Flash Drop", color: "#f97316", icon: "⚡" },
    suga4u: { label: "Suga4U", color: "#ec4899", icon: "💎" },
    confessions: { label: "Confessions", color: "#a855f7", icon: "🔮" },
    "x-chat": { label: "X-Chat", color: "#ef4444", icon: "🔥" },
    "truth-or-dare": { label: "Truth or Dare", color: "#06b6d4", icon: "🎯" },
    "bar-lounge": { label: "Bar Lounge", color: "#84cc16", icon: "🍸" },
};

interface Schedule {
    id: string;
    room_type: string;
    title: string | null;
    start_time: string;
    end_time: string;
}

interface CreatorScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    creatorId: string;
    creatorName: string;
}

export default function CreatorScheduleModal({ isOpen, onClose, creatorId, creatorName }: CreatorScheduleModalProps) {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        fetch(`/api/v1/schedules?creator_id=${creatorId}`)
            .then((res) => res.json())
            .then((data) => setSchedules(data.schedules || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [isOpen, creatorId]);

    if (!isOpen) return null;

    const getMeta = (type: string) => ROOM_META[type] || { label: type, color: "#888", icon: "📅" };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    };

    // Group schedules by date
    const grouped: Record<string, Schedule[]> = {};
    schedules.forEach((s) => {
        const key = formatDate(s.start_time);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl shadow-amber-500/10 animate-in zoom-in-95 fade-in duration-200"
            >
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-white/5">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                                <CalendarClock className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Schedule</h2>
                                <p className="text-xs text-zinc-500">{creatorName}&apos;s upcoming availability</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-6 max-h-[calc(80vh-100px)] custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-amber-400 animate-pulse font-medium text-sm">Loading schedule...</div>
                        </div>
                    ) : schedules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-4">
                                <CalendarClock className="w-8 h-8 text-zinc-600" />
                            </div>
                            <p className="text-zinc-500 text-sm text-center">
                                No upcoming availability set yet.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(grouped).map(([dateLabel, items]) => (
                                <div key={dateLabel}>
                                    {/* Date Header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="text-xs font-bold uppercase tracking-wider text-amber-400/80">
                                            {dateLabel}
                                        </div>
                                        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/20 to-transparent" />
                                    </div>

                                    {/* Items under this date */}
                                    <div className="space-y-2">
                                        {items.map((s) => {
                                            const meta = getMeta(s.room_type);
                                            return (
                                                <div
                                                    key={s.id}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
                                                >
                                                    {/* Room icon */}
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0 border"
                                                        style={{
                                                            backgroundColor: `${meta.color}12`,
                                                            borderColor: `${meta.color}25`,
                                                        }}
                                                    >
                                                        {meta.icon}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span
                                                                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border"
                                                                style={{
                                                                    backgroundColor: `${meta.color}12`,
                                                                    color: meta.color,
                                                                    borderColor: `${meta.color}25`,
                                                                }}
                                                            >
                                                                {meta.label}
                                                            </span>
                                                            {s.title && (
                                                                <span className="text-white/80 text-xs font-medium truncate">
                                                                    {s.title}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{formatTime(s.start_time)}</span>
                                                            <span className="text-zinc-700">→</span>
                                                            <span>{formatTime(s.end_time)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer glow */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
            </div>
        </div>
    );
}
