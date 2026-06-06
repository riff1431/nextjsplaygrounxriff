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
    Search,
    Calendar,
    Activity,
    Sparkles,
    UserCheck,
    Compass,
    Lock,
    Play,
    Gift,
    Percent,
    Gem,
    Check,
    MoreVertical,
    MessageCircle,
    Bell,
    Star,
    LogOut,
    ArrowLeft,
    LayoutGrid,
    RefreshCw,
    Flame,
    Dices,
    Radio
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";
import { NotificationIcon } from "@/components/common/NotificationIcon";
import ProfileMenu from "@/components/navigation/ProfileMenu";
import BrandLogo from "@/components/common/BrandLogo";
import PostCard from "@/components/posts/PostCard";
import { DynamicIcon } from "@/components/admin/settings/IframeMenuManager";
import { fp } from "@/utils/currency";

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
    creator_id: string;
    creator: {
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

export default function FeedPage() {
    const supabase = createClient();
    const router = useRouter();
    const { user: currentUser, role: userRole, isLoading: authLoading } = useAuth();
    const { roomSettings: activeStatuses } = useTheme();

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [iframeMenus, setIframeMenus] = useState<any[]>([]);
    const casinoMenu = iframeMenus.find(m => m.name.toLowerCase().includes("casino"));
    const otherIframeMenus = iframeMenus.filter(m => !m.name.toLowerCase().includes("casino"));
    const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(new Set());
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentProfile, setCurrentProfile] = useState<any>(null);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);

    // Header specific personalization states
    const [userAccountType, setUserAccountType] = useState<any>(null);
    const [membershipPlan, setMembershipPlan] = useState<any>(null);
    const [fanTier, setFanTier] = useState<BadgeTier>("Bronze");
    const [revealWelcome, setRevealWelcome] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Trigger reveal welcome transition on mount
    useEffect(() => {
        const t = window.setTimeout(() => setRevealWelcome(true), 120);
        return () => window.clearTimeout(t);
    }, []);

    const fetchData = async () => {
        if (!currentUser) return;
        try {
            setLoading(true);

            // Fetch profile and check role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name, avatar_url, username, fan_membership_id, account_type_id')
                .eq('id', currentUser.id)
                .single();

            if (profile) {
                setCurrentProfile(profile);

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
                    creator_id,
                    creator:profiles!creator_id (
                        id,
                        full_name,
                        avatar_url,
                        username
                    )
                `)
                .eq("user_id", currentUser.id);

            if (subError) {
                console.error("Error fetching subscriptions:", subError);
            } else {
                // Filter active subscriptions (status active or period end not yet reached)
                const activeSubs = (subs || []).filter(sub => {
                    const isExpired = new Date(sub.current_period_end) < new Date();
                    return sub.status === 'active' || !isExpired;
                });

                // De-duplicate active subscriptions by creator_id
                const uniqueMap = new Map<string, any>();
                activeSubs.forEach(sub => {
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

                const ids = deduplicated.map((s: any) => s.creator_id);
                setSubscribedCreatorIds(new Set(ids));

                if (ids.length > 0) {
                    // Fetch posts from these creators
                    const { data: postsData, error: postsError } = await supabase
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
                        .in("user_id", ids)
                        .order("created_at", { ascending: false });

                    if (!postsError && postsData) {
                        // Map profiles to profile as expected by PostCard
                        const mapped = postsData.map(p => ({
                            ...p,
                            profile: p.profiles
                        }));
                        setPosts(mapped as any);
                    }
                } else {
                    setPosts([]);
                }
            }
        } catch (err) {
            console.error("Error fetching feed data:", err);
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
            .channel("realtime-subscribed-feed-iframe-menus")
            .on("postgres_changes", { event: "*", schema: "public", table: "iframe_menus" }, () => {
                fetchIframeMenus();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const firstName = userRole === "creator"
        ? "Creator"
        : (currentProfile?.full_name?.split(" ")[0] || currentUser?.user_metadata?.full_name?.split(" ")[0] || currentProfile?.username || currentUser?.user_metadata?.username || "Fan");

    const showTierBadge = userRole !== "creator";
    const tierLabel = fanTier === "VIP" ? "VIP" : fanTier;

    const CATS = [
        { label: "Flash Drops", key: "drops", icon: <Sparkles className="w-4 h-4" />, tone: "blue", route: "/rooms/flash-drop-sessions", roomType: "flash-drop" },
        { label: "Confessions", key: "conf", icon: <Lock className="w-4 h-4" />, tone: "red", route: "/rooms/confessions-browse", roomType: "confessions" },
        { label: "X Chat", key: "xchat", icon: <MessageCircle className="w-4 h-4" />, tone: "yellow", route: "/rooms/x-chat-sessions", roomType: "x-chat" },
        { label: "Bar Lounge", key: "bar", icon: <BarDrinkIcon className="w-4 h-4" />, tone: "purple", route: "/rooms/bar-lounge", roomType: "bar-lounge" },
        { label: "Truth or Dare", key: "truth", icon: <MessageCircle className="w-4 h-4" />, tone: "green", route: "/rooms/truth-or-dare-sessions", roomType: "truth-or-dare" },
        { label: "Suga 4 U", key: "suga4u", icon: <Crown className="w-4 h-4" />, tone: "pink", primary: true, route: "/rooms/suga4u-sessions", roomType: "suga-4-u" },
        { label: "All Live Rooms", key: "alllive", icon: <Radio className="w-4 h-4" />, tone: "blue", route: "/rooms/all-live", roomType: "all-live" },
    ];

    // Filter posts dynamically on the client
    const filteredPosts = posts.filter(post => {
        if (selectedCreatorId && post.user_id !== selectedCreatorId) {
            return false;
        }
        if (searchQuery) {
            const captionMatch = (post.caption || "").toLowerCase().includes(searchQuery.toLowerCase());
            const creatorMatch = (post.profile?.full_name || post.profile?.username || "").toLowerCase().includes(searchQuery.toLowerCase());
            return captionMatch || creatorMatch;
        }
        return true;
    });

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
                            placeholder="Search feed content…"
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
                            onSignOut={async () => { await supabase.auth.signOut(); router.push("/"); }}
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
                                            const t = toneClasses(cat.tone as any);
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
                                                            <span className={t.icon}>{cat.icon}</span>
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
                                    <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition cursor-pointer" onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}>
                                        <LogOut className="w-4 h-4" /> Log Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Main Content Area ── */}
                <main className="flex-1 space-y-8 min-w-0 max-w-3xl mx-auto">
                    
                    {/* Header Details */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                                <LayoutGrid className="w-7 h-7 text-pink-500" />
                                Subscribed Creator Feed
                            </h2>
                            <p className="text-zinc-400 text-xs sm:text-sm">
                                Exclusive updates, photos, and videos from creators you follow
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-20 space-y-4">
                            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                            <p className="text-zinc-500 text-sm font-semibold">Generating your custom feed...</p>
                        </div>
                    ) : subscriptions.length === 0 ? (
                        /* Empty State when no subscriptions are active */
                        <div className="text-center p-12 border border-zinc-800 rounded-3xl bg-zinc-950/20 max-w-md mx-auto space-y-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute -inset-12 blur-3xl bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.1),transparent_70%)] pointer-events-none" />
                            <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto text-pink-500 pulse-pink-ring">
                                <Compass className="w-8 h-8 animate-pulse" />
                            </div>
                            <div className="space-y-2 relative z-10">
                                <h3 className="text-xl font-black text-white">Your Feed is Quiet</h3>
                                <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
                                    You aren't subscribed to any premium creators yet. Explore our top stars to unlock photos, videos, and custom feeds!
                                </p>
                            </div>
                            <div className="pt-2 relative z-10 flex flex-col gap-3">
                                <button
                                    onClick={() => router.push('/home')}
                                    className="w-full py-3 bg-gradient-to-r from-pink-600 to-pink-700 hover:opacity-95 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-pink-500/20 transition transform active:scale-[0.98] cursor-pointer"
                                >
                                    Explore Top Creators
                                </button>
                                <button
                                    onClick={() => router.push('/account/subscription')}
                                    className="w-full py-3 border border-zinc-800 hover:bg-zinc-900/50 text-zinc-300 font-bold text-sm rounded-2xl transition cursor-pointer"
                                >
                                    Manage Subscriptions
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            
                            {/* Stories-Style Horizontal Creator Filter Row */}
                            <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-4 space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-1">
                                    Filter Feed By Creator
                                </h4>
                                <div className="flex gap-4 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-zinc-800">
                                    {/* "ALL" Creator bubble */}
                                    <button 
                                        onClick={() => setSelectedCreatorId(null)}
                                        className="flex flex-col items-center gap-1.5 shrink-0 select-none group cursor-pointer focus:outline-none"
                                    >
                                        <div className={cx(
                                            "w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300",
                                            !selectedCreatorId 
                                                ? "border-pink-500 bg-pink-500/10 shadow-[0_0_12px_rgba(236,72,153,0.3)] ring-2 ring-pink-500/50 scale-105" 
                                                : "border-zinc-800 bg-zinc-900/50 group-hover:border-zinc-700"
                                        )}>
                                            <Sparkles className={cx("w-5 h-5", !selectedCreatorId ? "text-pink-400 animate-pulse" : "text-zinc-500")} />
                                        </div>
                                        <span className={cx(
                                            "text-[10px] tracking-wide",
                                            !selectedCreatorId ? "text-pink-400 font-extrabold" : "text-zinc-500 font-bold"
                                        )}>
                                            All Posts
                                        </span>
                                    </button>

                                    {/* Individual Creator stories bubbles */}
                                    {subscriptions.map((sub) => {
                                        const creator = sub.creator;
                                        const creatorName = creator?.full_name || creator?.username || "Creator";
                                        const avatar = creator?.avatar_url || "";
                                        const isSelected = selectedCreatorId === creator?.id;
                                        const initial = creatorName[0] || "?";

                                        return (
                                            <button 
                                                key={sub.id}
                                                onClick={() => setSelectedCreatorId(creator?.id || null)}
                                                className="flex flex-col items-center gap-1.5 shrink-0 select-none group cursor-pointer focus:outline-none"
                                                title={`Filter content from ${creatorName}`}
                                            >
                                                <div className={cx(
                                                    "w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border font-bold text-sm text-white transition-all duration-300",
                                                    isSelected 
                                                        ? "border-pink-500 ring-2 ring-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.4)] scale-105" 
                                                        : "border-zinc-800 group-hover:border-zinc-700 opacity-80 group-hover:opacity-100"
                                                )}>
                                                    {avatar ? (
                                                        <img src={avatar} alt={creatorName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        initial
                                                    )}
                                                </div>
                                                <span className={cx(
                                                    "text-[10px] tracking-wide truncate max-w-[70px]",
                                                    isSelected ? "text-pink-400 font-extrabold" : "text-zinc-500 font-bold"
                                                )}>
                                                    {creator?.username || creatorName}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Feed Posts Stack */}
                            <div className="space-y-6">
                                {filteredPosts.length === 0 ? (
                                    <div className="text-center py-16 border border-zinc-900 rounded-3xl bg-zinc-950/20 space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto text-zinc-600">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        <h4 className="text-sm font-extrabold text-white">No content matches filter</h4>
                                        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                                            This creator hasn't uploaded any media posts matching this search criteria yet.
                                        </p>
                                    </div>
                                ) : (
                                    filteredPosts.map((post) => (
                                        <div key={post.id} className="animate-in fade-in slide-in-from-y-3 duration-300">
                                            <PostCard
                                                post={post}
                                                user={post.profiles as any}
                                                currentUserId={currentUser?.id || null}
                                                isSubscribed={post.user_id ? subscribedCreatorIds.has(post.user_id) : false}
                                                onPostDeleted={() => setPosts(prev => prev.filter(x => x.id !== post.id))}
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
