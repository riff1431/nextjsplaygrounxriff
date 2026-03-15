"use client";

import { CalendarClock, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SchedulePage() {
    const router = useRouter();

    return (
        <div className="cs-theme min-h-screen relative">
            {/* Background */}
            <div
                className="fixed inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/rooms/creator-studio-bg.jpg')" }}
            />
            <div className="fixed inset-0 bg-black/70" />

            {/* Content */}
            <div className="relative z-10 p-4 md:p-8 max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-12">
                    <button
                        onClick={() => router.push("/rooms/creator-studio")}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-medium flex items-center gap-2 transition"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <h1 className="text-3xl md:text-4xl font-bold italic bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                        Schedule
                    </h1>
                </div>

                {/* Coming Soon Card */}
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-3xl animate-pulse" />
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
                            <CalendarClock className="w-12 h-12 text-amber-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Schedule Manager</h2>
                    <p className="text-zinc-400 text-center max-w-md leading-relaxed mb-6">
                        Plan and schedule your live sessions, flash drops, and content releases. Your fans will be notified ahead of time.
                    </p>
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Coming Soon
                    </span>
                </div>
            </div>
        </div>
    );
}
