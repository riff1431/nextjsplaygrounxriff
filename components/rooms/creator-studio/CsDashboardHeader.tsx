"use client";

import { DollarSign, Gift, Users, Play, Star, Lock, Bell, ChevronDown, ArrowLeft, MessageSquare, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import ProfileMenu from "@/components/navigation/ProfileMenu";
import { NotificationIcon } from "@/components/common/NotificationIcon";

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

interface CsStatsBarProps {
    tipsEarned: number;
    giftsCount: number;
    totalFollowers: number;
    activeRooms: number;
    subscribers: number;
    subscriptionEarnings: number;
    isLoading?: boolean;
}

export const CsStatsBar = ({
    tipsEarned,
    giftsCount,
    totalFollowers,
    activeRooms,
    subscribers,
    subscriptionEarnings,
    isLoading,
}: CsStatsBarProps) => {
    const router = useRouter();
    const stats: StatCardProps[] = [
        { icon: <DollarSign size={20} />, label: "Tips Earned", value: isLoading ? "..." : `€${tipsEarned}`, color: "text-[hsl(150,80%,45%)]" },
        { icon: <Gift size={20} />, label: "Gifts", value: isLoading ? "..." : `${giftsCount}`, color: "text-[hsl(320,100%,60%)]" },
        { icon: <Users size={20} />, label: "Total Followers", value: isLoading ? "..." : `${totalFollowers}`, color: "text-[hsl(180,100%,50%)]" },
        { icon: <Play size={20} />, label: "Active Rooms", value: isLoading ? "..." : `${activeRooms}`, color: "text-[hsl(280,100%,65%)]" },
        { icon: <Star size={20} />, label: "Subscribers", value: isLoading ? "..." : `${subscribers}`, color: "text-[hsl(45,100%,55%)]" },
        { icon: <Lock size={20} />, label: "Subscription Earnings", value: isLoading ? "..." : `€${subscriptionEarnings}`, color: "text-[hsl(25,100%,55%)]" },
    ];

    return (
        <div className="flex flex-wrap gap-3 items-center">
            {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
            ))}
            {/* Schedule Button */}
            <button
                onClick={() => router.push("/rooms/creator-studio/schedule")}
                className="cs-glass-card flex-1 px-6 py-3 flex items-center justify-center gap-2.5 min-w-[140px] cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] group"
                style={{ borderColor: "hsl(38, 92%, 50%)", borderWidth: "1.5px" }}
            >
                <CalendarClock size={20} className="text-cyan-400 group-hover:text-cyan-300 transition-colors shrink-0" />
                <span className="text-base font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">Schedule</span>
            </button>
        </div>
    );
};

interface CsDashboardHeaderProps {
    username?: string | null;
    avatarUrl?: string | null;
}

export const CsDashboardHeader = ({ username, avatarUrl }: CsDashboardHeaderProps) => {
    const router = useRouter();
    const { user, logout } = useAuth();
    const displayName = username || "Creator";

    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl md:text-4xl cs-font-display italic cs-neon-text-pink">
                    Creator Studio Dashboard
                </h1>
                <p className="text-white/50 mt-1">Welcome back, @{displayName}</p>
            </div>
            <div className="flex items-center gap-3">
                <NotificationIcon role="creator" />

                <button
                    onClick={() => router.push('/account/messages')}
                    className="px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 font-medium flex items-center gap-2 transition"
                    title="Messages"
                >
                    <MessageSquare className="w-4 h-4" />
                </button>

                <div className="relative z-50">
                    <ProfileMenu
                        user={user}
                        profile={{ username: displayName, avatar_url: avatarUrl }}
                        role="creator"
                        router={router}
                        onSignOut={logout}
                    />
                </div>
            </div>
        </div>
    );
};
