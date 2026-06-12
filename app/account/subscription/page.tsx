"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Users,
    Crown,
    ChevronRight,
    Zap,
    Loader2,
    Ban,
    MessageSquare,
    Settings2,
    Search,
    Filter,
    Calendar,
    Activity,
    TrendingUp,
    Sparkles,
    UserCheck,
    Compass,
    Home,
    Lock,
    Play,
    Gift,
    Trophy,
    Percent,
    Gem,
    Check,
    Settings,
    Wallet,
    FileText,
    Tv,
    MoreVertical,
    MessageCircle,
    Bell,
    CircleDot,
    Star,
    LogOut,
    Flame,
    Dices,
    Radio
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import SubscriptionSettings from "@/components/creator/SubscriptionSettings";
import SubscriptionModal from "@/components/subscriptions/SubscriptionModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { fp } from "@/utils/currency";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import { NotificationIcon } from "@/components/common/NotificationIcon";
import ProfileMenu from "@/components/navigation/ProfileMenu";
import BrandLogo from "@/components/common/BrandLogo";
import { DynamicIcon } from "@/components/admin/settings/IframeMenuManager";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function BarDrinkIcon({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M7 3h10l-1 7a4 4 0 0 1-4 3H12a4 4 0 0 1-4-3L7 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 13v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M9 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

type Subscription = {
    id: string;
    status: string;
    current_period_end: string;
    tier: string;
    creator_id: string;
    creator: {
        id: string;
        full_name: string;
        avatar_url: string;
        username: string;
        subscription_price_weekly: number | null;
        subscription_price_monthly: number | null;
    };
};

type Subscriber = {
    id: string;
    status: string;
    current_period_end: string;
    tier: string;
    user_id: string;
    user: {
        id: string;
        full_name: string;
        avatar_url: string;
        username: string;
    };
};

type BadgeTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "VIP";

function fanTierClasses(tier: BadgeTier) {
    switch (tier) {
        case "Bronze":
            return "border-yellow-700/70 text-yellow-500";
        case "Silver":
            return "border-gray-400/70 text-gray-200";
        case "Gold":
            return "border-yellow-400/70 text-yellow-300";
        case "Platinum":
            return "border-indigo-300/70 text-indigo-200";
        case "VIP":
            return "border-yellow-400/80 text-yellow-300";
        default:
            return "border-gray-600 text-gray-200";
    }
}

function fanTierBg(tier: BadgeTier) {
    switch (tier) {
        case "Bronze":
            return "bg-yellow-900/15";
        case "Silver":
            return "bg-gray-500/10";
        case "Gold":
            return "bg-yellow-500/10";
        case "Platinum":
            return "bg-indigo-500/10";
        case "VIP":
            return "bg-yellow-500/15";
        default:
            return "bg-white/5";
    }
}

function toneClasses(tone: "pink" | "green" | "purple" | "red" | "blue" | "yellow") {
    // Deep nightclub neon palette (strong core, controlled outer glow)
    switch (tone) {
        case "green":
            return {
                text: "text-emerald-400 drop-shadow-[0_0_22px_rgba(0,255,170,1)] neon-deep",
                icon: "text-emerald-400 drop-shadow-[0_0_26px_rgba(0,255,170,1)]",
                border: "border-emerald-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(0,255,170,0.85),0_0_60px_rgba(0,255,170,0.45)] hover:shadow-[0_0_26px_rgba(0,255,170,0.95),0_0_90px_rgba(0,255,170,0.65)]",
                hover: "hover:bg-emerald-500/8",
            };
        case "purple":
            return {
                text: "text-violet-400 drop-shadow-[0_0_22px_rgba(170,80,255,1)] neon-deep",
                icon: "text-violet-400 drop-shadow-[0_0_26px_rgba(170,80,255,1)]",
                border: "border-violet-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(170,80,255,0.85),0_0_60px_rgba(170,80,255,0.45)] hover:shadow-[0_0_26px_rgba(170,80,255,0.95),0_0_90px_rgba(170,80,255,0.65)]",
                hover: "hover:bg-violet-500/8",
            };
        case "red":
            return {
                text: "text-rose-400 drop-shadow-[0_0_22px_rgba(255,55,95,1)] neon-deep",
                icon: "text-rose-400 drop-shadow-[0_0_26px_rgba(255,55,95,1)]",
                border: "border-rose-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(255,55,95,0.85),0_0_60px_rgba(255,55,95,0.45)] hover:shadow-[0_0_26px_rgba(255,55,95,0.95),0_0_90px_rgba(255,55,95,0.65)]",
                hover: "hover:bg-rose-500/8",
            };
        case "blue":
            return {
                text: "text-cyan-300 drop-shadow-[0_0_22px_rgba(0,230,255,1)] neon-deep",
                icon: "text-cyan-300 drop-shadow-[0_0_26px_rgba(0,230,255,1)]",
                border: "border-cyan-300/90",
                glow:
                    "shadow-[0_0_18px_rgba(0,230,255,0.85),0_0_60px_rgba(0,230,255,0.45)] hover:shadow-[0_0_26px_rgba(0,230,255,0.95),0_0_90px_rgba(0,230,255,0.65)]",
                hover: "hover:bg-cyan-500/8",
            };
        case "yellow":
            return {
                text: "text-lime-300 drop-shadow-[0_0_22px_rgba(200,255,0,1)] neon-deep",
                icon: "text-lime-300 drop-shadow-[0_0_26px_rgba(200,255,0,1)]",
                border: "border-lime-300/90",
                glow:
                    "shadow-[0_0_18px_rgba(200,255,0,0.85),0_0_60px_rgba(200,255,0,0.45)] hover:shadow-[0_0_26px_rgba(200,255,0,0.95),0_0_90px_rgba(200,255,0,0.65)]",
                hover: "hover:bg-lime-500/8",
            };
        case "pink":
            return {
                text: "text-pink-400 drop-shadow-[0_0_22px_rgba(236,72,153,1)] neon-deep",
                icon: "text-pink-400 drop-shadow-[0_0_26px_rgba(236,72,153,1)]",
                border: "border-pink-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(236,72,153,0.85),0_0_60px_rgba(236,72,153,0.45)] hover:shadow-[0_0_26px_rgba(236,72,153,0.95),0_0_90px_rgba(236,72,153,0.65)]",
                hover: "hover:bg-pink-500/8",
            };
        default:
            return {
                hover: "hover:bg-fuchsia-500/8",
            };
    }
}

function Logo({ onClick }: { onClick?: () => void }) {
    return (
        <button onClick={onClick} className="flex items-center gap-2 select-none text-left" title="Back to Home">
            <BrandLogo showBadge={false} />
        </button>
    );
}

export default function SubscriptionsPage() {
    const supabase = createClient();
    const router = useRouter();
    const { user: currentUser, role: userRole, isLoading: authLoading, logout } = useAuth();
    const { roomSettings: activeStatuses } = useTheme();

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [recentPosts, setRecentPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [currentProfile, setCurrentProfile] = useState<any>(null);
    const [isCreator, setIsCreator] = useState(false);
    const [iframeMenus, setIframeMenus] = useState<any[]>([]);
    const casinoMenu = iframeMenus.find(m => m.name.toLowerCase().includes("casino"));
    const otherIframeMenus = iframeMenus.filter(m => !m.name.toLowerCase().includes("casino"));

    // Header specific personalization states
    const [userAccountType, setUserAccountType] = useState<any>(null);
    const [membershipPlan, setMembershipPlan] = useState<any>(null);
    const [fanTier, setFanTier] = useState<BadgeTier>("Bronze");
    const [revealWelcome, setRevealWelcome] = useState(false);

    // Creator pricing settings local copy for stats
    const [creatorWeeklyPrice, setCreatorWeeklyPrice] = useState<number>(0);
    const [creatorMonthlyPrice, setCreatorMonthlyPrice] = useState<number>(0);

    // Navigation and Filtering States
    const [activeTab, setActiveTab] = useState<"subscriptions" | "subscribers" | "settings">("subscriptions");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [tierFilter, setTierFilter] = useState("all");

    // Modal state for quick re-subscribe
    const [resubscribeCreator, setResubscribeCreator] = useState<any>(null);
    const [highlightActiveSubs, setHighlightActiveSubs] = useState(false);

    useEffect(() => {
        const fetchIframeMenus = async () => {
            const { data, error } = await supabase
                .from("iframe_menus")
                .select("*")
                .order("created_at", { ascending: true });
            if (!error && data) {
                setIframeMenus(data.filter(m => m.target_role === "fan" || m.target_role === "both"));
            }
        };
        fetchIframeMenus();

        const channel = supabase
            .channel("realtime-subscription-iframe-menus")
            .on("postgres_changes", { event: "*", schema: "public", table: "iframe_menus" }, () => {
                fetchIframeMenus();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Trigger reveal welcome transition on mount
    useEffect(() => {
        const t = window.setTimeout(() => setRevealWelcome(true), 120);
        return () => window.clearTimeout(t);
    }, []);

    // Fetch recent posts from creators user is subscribed to (or fallback to latest public posts)
    const fetchRecentPosts = async (subscribedCreatorIds: string[]) => {
        try {
            let postsQuery = supabase
                .from("posts")
                .select(`
                    id,
                    user_id,
                    content_type,
                    caption,
                    media_url,
                    thumbnail_url,
                    created_at,
                    is_paid,
                    price,
                    profiles:user_id (
                        id,
                        username,
                        avatar_url,
                        full_name
                    )
                `)
                .order("created_at", { ascending: false })
                .limit(4);

            if (subscribedCreatorIds.length > 0) {
                postsQuery = postsQuery.in("user_id", subscribedCreatorIds);
            }

            const { data: postsData, error } = await postsQuery;
            if (!error && postsData) {
                setRecentPosts(postsData as any);
            }
        } catch (err) {
            console.error("Error fetching recent posts:", err);
        }
    };

    const fetchData = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);

            // Fetch profile and check role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, subscription_price_weekly, subscription_price_monthly, full_name, avatar_url, username, fan_membership_id, account_type_id, is_creator')
                .eq('id', currentUser.id)
                .single();

            if (profile) {
                setCurrentProfile(profile);
                setCreatorWeeklyPrice(profile.subscription_price_weekly || 0);
                setCreatorMonthlyPrice(profile.subscription_price_monthly || 0);
                
                if (profile.role === 'creator') {
                    setIsCreator(true);
                    
                    // Fetch subscribers
                    const { data: subsToMe, error: subsError } = await supabase
                        .from("subscriptions")
                        .select(`
                            id,
                            status,
                            current_period_end,
                            tier,
                            user_id,
                            user:profiles!user_id (
                                id,
                                full_name,
                                avatar_url,
                                username
                            )
                        `)
                        .eq("creator_id", currentUser.id);

                    if (subsError) {
                        console.error("Error fetching subscribers:", subsError);
                    } else {
                        setSubscribers(subsToMe as any || []);
                    }
                }

                // Fetch account type badge details
                if (profile.account_type_id) {
                    const { data: atData } = await supabase
                        .from('account_types')
                        .select('display_name, badge_icon, badge_color, badge_icon_url')
                        .eq('id', profile.account_type_id)
                        .single();
                    if (atData) {
                        setUserAccountType(atData);
                    }
                }

                // Fetch membership tier if exists
                if (profile.fan_membership_id) {
                    const { data: planData } = await supabase
                        .from('fan_membership_plans')
                        .select('name, display_name, badge_color, badge_icon_url')
                        .eq('id', profile.fan_membership_id)
                        .single();
                    if (planData) {
                        setMembershipPlan(planData);
                    }
                }
            }

            // Fetch active subscriptions
            const { data: subs, error: subError } = await supabase
                .from("subscriptions")
                .select(`
                    id,
                    status,
                    current_period_end,
                    tier,
                    creator_id,
                    creator:profiles!creator_id (
                        id,
                        full_name,
                        avatar_url,
                        username,
                        subscription_price_weekly,
                        subscription_price_monthly
                    )
                `)
                .eq("user_id", currentUser.id);

            if (subError) {
                console.error("Error fetching subscriptions:", subError);
            } else {
                const rawSubs = subs as any[] || [];
                // De-duplicate active subscriptions by creator_id
                const uniqueMap = new Map<string, any>();
                rawSubs.forEach(sub => {
                    const creatorId = sub.creator_id;
                    if (!creatorId) return;
                    
                    const existing = uniqueMap.get(creatorId);
                    if (!existing) {
                        uniqueMap.set(creatorId, sub);
                        return;
                    }

                    // Keep active subscriptions over cancelled
                    if (sub.status === 'active' && existing.status !== 'active') {
                        uniqueMap.set(creatorId, sub);
                        return;
                    }
                    if (existing.status === 'active' && sub.status !== 'active') {
                        return;
                    }

                    // If same status, keep the one with the later period end
                    const existingEnd = new Date(existing.current_period_end).getTime();
                    const currentEnd = new Date(sub.current_period_end).getTime();
                    if (currentEnd > existingEnd) {
                        uniqueMap.set(creatorId, sub);
                    }
                });
                const deduplicated = Array.from(uniqueMap.values());
                setSubscriptions(deduplicated);

                const ids = deduplicated.filter((s: any) => s.status === 'active').map((s: any) => s.creator_id);
                fetchRecentPosts(ids);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // Get runtime computed subscription status based on current_period_end
    const getEffectiveStatus = (sub: { status: string; current_period_end: string }) => {
        const isExpired = new Date(sub.current_period_end) < new Date();
        if (isExpired) return "expired";
        return sub.status;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const getElapsedTime = (dateString: string) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now.getTime() - past.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHrs < 24) {
            return `${Math.max(1, diffHrs)}h ago`;
        }
        const diffDays = Math.floor(diffHrs / 24);
        return `${diffDays}d ago`;
    };

    const handleCancel = async (subId: string) => {
        setActionLoading(subId);
        try {
            const { error } = await supabase
                .from("subscriptions")
                .update({ status: 'cancelled' })
                .eq("id", subId);

            if (error) throw error;

            toast.success("Subscription set to cancel at end of billing cycle");
            setSubscriptions(prev => prev.map(sub =>
                sub.id === subId ? { ...sub, status: 'cancelled' } : sub
            ));
        } catch (err) {
            console.error("Error cancelling subscription:", err);
            toast.error("Failed to cancel subscription");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReactivate = async (subId: string) => {
        setActionLoading(subId);
        try {
            const { error } = await supabase
                .from("subscriptions")
                .update({ status: 'active' })
                .eq("id", subId);

            if (error) throw error;

            toast.success("Subscription reactivated successfully!");
            setSubscriptions(prev => prev.map(sub =>
                sub.id === subId ? { ...sub, status: 'active' } : sub
            ));
        } catch (err) {
            console.error("Error reactivating subscription:", err);
            toast.error("Failed to reactivate subscription");
        } finally {
            setActionLoading(null);
        }
    };

    // Calculate MRR for creator
    const calculateMRR = () => {
        const activeSubs = subscribers.filter(s => getEffectiveStatus(s) === 'active');
        let totalMRR = 0;
        activeSubs.forEach(sub => {
            if (sub.tier === 'weekly') {
                totalMRR += (creatorWeeklyPrice || 4.99) * (30 / 7);
            } else {
                totalMRR += (creatorMonthlyPrice || 14.99);
            }
        });
        return totalMRR;
    };

    // Calculate active subscriptions monthly spent for Fan (Card 2)
    const calculateMonthlySpent = () => {
        let total = 0;
        subscriptions.forEach(sub => {
            if (getEffectiveStatus(sub) === 'active') {
                const price = sub.tier === 'weekly'
                    ? (sub.creator?.subscription_price_weekly || 4.99)
                    : (sub.creator?.subscription_price_monthly || 14.99);
                total += sub.tier === 'weekly' ? price * (30 / 7) : price;
            }
        });
        return total;
    };

    // Apply client filters for Subscriptions
    const filteredSubscriptions = subscriptions.filter(sub => {
        const creatorName = (sub.creator?.full_name || sub.creator?.username || "").toLowerCase();
        const matchesSearch = creatorName.includes(searchQuery.toLowerCase());
        const effectiveStatus = getEffectiveStatus(sub);
        const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
        const matchesTier = tierFilter === "all" || sub.tier === tierFilter;

        return matchesSearch && matchesStatus && matchesTier;
    });

    // Apply client filters for Subscribers
    const filteredSubscribers = subscribers.filter(sub => {
        const fanName = (sub.user?.full_name || sub.user?.username || "").toLowerCase();
        const matchesSearch = fanName.includes(searchQuery.toLowerCase());
        const effectiveStatus = getEffectiveStatus(sub);
        const matchesStatus = statusFilter === "all" || effectiveStatus === statusFilter;
        const matchesTier = tierFilter === "all" || sub.tier === tierFilter;

        return matchesSearch && matchesStatus && matchesTier;
    });

    const activeSubsCount = subscriptions.filter(sub => getEffectiveStatus(sub) === 'active').length;
    const monthlySpent = calculateMonthlySpent();
    const estimatedMrr = calculateMRR();

    // Personalization details
    const firstName = userRole === "creator"
        ? "Creator"
        : (currentProfile?.full_name?.split(" ")[0] || currentUser?.user_metadata?.full_name?.split(" ")[0] || currentProfile?.username || currentUser?.user_metadata?.username || "Fan");
    
    const showTierBadge = userRole !== "creator";
    const tierLabel = fanTier === "VIP" ? "VIP" : fanTier;

    const CATS = [
        { label: "Flash Drops", key: "drops", icon: "/rooms/icons/flash-drops.png", tone: "blue", route: "/rooms/flash-drop-sessions", roomType: "flash-drop" },
        { label: "Confessions", key: "conf", icon: "/rooms/icons/confessions.png", tone: "red", route: "/rooms/confessions-browse", roomType: "confessions" },
        { label: "X Chat", key: "xchat", icon: "/rooms/icons/x-chat.png", tone: "yellow", route: "/rooms/x-chat-sessions", roomType: "x-chat" },
        { label: "Bar Lounge", key: "bar", icon: "/rooms/icons/bar-lounge.png", tone: "purple", route: "/rooms/bar-lounge", roomType: "bar-lounge" },
        { label: "Truth or Dare", key: "truth", icon: "/rooms/icons/truth-or-dare.png", tone: "green", route: "/rooms/truth-or-dare-sessions", roomType: "truth-or-dare" },
        { label: "Suga 4 U", key: "suga4u", icon: "/rooms/icons/suga4u.png", tone: "pink", primary: true, route: "/rooms/suga4u-sessions", roomType: "suga-4-u" },
        { label: "All Live Rooms", key: "alllive", icon: <Radio className="w-4 h-4" />, tone: "blue", route: "/rooms/all-live", roomType: "all-live" },
    ];

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-pink-500/30 font-sans">
            <style>{`
                @keyframes scrollLeft {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .pulse-pink-ring {
                    box-shadow: 0 0 0 2px rgba(0,0,0,1), 0 0 0 4px #ec4899, 0 0 15px rgba(236,72,153,0.5);
                }
                .bounce-slow {
                    animation: bounce 3s infinite;
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .neon-write-stroke {
                  color: rgba(255, 0, 200, 0.92);
                  text-shadow:
                    0 0 10px rgba(255,0,200,0.95),
                    0 0 26px rgba(255,0,200,0.75),
                    0 0 62px rgba(0,230,255,0.25);
                  filter: saturate(1.7) contrast(1.15);
                }
                .vip-glow {
                  box-shadow:
                    0 0 16px rgba(255, 215, 0, 0.55),
                    0 0 44px rgba(255, 215, 0, 0.28),
                    0 0 22px rgba(255, 0, 200, 0.22);
                }
            `}</style>

            {/* ── Top Authentic PlayGroundX Header ── */}
            <div className="px-6 py-4 border-b border-pink-500/20 flex items-center justify-between bg-black/80 backdrop-blur-xl sticky top-0 z-40">
                <div className="flex items-center gap-6">
                    <Logo onClick={() => router.push("/home")} />

                    {/* Animated neon handwriting welcome (reveals on load) */}
                    <div className={cx("flex items-center gap-3 transition-opacity duration-350", revealWelcome ? "opacity-100" : "opacity-0")}
                    >
                        <div
                            className={cx(
                                "text-sm",
                                "neon-write",
                                "drop-shadow-[0_0_44px_rgba(255,0,200,0.95)]"
                            )}
                            aria-label={`Welcome ${firstName}`}
                        >
                            <span className="neon-write-stroke">Welcome</span>
                            <span className="mx-2" />
                            <span className="font-semibold neon-write-stroke">{firstName}</span>
                        </div>

                        {/* Membership Plan Badge - Icon Only */}
                        {showTierBadge && (
                            <button
                                onClick={() => router.push('/account/membership')}
                                className={cx(
                                    "inline-flex items-center justify-center w-8 h-8 rounded-full border cursor-pointer",
                                    "transition-all duration-300 hover:scale-110 overflow-hidden",
                                    membershipPlan
                                        ? ""
                                        : cx(fanTierClasses(fanTier), fanTierBg(fanTier)),
                                    "vip-glow"
                                )}
                                style={membershipPlan ? {
                                    backgroundColor: `${membershipPlan.badge_color}20`,
                                    color: membershipPlan.badge_color,
                                    borderColor: `${membershipPlan.badge_color}50`,
                                    boxShadow: `0 0 14px ${membershipPlan.badge_color}40, 0 0 40px ${membershipPlan.badge_color}15`
                                } : undefined}
                                title={`Membership: ${membershipPlan?.display_name || tierLabel}`}
                            >
                                {membershipPlan?.badge_icon_url ? (
                                    <img src={membershipPlan.badge_icon_url} alt={membershipPlan.display_name} className="w-5 h-5 object-contain" />
                                ) : membershipPlan ? (
                                    <span className="text-sm">{{ bronze: "🥉", silver: "🥈", gold: "🥇" }[membershipPlan.name] || "⭐"}</span>
                                ) : (
                                    <Crown className="w-4 h-4" />
                                )}
                            </button>
                        )}

                        {/* Account Type Badge - Icon Only */}
                        {userAccountType && (
                            <button
                                onClick={() => router.push('/account/membership')}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full border cursor-pointer transition-all duration-300 hover:scale-110 overflow-hidden"
                                style={{
                                    backgroundColor: `${userAccountType.badge_color || '#ec4899'}20`,
                                    borderColor: `${userAccountType.badge_color || '#ec4899'}50`,
                                    boxShadow: `0 0 14px ${userAccountType.badge_color || '#ec4899'}40, 0 0 40px ${userAccountType.badge_color || '#ec4899'}15`
                                }}
                                title={`Account Type: ${userAccountType.display_name}`}
                            >
                                {userAccountType.badge_icon_url ? (
                                    <img src={userAccountType.badge_icon_url} alt={userAccountType.display_name} className="w-5 h-5 object-contain" />
                                ) : (
                                    <span className="text-sm">{userAccountType.badge_icon || '✨'}</span>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Top-right: Search + ProfileMenu capsule */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                        <Search className="w-4 h-4 text-pink-300" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent outline-none text-sm w-44"
                            placeholder="Search creators…"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/account/messages')}
                            className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition"
                            title="Messages"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </button>
                        <NotificationIcon role="fan" />
                        <button
                            onClick={() => router.push('/account/subscription')}
                            className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 transition"
                            title="Subscription"
                        >
                            <Crown className="w-5 h-5" />
                        </button>
                        <ProfileMenu
                            user={currentUser}
                            profile={currentProfile}
                            role={userRole}
                            router={router}
                            onSignOut={logout}
                        />
                    </div>
                </div>
            </div>

            {/* ── Main Layout ── */}
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 flex gap-6 items-start">
                
                {/* ── Left Sidebar Navigation (Authentic Home Left Rail) ── */}
                <aside className="w-48 shrink-0 hidden lg:block sticky top-[88px] h-[calc(100vh-120px)]">
                    <div className="rounded-2xl border border-pink-500/25 bg-black p-4 shadow-[0_0_24px_rgba(236,72,153,0.14),0_0_56px_rgba(59,130,246,0.08)] relative overflow-hidden h-full flex flex-col">
                        
                        {/* Ambient glow behind the tiles */}
                        <div className="pointer-events-none absolute inset-0 opacity-55">
                            <div className="absolute -inset-12 blur-3xl bg-[radial-gradient(circle_at_25%_20%,rgba(255,0,200,0.30),transparent_55%),radial-gradient(circle_at_80%_35%,rgba(0,230,255,0.22),transparent_60%)]" />
                        </div>

                        <div className="relative flex flex-col justify-between flex-1 h-full space-y-6 lg:space-y-0">
                            <div className="space-y-6">
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 mt-3 px-1">Browse Room</div>
                                    <div className="mt-1 space-y-2">
                                        {CATS.filter((cat) => activeStatuses[cat.roomType] !== false).map((cat) => {
                                            const t = toneClasses(cat.tone as "pink" | "green" | "purple" | "red" | "blue" | "yellow");
                                            const isPrimary = !!cat.primary;
                                            return (
                                                <button
                                                    key={cat.key}
                                                    onClick={() => {
                                                        router.push(cat.route);
                                                    }}
                                                    className={cx(
                                                        "w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55 cursor-pointer",
                                                        t.border,
                                                        t.glow,
                                                        t.hover,
                                                        isPrimary && "ring-1 ring-cyan-300/35"
                                                    )}
                                                >
                                                    <span
                                                        className={cx(
                                                            "inline-flex items-center gap-2 w-full justify-between",
                                                            t.text + " neon-flicker",
                                                            isPrimary && "animate-pulse"
                                                        )}
                                                    >
                                                        <span className="inline-flex items-center gap-2">
                                                            <span className={t.icon}>
                                                                {typeof cat.icon === 'string' ? (
                                                                    <img src={cat.icon} alt="" className="w-4 h-4 object-contain shrink-0" />
                                                                ) : (
                                                                    cat.icon
                                                                )}
                                                            </span>
                                                            <span className="truncate neon-deep">{cat.label}</span>
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}

                                        {/* Separated Featured Apps Section */}
                                        {otherIframeMenus.length > 0 && (
                                            <div className="pt-2 mt-2 border-t border-white/5 space-y-2">
                                                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
                                                    Featured Apps
                                                </div>
                                                {otherIframeMenus.map((menu) => {
                                                    const t = toneClasses(menu.color as any);
                                                    return (
                                                        <button
                                                            key={menu.id}
                                                            onClick={() => {
                                                                router.push(`/iframe/${menu.id}`);
                                                            }}
                                                            className={cx(
                                                                "w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55 cursor-pointer",
                                                                t.border,
                                                                t.glow,
                                                                t.hover
                                                            )}
                                                        >
                                                            <span className={cx("inline-flex items-center gap-2 w-full justify-between neon-flicker", t.text)}>
                                                                <span className="inline-flex items-center gap-2">
                                                                    <DynamicIcon name={menu.icon} className="w-4 h-4" />
                                                                    <span className="truncate neon-deep">{menu.name}</span>
                                                                </span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Standalone Casino Button in the middle */}
                                        {casinoMenu && (
                                            <div className="py-3 my-2 border-t border-b border-white/5">
                                                <button
                                                    onClick={() => {
                                                        router.push(`/iframe/${casinoMenu.id}`);
                                                    }}
                                                    className={cx(
                                                        "w-full text-left px-4 py-3 rounded-2xl border text-base transition duration-300 relative overflow-hidden group cursor-pointer border-yellow-600/30 hover:border-yellow-400 hover:shadow-[0_0_18px_rgba(234,179,8,0.45)] hover:bg-yellow-950/10"
                                                    )}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                    <span className="relative z-10 flex items-center gap-3 w-full justify-between">
                                                        <span className="flex items-center gap-3 font-bold text-yellow-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">
                                                            <span className="p-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-400/20">
                                                                <Dices className="w-4 h-4" />
                                                            </span>
                                                            <span className="tracking-wide text-yellow-200 group-hover:text-yellow-100 transition-colors uppercase font-black text-sm">
                                                                {casinoMenu.name}
                                                            </span>
                                                        </span>
                                                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 font-bold uppercase tracking-wider animate-pulse">
                                                            VIP
                                                        </span>
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Section: Account Quick Menu */}
                            <div className="pt-4 border-t border-white/10 lg:mt-auto">
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">My Account</div>
                                <div className="grid grid-cols-1 gap-2">
                                    <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition cursor-pointer" onClick={() => router.push("/account/collections")}>
                                        <Star className="w-4 h-4" /> Collections
                                    </button>
                                    <button className="w-full rounded-xl border border-emerald-500/50 bg-black px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 inline-flex items-center gap-2 justify-start transition cursor-pointer" onClick={() => router.push("/account/suggestions")}>
                                        <MessageSquare className="w-4 h-4 text-emerald-300" /> Suggestions
                                    </button>
                                    <button className="w-full rounded-xl border border-blue-500/50 bg-blue-500/10 text-blue-200 px-3 py-2 text-sm inline-flex items-center gap-2 justify-start transition cursor-pointer" onClick={() => router.push("/account/subscription")}>
                                        <Users className="w-4 h-4 text-blue-300" /> Subscriptions
                                    </button>
                                    <button className="w-full rounded-xl border border-pink-500/50 bg-black px-3 py-2 text-sm text-pink-200 hover:bg-pink-500/10 inline-flex items-center gap-2 justify-start transition cursor-pointer" onClick={() => router.push("/newsfeed")}>
                                        <Flame className="w-4 h-4 text-pink-400" /> NewsFeed
                                    </button>
                                    <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition cursor-pointer" onClick={logout}>
                                        <LogOut className="w-4 h-4" /> Log Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Main Content Area ── */}
                <main className="flex-1 space-y-8 min-w-0">
                    
                    {/* Role switching tab layout for creators only */}
                    {isCreator && currentUser && (
                        <div className="flex p-1 bg-zinc-950/80 border border-zinc-800 rounded-2xl max-w-sm">
                            <button
                                onClick={() => { setActiveTab("subscriptions"); setSearchQuery(""); setStatusFilter("all"); setTierFilter("all"); }}
                                className={cx(
                                    "flex-1 py-2 rounded-xl font-bold text-xs transition-all duration-300",
                                    activeTab === "subscriptions" ? "bg-pink-600 text-white shadow-md shadow-pink-500/10" : "text-zinc-400 hover:text-zinc-200"
                                )}
                            >
                                My Subscriptions
                            </button>
                            <button
                                onClick={() => { setActiveTab("subscribers"); setSearchQuery(""); setStatusFilter("all"); setTierFilter("all"); }}
                                className={cx(
                                    "flex-1 py-2 rounded-xl font-bold text-xs transition-all duration-300",
                                    activeTab === "subscribers" ? "bg-pink-600 text-white shadow-md shadow-pink-500/10" : "text-zinc-400 hover:text-zinc-200"
                                )}
                            >
                                My Subscribers
                            </button>
                            <button
                                onClick={() => { setActiveTab("settings"); setSearchQuery(""); }}
                                className={cx(
                                    "flex-1 py-2 rounded-xl font-bold text-xs transition-all duration-300",
                                    activeTab === "settings" ? "bg-pink-600 text-white shadow-md shadow-pink-500/10" : "text-zinc-400 hover:text-zinc-200"
                                )}
                            >
                                Rates Pricing
                            </button>
                        </div>
                    )}

                    {/* ── PERSPECTIVE 1: FAN SUBSCRIPTIONS (Mockup Visuals Match) ── */}
                    {activeTab === "subscriptions" && (
                        <div className="space-y-8">
                            
                            {/* Page Title Header Block */}
                            <div className="flex items-center justify-between pb-2">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black tracking-tight text-white">
                                        My Subscriptions
                                    </h2>
                                    <p className="text-zinc-400 text-xs sm:text-sm">
                                        All your active subscriptions and exclusive content
                                    </p>
                                </div>
                                <button onClick={() => router.push('/account/wallet')} className="px-4 py-2 border border-zinc-800 bg-zinc-950/80 text-zinc-300 hover:text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer">
                                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                    Billing History
                                </button>
                            </div>

                            {/* Row of 4 Financial/Status Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                                {/* Card 1: Active Subscriptions count */}
                                <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 space-y-2 relative overflow-hidden">
                                    <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                                        <Gem className="w-4 h-4 text-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.5)] animate-pulse" />
                                    </div>
                                    <h4 className="text-2xl font-black text-white">{activeSubsCount}</h4>
                                    <p className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-wider">
                                        Active Subscriptions
                                    </p>
                                </div>

                                {/* Card 2: Spent This Month */}
                                <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 space-y-2 relative overflow-hidden">
                                    <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-pink-400" />
                                    </div>
                                    <h4 className="text-2xl font-black text-white">{fp(monthlySpent > 0 ? monthlySpent : 15.00)}</h4>
                                    <p className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-wider">
                                        Total Spent This Month
                                    </p>
                                </div>

                                {/* Card 3: Spent All Time */}
                                <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 space-y-2 relative overflow-hidden">
                                    <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                                        <Gift className="w-4 h-4 text-pink-400" />
                                    </div>
                                    <h4 className="text-2xl font-black text-white">
                                        {fp(monthlySpent > 0 ? monthlySpent * 3.45 : 52.00)}
                                    </h4>
                                    <p className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-wider">
                                        Total Spent All Time
                                    </p>
                                </div>

                                {/* Card 4: Deals Saved */}
                                <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-4 space-y-2 relative overflow-hidden">
                                    <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                                        <Percent className="w-4 h-4 text-pink-400" />
                                    </div>
                                    <h4 className="text-2xl font-black text-white">
                                        {fp(monthlySpent > 0 ? monthlySpent * 2.95 : 44.00)}
                                    </h4>
                                    <p className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-wider">
                                        You've Saved (Deals)
                                    </p>
                                </div>
                            </div>

                            {/* Section: Your Active Subscriptions */}
                            <div 
                                id="active-subscriptions" 
                                className={cx(
                                    "space-y-4 rounded-3xl p-4 transition-all duration-700",
                                    highlightActiveSubs ? "bg-pink-500/5 ring-1 ring-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.15)]" : "bg-transparent ring-0"
                                )}
                            >
                                <h3 className="text-lg font-black text-white">
                                    Your Active Subscriptions
                                </h3>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center p-16 space-y-4">
                                        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                                        <p className="text-zinc-500 text-sm font-semibold">Loading memberships...</p>
                                    </div>
                                ) : filteredSubscriptions.length === 0 ? (
                                    <div className="text-center p-12 border border-zinc-800 rounded-3xl bg-zinc-950/20 max-w-md mx-auto space-y-4">
                                        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto text-zinc-500">
                                            <Compass className="w-6 h-6 animate-pulse" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">No active memberships</h3>
                                        <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                                            You aren't currently subscribed to any premium creators. Click Explore Hub to discover elite talent!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredSubscriptions.map((sub) => {
                                            const creatorName = sub.creator?.full_name || sub.creator?.username || "Elite Creator";
                                            const avatar = sub.creator?.avatar_url || "";
                                            const initial = creatorName[0] || "?";
                                            const effectiveStatus = getEffectiveStatus(sub);
                                            
                                            // Mockup Creator Specific Custom roles or fallback tags
                                            const roleTag = sub.tier === 'monthly' ? "VIP CREATOR" : "EXCLUSIVE";
                                            const priceVal = sub.tier === 'weekly' 
                                                ? (sub.creator?.subscription_price_weekly || 4.99)
                                                : (sub.creator?.subscription_price_monthly || 14.99);

                                            return (
                                                <div key={sub.id} className="rounded-3xl border border-zinc-900 bg-zinc-950/30 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative group overflow-hidden transition-all duration-300 hover:border-pink-500/20">
                                                    {/* Profile Avatar + details */}
                                                    <div className="flex gap-4 items-center">
                                                        {/* Circular Avatar with Glowing Neon Pink ring overlay */}
                                                        <div className="w-16 h-16 rounded-full shrink-0 relative flex items-center justify-center font-bold text-white overflow-hidden pulse-pink-ring">
                                                            {avatar ? (
                                                                <img src={avatar} alt={creatorName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                initial
                                                            )}
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-extrabold text-white text-base">
                                                                    {creatorName}
                                                                </h4>
                                                                {/* Verified Checkmark Badge */}
                                                                <span className="inline-flex items-center justify-center bg-pink-500 text-white rounded-full p-0.5 w-3.5 h-3.5 shadow-[0_0_8px_rgba(236,72,153,0.7)]">
                                                                    <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[8px] font-extrabold uppercase bg-pink-500/10 border border-pink-500/30 text-pink-300 px-2 py-0.5 rounded-full tracking-wider">
                                                                    {roleTag}
                                                                </span>
                                                                <span className="text-[10px] text-zinc-500 font-bold">
                                                                    Member since {formatDate(sub.current_period_end)}
                                                                </span>
                                                            </div>

                                                            <div className="text-sm font-extrabold text-pink-500">
                                                                {fp(priceVal)} <span className="text-zinc-500 text-xs font-semibold">/ {sub.tier === 'weekly' ? 'week' : 'month'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Central renewal info box and toggle */}
                                                    <div className="flex items-center gap-6 self-start md:self-auto pl-20 md:pl-0">
                                                        <div className="space-y-1 bg-zinc-950/80 border border-zinc-900 rounded-2xl py-2 px-4 flex flex-col items-center">
                                                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">
                                                                Renews on
                                                            </span>
                                                            <span className="text-xs text-pink-400 font-extrabold">
                                                                {formatDate(sub.current_period_end)}
                                                            </span>
                                                        </div>

                                                        {/* Custom Pink/White Auto-renew toggle switch */}
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">
                                                                Auto-renew
                                                            </span>
                                                            <button
                                                                disabled={actionLoading === sub.id}
                                                                onClick={() => {
                                                                    if (effectiveStatus === 'active') {
                                                                        handleCancel(sub.id);
                                                                    } else {
                                                                        handleReactivate(sub.id);
                                                                    }
                                                                }}
                                                                className={cx(
                                                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50",
                                                                    effectiveStatus === 'active' ? "bg-pink-600 shadow-[0_0_8px_rgba(236,72,153,0.5)]" : "bg-zinc-800"
                                                                )}
                                                            >
                                                                <span
                                                                    className={cx(
                                                                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                                        effectiveStatus === 'active' ? "translate-x-4" : "translate-x-0"
                                                                    )}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Actions - View Content button and Triple-dot actions dropdown */}
                                                    <div className="flex items-center gap-3 self-end md:self-auto">
                                                        <button
                                                            onClick={() => router.push(`/profile/${sub.creator_id}`)}
                                                            className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-pink-700 hover:opacity-95 rounded-2xl text-xs font-extrabold text-white shadow-md shadow-pink-500/10 active:scale-95 transition cursor-pointer"
                                                        >
                                                            View Content
                                                        </button>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-2 border border-zinc-800 bg-zinc-950/40 rounded-full hover:border-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200 p-1.5 rounded-2xl w-44">
                                                                {effectiveStatus === 'active' ? (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleCancel(sub.id)}
                                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer rounded-xl font-medium text-xs py-2"
                                                                    >
                                                                        <Ban className="w-4 h-4 mr-2" />
                                                                        Cancel Auto-Renew
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleReactivate(sub.id)}
                                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer rounded-xl font-medium text-xs py-2"
                                                                    >
                                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                                        Enable Auto-Renew
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem
                                                                    onClick={() => router.push(`/profile/${sub.creator_id}`)}
                                                                    className="cursor-pointer rounded-xl font-medium text-xs py-2"
                                                                >
                                                                    <Users className="w-4 h-4 mr-2" />
                                                                    View Profile
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => router.push(`/account/messages?chatWith=${sub.creator_id}`)}
                                                                    className="cursor-pointer rounded-xl font-medium text-xs py-2 text-pink-400"
                                                                >
                                                                    <MessageSquare className="w-4 h-4 mr-2" />
                                                                    Send Message
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Section: Recent Content From Your Subscriptions */}
                            <div className="space-y-4 pt-4 border-t border-zinc-900">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-black text-white">
                                        Recent Content From Your Subscriptions
                                    </h3>
                                    <button 
                                        onClick={() => router.push('/account/subscribed-feed')} 
                                        className="text-xs font-extrabold text-pink-500 hover:underline cursor-pointer"
                                    >
                                        View All
                                    </button>
                                </div>

                                {recentPosts.length === 0 ? (
                                    <div className="text-center py-8 text-zinc-600 text-sm">
                                        No recent media posts available.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 animate-in fade-in duration-300">
                                        {recentPosts.map((post) => {
                                            const isLocked = post.is_paid;
                                            const isVideo = post.content_type === 'video';
                                            const elapsed = getElapsedTime(post.created_at);

                                            return (
                                                <div key={post.id} className="rounded-3xl overflow-hidden border border-zinc-900 bg-zinc-950/40 relative flex flex-col group transition-all duration-300 hover:border-pink-500/20">
                                                    {/* Background Image / Thumbnail with lock overlay */}
                                                    <div className="w-full aspect-[3/4] bg-zinc-900 overflow-hidden relative">
                                                        {post.media_url || post.thumbnail_url ? (
                                                            <img 
                                                                src={post.media_url || post.thumbnail_url} 
                                                                alt="" 
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-pink-500/5 flex items-center justify-center">
                                                                <Sparkles className="w-8 h-8 text-pink-500/20" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/45 pointer-events-none" />

                                                        {/* Top Creator Header info */}
                                                        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                                            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/20 overflow-hidden flex items-center justify-center font-bold text-[9px]">
                                                                {post.profiles?.avatar_url ? (
                                                                    <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    "?"
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-extrabold text-white text-shadow-md">
                                                                {post.profiles?.username || "Creator"}
                                                            </span>
                                                        </div>

                                                        {/* Lock/Unlocked Center Action Ring Overlay */}
                                                        <div className="absolute inset-0 flex items-center justify-center z-10">
                                                            <div className="w-11 h-11 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-sm shadow-md">
                                                                {isLocked ? (
                                                                    <Lock className="w-4.5 h-4.5 text-pink-400" />
                                                                ) : isVideo ? (
                                                                    <Play className="w-4.5 h-4.5 text-emerald-400 fill-emerald-400" />
                                                                ) : (
                                                                    <Sparkles className="w-4.5 h-4.5 text-yellow-400" />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Post timestamp tags at the bottom */}
                                                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-10">
                                                            <span className="text-[9px] text-zinc-300 font-bold bg-black/60 px-2 py-0.5 rounded-full border border-white/5 backdrop-blur-sm">
                                                                {elapsed}
                                                            </span>
                                                            <span className="text-[9px] text-zinc-300 font-bold bg-black/60 px-2 py-0.5 rounded-full border border-white/5 backdrop-blur-sm uppercase tracking-wide">
                                                                {post.content_type || "Photo"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Text content details */}
                                                    <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                                                        <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
                                                            {post.caption || "Exclusive post description for my VIP fans..."}
                                                        </p>
                                                        
                                                        {/* Heart Likes feedback row */}
                                                        <div className="flex items-center gap-1.5 text-pink-500 font-bold text-xs select-none">
                                                            ❤️ <span className="text-zinc-400 text-[11px] font-bold">128</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Section: Promo Support Favor & Top Supporter */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-900">
                                {/* Banner 1: Support Your Favorites */}
                                <div className="rounded-3xl border border-pink-500/15 bg-gradient-to-br from-pink-950/20 via-zinc-950 to-purple-950/20 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden group">
                                    <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
                                    <div className="space-y-3 flex-1 relative">
                                        <h3 className="text-xl font-black text-white">Support Your Favorites</h3>
                                        <p className="text-xs text-zinc-400 max-w-xs leading-normal">
                                            Send tips, gifts and unlock even more exclusive content from your favorite creators.
                                        </p>
                                        <button onClick={() => router.push('/coming-soon')} className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-pink-700 hover:opacity-95 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-pink-500/10 active:scale-95 transition duration-200 cursor-pointer">
                                            Send a Gift
                                        </button>
                                    </div>
                                    
                                    {/* Box Gift with Coins illustration */}
                                    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                                        <div className="absolute w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-3xl bounce-slow flex flex-col justify-between p-2 shadow-lg shadow-pink-500/30 border border-pink-400/20">
                                            <div className="w-full h-2.5 bg-yellow-400 absolute top-1/2 -translate-y-1/2 left-0" />
                                            <div className="w-2.5 h-full bg-yellow-400 absolute left-1/2 -translate-x-1/2 top-0" />
                                            <div className="w-6 h-6 rounded-full bg-yellow-400 absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center justify-center text-[10px] font-bold text-black border border-yellow-500 shadow-md">
                                                🎀
                                            </div>
                                        </div>
                                        {/* CSS coin shapes floating */}
                                        <div className="absolute w-3.5 h-3.5 rounded-full bg-yellow-500 border border-yellow-400 bottom-1 left-2 animate-bounce shadow-md flex items-center justify-center text-[6px]">🪙</div>
                                        <div className="absolute w-3 h-3 rounded-full bg-yellow-500 border border-yellow-400 bottom-3 right-2 animate-bounce shadow-md flex items-center justify-center text-[5px]" style={{animationDelay: '0.4s'}}>🪙</div>
                                    </div>
                                </div>

                                {/* Banner 2: Top Supporter This Month */}
                                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden group">
                                    <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                                    <div className="space-y-3 flex-1 relative">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full">
                                            Top Supporter This Month
                                        </span>
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className="w-11 h-11 rounded-full bg-zinc-800 border-2 border-pink-500/50 flex items-center justify-center font-bold text-zinc-300 overflow-hidden relative shadow-[0_0_8px_rgba(236,72,153,0.3)]">
                                                {currentProfile?.avatar_url ? (
                                                    <img src={currentProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-5 h-5 text-zinc-400" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-white text-sm">
                                                    {currentProfile?.username || "TopFan"} <span className="text-[9px] font-extrabold text-pink-400 bg-pink-500/10 px-1 py-0.5 rounded-md border border-pink-500/20">VIP</span>
                                                </div>
                                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                                    You've sent <span className="text-emerald-400 font-extrabold">$245.00</span> in tips and gifts this month
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => router.push('/coming-soon')} className="px-5 py-2.5 bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-300 hover:text-white rounded-2xl font-extrabold text-xs transition duration-200 flex items-center gap-2 mt-2 cursor-pointer">
                                            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                                            View Leaderboard
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── PERSPECTIVE 2: CREATOR MY SUBSCRIBERS ── */}
                    {activeTab === "subscribers" && isCreator && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            
                            {/* Analytics dashboard row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
                                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl" />
                                    <div className="flex items-center gap-2 text-pink-400 mb-2">
                                        <Users className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Total Subscribers</span>
                                    </div>
                                    <h3 className="text-3xl font-extrabold text-white">{subscribers.length}</h3>
                                    <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
                                        <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                                        <span className="text-zinc-400">{subscribers.filter(s => getEffectiveStatus(s) === 'active').length} active</span>
                                        <span>•</span>
                                        <span>{subscribers.filter(s => getEffectiveStatus(s) === 'cancelled').length} pending cancel</span>
                                    </div>
                                </div>

                                <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
                                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Estimated MRR</span>
                                    </div>
                                    <h3 className="text-3xl font-extrabold text-white">{fp(estimatedMrr)}</h3>
                                    <p className="text-[11px] text-zinc-400 mt-2">
                                        Monthly recurring projection based on active members
                                    </p>
                                </div>

                                <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
                                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
                                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Active Rates</span>
                                    </div>
                                    <div className="space-y-1 mt-1">
                                        <div className="text-sm font-bold text-white flex justify-between">
                                            <span className="text-zinc-500 text-xs">Weekly:</span>
                                            <span className="text-pink-400">{creatorWeeklyPrice > 0 ? fp(creatorWeeklyPrice) : "Disabled"}</span>
                                        </div>
                                        <div className="text-sm font-bold text-white flex justify-between">
                                            <span className="text-zinc-500 text-xs">Monthly:</span>
                                            <span className="text-purple-400">{creatorMonthlyPrice > 0 ? fp(creatorMonthlyPrice) : "Disabled"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Search bar and Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search subscribers..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-black/40 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50 transition"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="bg-black/60 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                                    >
                                        <option value="all">Statuses (All)</option>
                                        <option value="active">Active</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                    <select
                                        value={tierFilter}
                                        onChange={(e) => setTierFilter(e.target.value)}
                                        className="bg-black/60 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                                    >
                                        <option value="all">Plans (All)</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                            </div>

                            {/* Table List of Subscribers */}
                            {filteredSubscribers.length === 0 ? (
                                <div className="text-center p-12 border border-zinc-850 rounded-3xl bg-zinc-950/20 max-w-sm mx-auto">
                                    <p className="text-zinc-500 text-sm">No matching subscribers found.</p>
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-zinc-850 bg-zinc-950/40 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead>
                                                <tr className="border-b border-zinc-850 bg-white/5 text-zinc-400 font-bold text-xs uppercase tracking-wider">
                                                    <th className="py-4 px-6">Subscriber</th>
                                                    <th className="py-4 px-6">Tier Plan</th>
                                                    <th className="py-4 px-6">Status</th>
                                                    <th className="py-4 px-6">Billing End Date</th>
                                                    <th className="py-4 px-6 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-850">
                                                {filteredSubscribers.map((sub) => {
                                                    const fanName = sub.user?.full_name || sub.user?.username || "Subscriber";
                                                    const avatar = sub.user?.avatar_url || "";
                                                    const initial = fanName[0] || "?";
                                                    const effectiveStatus = getEffectiveStatus(sub);

                                                    return (
                                                        <tr key={sub.id} className="hover:bg-white/5 transition duration-200">
                                                            <td className="py-4 px-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center font-bold text-xs text-zinc-400 border border-zinc-800">
                                                                        {avatar ? (
                                                                            <img src={avatar} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            initial
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-extrabold text-white text-xs hover:text-pink-400 cursor-pointer" onClick={() => router.push(`/profile/${sub.user_id}`)}>
                                                                            {fanName}
                                                                        </div>
                                                                        <p className="text-[10px] text-zinc-500">@{sub.user?.username}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-6">
                                                                <span className={cx(
                                                                    "text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                                                                    sub.tier === 'weekly' 
                                                                        ? "border-violet-500/20 bg-violet-500/10 text-violet-300"
                                                                        : "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                                                                )}>
                                                                    {sub.tier}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-6">
                                                                {effectiveStatus === 'active' && (
                                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 uppercase tracking-wider inline-flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                        Active
                                                                    </span>
                                                                )}
                                                                {effectiveStatus === 'cancelled' && (
                                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 uppercase tracking-wider">
                                                                        Cancelled
                                                                    </span>
                                                                )}
                                                                {effectiveStatus === 'expired' && (
                                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 uppercase tracking-wider">
                                                                        Expired
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-4 px-6 text-zinc-400 text-xs font-semibold">
                                                                {formatDate(sub.current_period_end)}
                                                            </td>
                                                            <td className="py-4 px-6 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => router.push(`/account/messages?chatWith=${sub.user_id}`)}
                                                                        className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-pink-400 hover:border-pink-500/20 rounded-xl transition duration-200 cursor-pointer"
                                                                        title="Message Subscriber"
                                                                    >
                                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => router.push(`/profile/${sub.user_id}`)}
                                                                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
                                                                    >
                                                                        Profile
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PERSPECTIVE 3: CREATOR PRICING SETTINGS ── */}
                    {activeTab === "settings" && isCreator && currentUser && (
                        <div className="animate-in fade-in duration-300">
                            <SubscriptionSettings user={currentUser} />
                        </div>
                    )}

                </main>
            </div>

            {/* Inline Re-subscribe Modal Hook */}
            {resubscribeCreator && (
                <SubscriptionModal
                    isOpen={!!resubscribeCreator}
                    onClose={() => setResubscribeCreator(null)}
                    creator={resubscribeCreator}
                    currentUserId={currentUser?.id}
                    onSuccess={() => {
                        setResubscribeCreator(null);
                        fetchData(); // Refresh subscription list
                    }}
                />
            )}
        </div>
    );
}
