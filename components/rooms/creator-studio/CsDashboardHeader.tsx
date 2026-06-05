"use client";

import { DollarSign, Gift, Users, Play, Star, Lock, Bell, ChevronDown, ArrowLeft, MessageSquare, CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import ProfileMenu from "@/components/navigation/ProfileMenu";
import { NotificationIcon } from "@/components/common/NotificationIcon";
import { cs } from "@/utils/currency";
import LaunchTimer from "@/components/common/LaunchTimer";
import WelcomePopup from "@/components/common/WelcomePopup";

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
    <div className="cs-glass-card px-3 py-3 flex items-center gap-2.5 flex-1 min-w-0">
        <div className={`${color} shrink-0`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-white/50 truncate">{label}</p>
            <p className="text-base sm:text-lg font-bold text-white truncate">{value}</p>
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
    kycLocked?: boolean;
}

export const CsStatsBar = ({
    tipsEarned,
    giftsCount,
    totalFollowers,
    activeRooms,
    subscribers,
    subscriptionEarnings,
    isLoading,
    kycLocked,
}: CsStatsBarProps) => {
    const router = useRouter();
    const stats: StatCardProps[] = [
        { icon: <DollarSign size={20} />, label: "Tips Earned", value: isLoading ? "..." : `${cs()}${tipsEarned}`, color: "text-[hsl(150,80%,45%)]" },
        { icon: <Gift size={20} />, label: "Gifts", value: isLoading ? "..." : `${cs()}${giftsCount}`, color: "text-[hsl(320,100%,60%)]" },
        { icon: <Users size={20} />, label: "Total Followers", value: isLoading ? "..." : `${totalFollowers}`, color: "text-[hsl(180,100%,50%)]" },
        { icon: <Play size={20} />, label: "Active Rooms", value: isLoading ? "..." : `${activeRooms}`, color: "text-[hsl(280,100%,65%)]" },
        { icon: <Star size={20} />, label: "Subscribers", value: isLoading ? "..." : `${subscribers}`, color: "text-[hsl(45,100%,55%)]" },
        { icon: <Lock size={20} />, label: "Subscription Earnings", value: isLoading ? "..." : `${cs()}${subscriptionEarnings}`, color: "text-[hsl(25,100%,55%)]" },
    ];

    return (
        <div className={`space-y-3 ${kycLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Stats grid: 2 cols on mobile, 3 on sm, 6 on lg */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3" data-tour="earnings-dashboard">
                {stats.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                ))}
            </div>
            {/* Schedule Button — full width on mobile */}
            <button
                onClick={() => !kycLocked && router.push("/rooms/creator-studio/schedule")}
                className={`cs-glass-card w-full px-6 py-3 flex items-center justify-center gap-2.5 transition-all group ${kycLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'}`}
                style={{ borderColor: "hsl(38, 92%, 50%)", borderWidth: "1.5px" }}
                disabled={kycLocked}
                data-tour="room-scheduler"
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
        <>
            {/* Dynamic Welcome Popup for Creator */}
            <WelcomePopup role="creator" />

            <div className="flex flex-wrap md:flex-nowrap items-start justify-between gap-4 mb-4 sm:mb-6">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl cs-font-display italic cs-neon-text-pink leading-tight">
                        Creator Studio Dashboard
                    </h1>
                    <p className="text-white/50 mt-1 text-sm sm:text-base">Welcome back, @{displayName}</p>
                </div>

                {/* Launch Timer Countdown in top middle */}
                <div className="order-3 md:order-2 w-full md:w-auto flex justify-center">
                    <LaunchTimer />
                </div>

                <div className="order-2 md:order-3 flex items-center gap-2 shrink-0">
                    <NotificationIcon role="creator" />

                    {/* Messages — icon-only on mobile */}
                    <button
                        onClick={() => router.push('/account/messages')}
                        className="p-2 sm:px-4 sm:py-2 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 font-medium flex items-center gap-2 transition"
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
        </>
    );
};
