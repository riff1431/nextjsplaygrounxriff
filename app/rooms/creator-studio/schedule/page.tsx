"use client";

import { useEffect, useState } from "react";
import { CalendarClock, ArrowLeft, Plus, Trash2, Clock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

const ROOM_TYPES = [
    { value: "flash-drop", label: "Flash Drop", color: "#f97316", icon: "⚡" },
    { value: "suga4u", label: "Suga4U", color: "#ec4899", icon: "💎" },
    { value: "confessions", label: "Confessions", color: "#a855f7", icon: "🔮" },
    { value: "x-chat", label: "X-Chat", color: "#ef4444", icon: "🔥" },
    { value: "truth-or-dare", label: "Truth or Dare", color: "#06b6d4", icon: "🎯" },
    { value: "bar-lounge", label: "Bar Lounge", color: "#84cc16", icon: "🍸" },
    { value: "competitions", label: "Competitions", color: "#eab308", icon: "🏆" },
];

interface Schedule {
    id: string;
    room_type: string;
    title: string | null;
    start_time: string;
    end_time: string;
    created_at: string;
}

export default function SchedulePage() {
    const router = useRouter();
    const supabase = createClient();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Form state
    const [roomType, setRoomType] = useState(ROOM_TYPES[0].value);
    const [title, setTitle] = useState("");
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("");

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth");
                return;
            }
            setUserId(user.id);
            await fetchSchedules(user.id);
        };
        init();
    }, []);

    const fetchSchedules = async (creatorId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/schedules?creator_id=${creatorId}`);
            const data = await res.json();
            if (data.schedules) setSchedules(data.schedules);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        if (!startDate || !startTime || !endDate || !endTime) {
            toast.error("Please fill in all date and time fields");
            return;
        }

        const timeWithSeconds = (t: string) => t.length === 5 ? `${t}:00` : t;
        const start = new Date(`${startDate}T${timeWithSeconds(startTime)}`);
        const end = new Date(`${endDate}T${timeWithSeconds(endTime)}`);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            toast.error("Please select valid dates and times");
            return;
        }
        if (end <= start) {
            toast.error("End time must be after start time");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/v1/schedules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    room_type: roomType,
                    title: title || null,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Schedule added!");
                setShowForm(false);
                setTitle("");
                setStartDate("");
                setStartTime("");
                setEndDate("");
                setEndTime("");
                await fetchSchedules(userId);
            } else {
                toast.error(data.error || "Failed to add schedule");
            }
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!userId) return;
        try {
            const res = await fetch(`/api/v1/schedules?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Schedule removed");
                setSchedules((prev) => prev.filter((s) => s.id !== id));
            } else {
                toast.error(data.error || "Failed to delete");
            }
        } catch (err) {
            toast.error("Something went wrong");
        }
    };

    const getRoomMeta = (type: string) =>
        ROOM_TYPES.find((r) => r.value === type) || { label: type, color: "#888", icon: "📅" };

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    return (
        <div className="cs-theme min-h-screen relative">
            {/* Background */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/rooms/creator-studio-bg.jpg')" }}
            />
            <div className="fixed inset-0 bg-black/70" />

            {/* Content */}
            <div className="relative z-10 p-4 md:p-8 max-w-[900px] mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push("/rooms/creator-studio")}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-medium flex items-center gap-2 transition"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <h1 className="text-3xl md:text-4xl font-bold italic bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                        Schedule Manager
                    </h1>
                </div>

                {/* Add Schedule Button */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="group px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-400/50 text-amber-300 hover:text-amber-200 font-bold text-sm flex items-center gap-3 transition-all shadow-[0_0_25px_rgba(245,158,11,0.1)] hover:shadow-[0_0_35px_rgba(245,158,11,0.25)]"
                    >
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition">
                            <Plus className="w-4 h-4" />
                        </div>
                        {showForm ? "Cancel" : "Add Availability"}
                    </button>
                </div>

                {/* Add Form */}
                {showForm && (
                    <form
                        onSubmit={handleSubmit}
                        className="mb-10 p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-5 animate-in fade-in slide-in-from-top-4 duration-300"
                    >
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            New Scheduled Slot
                        </h3>

                        {/* Room Type */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Room</label>
                            <div className="flex flex-wrap gap-2">
                                {ROOM_TYPES.map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setRoomType(r.value)}
                                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 ${
                                            roomType === r.value
                                                ? "border-opacity-60 shadow-lg scale-[1.02]"
                                                : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                                        }`}
                                        style={
                                            roomType === r.value
                                                ? {
                                                      backgroundColor: `${r.color}20`,
                                                      borderColor: `${r.color}60`,
                                                      color: r.color,
                                                      boxShadow: `0 0 20px ${r.color}25`,
                                                  }
                                                : {}
                                        }
                                    >
                                        <span>{r.icon}</span>
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title (optional) */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                                Title <span className="text-zinc-600">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Late Night Special..."
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition"
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        if (!endDate) setEndDate(e.target.value);
                                    }}
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Start Time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">End Time</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-sm uppercase tracking-wider hover:from-amber-400 hover:to-orange-400 transition-all shadow-[0_0_30px_rgba(245,158,11,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? "Saving..." : "Save Schedule"}
                        </button>
                    </form>
                )}

                {/* Schedule List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-amber-400 animate-pulse font-medium">Loading schedules...</div>
                    </div>
                ) : schedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-3xl animate-pulse" />
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
                                <CalendarClock className="w-10 h-10 text-amber-400" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">No Schedules Yet</h2>
                        <p className="text-zinc-500 text-center max-w-sm text-sm">
                            Add your availability so fans know when to catch you live!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {schedules.map((s) => {
                            const meta = getRoomMeta(s.room_type);
                            return (
                                <div
                                    key={s.id}
                                    className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all"
                                >
                                    {/* Room Icon */}
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 border"
                                        style={{
                                            backgroundColor: `${meta.color}15`,
                                            borderColor: `${meta.color}30`,
                                        }}
                                    >
                                        {meta.icon}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span
                                                className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                                                style={{
                                                    backgroundColor: `${meta.color}15`,
                                                    color: meta.color,
                                                    borderColor: `${meta.color}30`,
                                                }}
                                            >
                                                {meta.label}
                                            </span>
                                            {s.title && <span className="text-white font-medium text-sm truncate">{s.title}</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{formatDateTime(s.start_time)}</span>
                                            <span className="text-zinc-600">→</span>
                                            <span>{formatDateTime(s.end_time)}</span>
                                        </div>
                                    </div>

                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100"
                                        title="Delete schedule"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
