"use client";

import { DollarSign, Gift, Users, Play, Star, Lock, ChevronLeft, Bell, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
    <div className="cs-glass-card px-4 py-3 flex items-center gap-3 min-w-[140px]">
        <div className={`${color} shrink-0`}>{icon}</div>
        <div>
            <p className="text-xs text-white/50">{label}</p>
            <p className="text-lg font-bold text-white">{value}</p>
        </div>
    </div>
);

export const CsStatsBar = () => {
    const stats: StatCardProps[] = [
        { icon: <DollarSign size={20} />, label: "Tips Earned", value: "$184", color: "text-[hsl(150,80%,45%)]" },
        { icon: <Gift size={20} />, label: "Gifts", value: "0", color: "text-[hsl(320,100%,60%)]" },
        { icon: <Users size={20} />, label: "Total Followers", value: "0", color: "text-[hsl(180,100%,50%)]" },
        { icon: <Play size={20} />, label: "Active Rooms", value: "2", color: "text-[hsl(280,100%,65%)]" },
        { icon: <Star size={20} />, label: "Subscribers", value: "0", color: "text-[hsl(45,100%,55%)]" },
        { icon: <Lock size={20} />, label: "Subscription Earnings", value: "$0", color: "text-[hsl(25,100%,55%)]" },
    ];

    return (
        <div className="flex flex-wrap gap-3">
            {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
            ))}
        </div>
    );
};

export const CsDashboardHeader = () => {
    const router = useRouter();

    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl md:text-4xl cs-font-display italic cs-neon-text-pink">
                    Creator Studio Dashboard
                </h1>
                <p className="text-white/50 mt-1">Welcome back, @JenDoe</p>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.push("/home")}
                    className="cs-glass-card px-4 py-2 flex items-center gap-2 text-sm text-white hover:bg-white/10 transition-colors"
                >
                    <ChevronLeft size={16} /> Back
                </button>
                <button className="cs-glass-card p-2 text-white hover:bg-white/10 transition-colors">
                    <Bell size={18} />
                </button>
                <button className="cs-glass-card px-3 py-2 flex items-center gap-2 text-sm text-white hover:bg-white/10 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-pink-500/30 border border-pink-500/50" />
                    JenDoe <ChevronDown size={14} />
                </button>
            </div>
        </div>
    );
};
