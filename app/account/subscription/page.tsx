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
    Compass
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

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function GlassCard({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-md transition-all duration-300 hover:border-white/20",
                glow && "hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] hover:border-pink-500/30",
                className
            )}
        >
            {children}
        </div>
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

export default function SubscriptionsPage() {
    const supabase = createClient();
    const router = useRouter();

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [isCreator, setIsCreator] = useState(false);
    
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

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;
            setUser(currentUser);

            // Fetch profile and check role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, subscription_price_weekly, subscription_price_monthly')
                .eq('id', currentUser.id)
                .single();

            if (profile) {
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
                setSubscriptions(subs as any || []);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const handleCancel = async (subId: string) => {
        if (!confirm("Are you sure you want to cancel this subscription? You will lose access at the end of the billing period.")) return;

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

    const estimatedMrr = calculateMRR();

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-24 lg:pb-8">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                
                {/* Sleek Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 flex items-center gap-3">
                            <Users className="w-8 h-8 text-pink-500 animate-pulse" />
                            Subscriptions Hub
                        </h1>
                        <p className="text-gray-400 text-sm md:text-base">
                            View active creator memberships, track subscription billing, and manage your subscriber community.
                        </p>
                    </div>

                    {/* Quick navigation settings for creators */}
                    {isCreator && (
                        <div className="flex p-1 bg-zinc-900 border border-white/5 rounded-2xl self-start md:self-auto">
                            <button
                                onClick={() => { setActiveTab("subscriptions"); setSearchQuery(""); setStatusFilter("all"); setTierFilter("all"); }}
                                className={cx(
                                    "px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-300 flex items-center gap-2",
                                    activeTab === "subscriptions"
                                        ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/10"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                                )}
                            >
                                <Zap className="w-3.5 h-3.5" />
                                Subscriptions
                            </button>
                            <button
                                onClick={() => { setActiveTab("subscribers"); setSearchQuery(""); setStatusFilter("all"); setTierFilter("all"); }}
                                className={cx(
                                    "px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-300 flex items-center gap-2",
                                    activeTab === "subscribers"
                                        ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/10"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                                )}
                            >
                                <Crown className="w-3.5 h-3.5" />
                                Subscribers
                            </button>
                            <button
                                onClick={() => { setActiveTab("settings"); setSearchQuery(""); }}
                                className={cx(
                                    "px-4 py-2 rounded-xl font-semibold text-xs transition-all duration-300 flex items-center gap-2",
                                    activeTab === "settings"
                                        ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/10"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                                )}
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                Pricing
                            </button>
                        </div>
                    )}
                </div>

                {/* Creator Analytics Panel */}
                {activeTab === "subscribers" && isCreator && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        {/* Metric 1: Total Subscribers */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 backdrop-blur-md p-6">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2.5 text-pink-400 mb-2">
                                <Users className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider text-pink-400/90">Total Subscribers</span>
                            </div>
                            <h3 className="text-3xl font-extrabold text-white">{subscribers.length}</h3>
                            <div className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5 font-medium">
                                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                <span className="text-zinc-300">{subscribers.filter(s => getEffectiveStatus(s) === 'active').length} active</span>
                                <span className="text-zinc-600">•</span>
                                <span className="text-zinc-400">{subscribers.filter(s => getEffectiveStatus(s) === 'cancelled').length} pending cancel</span>
                            </div>
                        </div>

                        {/* Metric 2: Estimated MRR */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 backdrop-blur-md p-6">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/90">Estimated MRR</span>
                            </div>
                            <h3 className="text-3xl font-extrabold text-white">{fp(estimatedMrr)}</h3>
                            <p className="text-[11px] text-zinc-400 mt-2">
                                Gross monthly projection based on active members
                            </p>
                        </div>

                        {/* Metric 3: Active Rates */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 backdrop-blur-md p-6">
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
                            <div className="flex items-center gap-2.5 text-blue-400 mb-2">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-400/90">Active Rates</span>
                            </div>
                            <div className="space-y-1 mt-1">
                                <div className="text-sm font-bold text-white flex justify-between">
                                    <span className="text-zinc-400 text-xs">Weekly:</span>
                                    <span className="text-pink-400">{creatorWeeklyPrice > 0 ? fp(creatorWeeklyPrice) : "Disabled"}</span>
                                </div>
                                <div className="text-sm font-bold text-white flex justify-between">
                                    <span className="text-zinc-400 text-xs">Monthly:</span>
                                    <span className="text-purple-400">{creatorMonthlyPrice > 0 ? fp(creatorMonthlyPrice) : "Disabled"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filtering and Search Section */}
                {activeTab !== "settings" && (
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-zinc-950/40 border border-white/5 rounded-2xl p-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                            <input
                                type="text"
                                placeholder={activeTab === "subscriptions" ? "Search creators..." : "Search subscribers..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50 transition duration-200"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold">
                                <Filter className="w-3.5 h-3.5" />
                                <span>Filter:</span>
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/50 transition cursor-pointer"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="expired">Expired</option>
                            </select>

                            <select
                                value={tierFilter}
                                onChange={(e) => setTierFilter(e.target.value)}
                                className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500/50 transition cursor-pointer"
                            >
                                <option value="all">All Tiers</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Subscriptions Grid Tab (Fan View) */}
                {activeTab === "subscriptions" && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-16 space-y-4">
                                <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
                                <p className="text-zinc-500 text-sm font-semibold">Loading subscriptions...</p>
                            </div>
                        ) : filteredSubscriptions.length === 0 ? (
                            <div className="text-center p-12 border border-white/10 rounded-3xl bg-zinc-950/20 backdrop-blur-sm max-w-lg mx-auto space-y-4">
                                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                                    <Compass className="w-6 h-6 animate-pulse" />
                                </div>
                                <h3 className="text-lg font-bold text-white">No memberships found</h3>
                                <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                                    {searchQuery || statusFilter !== "all" || tierFilter !== "all" 
                                        ? "No subscriptions match your current filter preferences." 
                                        : "You don't have any active memberships. Discover premium creators to unlock exclusive content!"}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                                {filteredSubscriptions.map((sub) => {
                                    const creatorName = sub.creator?.full_name || sub.creator?.username || "Premium Creator";
                                    const avatar = sub.creator?.avatar_url || "";
                                    const initial = creatorName[0] || "?";
                                    const effectiveStatus = getEffectiveStatus(sub);
                                    
                                    // Custom colors for tiers
                                    const tierColors = sub.tier === 'weekly' 
                                        ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                                        : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";

                                    return (
                                        <GlassCard key={sub.id} className="p-5 flex flex-col justify-between h-48 relative overflow-hidden group border border-white/10" glow={effectiveStatus === 'active'}>
                                            {/* Glow overlay */}
                                            {effectiveStatus === 'active' && (
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-pink-500/10 to-transparent rounded-bl-full pointer-events-none" />
                                            )}

                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-4">
                                                    {/* Avatar with status glow ring */}
                                                    <div className={cx(
                                                        "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden border-2 relative",
                                                        effectiveStatus === 'active' ? "border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "border-zinc-700 bg-zinc-900 text-zinc-400"
                                                    )}>
                                                        {avatar ? (
                                                            <img src={avatar} alt={creatorName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            initial
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-extrabold text-white flex items-center gap-2 group-hover:text-pink-400 transition duration-200">
                                                            {creatorName}
                                                        </h3>
                                                        <p className="text-zinc-500 text-xs mt-0.5">@{sub.creator?.username}</p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1.5">
                                                    <span className={cx("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", tierColors)}>
                                                        {sub.tier}
                                                    </span>
                                                    
                                                    {/* Custom glowing status badges */}
                                                    {effectiveStatus === 'active' && (
                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                                            Active
                                                        </span>
                                                    )}
                                                    {effectiveStatus === 'cancelled' && (
                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 uppercase tracking-wider">
                                                            Pending Cancel
                                                        </span>
                                                    )}
                                                    {effectiveStatus === 'expired' && (
                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 uppercase tracking-wider">
                                                            Expired
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-end border-t border-white/5 pt-4 mt-2">
                                                <div className="text-[11px] text-zinc-400 font-medium">
                                                    <span className="text-zinc-500 mr-1">
                                                        {effectiveStatus === 'expired' ? "Expired on:" : effectiveStatus === 'cancelled' ? "Ends on:" : "Renews on:"}
                                                    </span>
                                                    {formatDate(sub.current_period_end)}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Expired / Cancelled & Expired get a Direct Re-Subscribe action */}
                                                    {effectiveStatus === 'expired' ? (
                                                        <button
                                                            onClick={() => {
                                                                // Convert to correct Profile format for modal
                                                                setResubscribeCreator({
                                                                    id: sub.creator_id,
                                                                    full_name: sub.creator?.full_name,
                                                                    username: sub.creator?.username,
                                                                    avatar_url: sub.creator?.avatar_url,
                                                                    subscription_price_weekly: sub.creator?.subscription_price_weekly,
                                                                    subscription_price_monthly: sub.creator?.subscription_price_monthly
                                                                });
                                                            }}
                                                            className="px-3.5 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 rounded-xl text-xs font-bold text-white shadow-lg transition duration-200"
                                                        >
                                                            Renew Subscription
                                                        </button>
                                                    ) : (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button 
                                                                    disabled={actionLoading === sub.id}
                                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-zinc-300 hover:text-white"
                                                                >
                                                                    {actionLoading === sub.id ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : (
                                                                        "Manage"
                                                                    )}
                                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200 p-1.5 rounded-2xl w-44">
                                                                {effectiveStatus === 'active' && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleCancel(sub.id)}
                                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer rounded-xl font-medium text-xs py-2"
                                                                    >
                                                                        <Ban className="w-4 h-4 mr-2" />
                                                                        Cancel Subscription
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {effectiveStatus === 'cancelled' && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleReactivate(sub.id)}
                                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer rounded-xl font-medium text-xs py-2"
                                                                    >
                                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                                        Reactivate Sub
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
                                                    )}
                                                </div>
                                            </div>
                                        </GlassCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Subscribers List Tab (Creator View) */}
                {activeTab === "subscribers" && isCreator && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-16 space-y-4">
                                <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
                                <p className="text-zinc-500 text-sm font-semibold">Loading subscribers...</p>
                            </div>
                        ) : filteredSubscribers.length === 0 ? (
                            <div className="text-center p-12 border border-white/10 rounded-3xl bg-zinc-950/20 backdrop-blur-sm max-w-lg mx-auto space-y-4">
                                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                                    <Users className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white">No subscribers found</h3>
                                <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                                    {searchQuery || statusFilter !== "all" || tierFilter !== "all" 
                                        ? "No subscriber records match your current filter parameters." 
                                        : "You don't have any subscribers yet. Post content and promote your profile to start earning!"}
                                </p>
                            </div>
                        ) : (
                            <GlassCard className="overflow-hidden border border-white/10">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/5 text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                                                <th className="py-4 px-6">Subscriber</th>
                                                <th className="py-4 px-6">Tier</th>
                                                <th className="py-4 px-6">Status</th>
                                                <th className="py-4 px-6">End / Renewal Date</th>
                                                <th className="py-4 px-6 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredSubscribers.map((sub) => {
                                                const fanName = sub.user?.full_name || sub.user?.username || "PlayGroundX Fan";
                                                const avatar = sub.user?.avatar_url || "";
                                                const initial = fanName[0] || "?";
                                                const effectiveStatus = getEffectiveStatus(sub);

                                                return (
                                                    <tr key={sub.id} className="hover:bg-white/5 transition duration-200">
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-zinc-300">
                                                                    {avatar ? (
                                                                        <img src={avatar} alt={fanName} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        initial
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-white hover:text-pink-400 transition cursor-pointer" onClick={() => router.push(`/profile/${sub.user_id}`)}>
                                                                        {fanName}
                                                                    </div>
                                                                    <div className="text-zinc-500 text-xs">@{sub.user?.username}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className={cx(
                                                                "text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider",
                                                                sub.tier === 'weekly' 
                                                                    ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                                                                    : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                                                            )}>
                                                                {sub.tier}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            {effectiveStatus === 'active' && (
                                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 uppercase tracking-wider inline-flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                    Active
                                                                </span>
                                                            )}
                                                            {effectiveStatus === 'cancelled' && (
                                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 uppercase tracking-wider">
                                                                    Cancelled
                                                                </span>
                                                            )}
                                                            {effectiveStatus === 'expired' && (
                                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 uppercase tracking-wider">
                                                                    Expired
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-zinc-400 text-xs font-semibold">
                                                            {formatDate(sub.current_period_end)}
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <div className="flex items-center justify-end gap-3">
                                                                <button
                                                                    onClick={() => router.push(`/account/messages?chatWith=${sub.user_id}`)}
                                                                    className="p-2 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-pink-400 hover:border-pink-500/30 rounded-xl transition duration-200"
                                                                    title="Message Subscriber"
                                                                >
                                                                    <MessageSquare className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/profile/${sub.user_id}`)}
                                                                    className="px-3 py-1.5 bg-zinc-900 border border-white/5 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition duration-200"
                                                                >
                                                                    View Profile
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        )}
                    </div>
                )}

                {/* Settings Tab (Creator View) */}
                {activeTab === "settings" && isCreator && user && (
                    <div className="animate-in fade-in duration-300">
                        <SubscriptionSettings user={user} />
                    </div>
                )}

                {/* Discovery CTA: Rendered on fan view if no subscriptions exist or simply at the bottom as a promo */}
                {activeTab === "subscriptions" && (
                    <div className="mt-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-900/15 via-zinc-900/40 to-blue-900/15 border border-white/10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
                        <div className="space-y-1.5 relative">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Compass className="w-5 h-5 text-pink-400 animate-spin-slow" />
                                Discover more premium creators
                            </h3>
                            <p className="text-sm text-zinc-400 max-w-md">
                                Explore profiles, support talented creators, and unlock full access to exclusive posts, chatrooms, and media drops.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/home')}
                            className="px-6 py-3 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-pink-500/10 hover:shadow-pink-500/25 hover:opacity-90 active:scale-95 transition duration-200 whitespace-nowrap self-start md:self-auto"
                        >
                            Explore Hub
                        </button>
                    </div>
                )}

                {/* Inline Re-subscribe Modal Hook */}
                {resubscribeCreator && (
                    <SubscriptionModal
                        isOpen={!!resubscribeCreator}
                        onClose={() => setResubscribeCreator(null)}
                        creator={resubscribeCreator}
                        currentUserId={user?.id}
                        onSuccess={() => {
                            setResubscribeCreator(null);
                            fetchData(); // Refresh subscription list
                        }}
                    />
                )}
            </div>
        </div>
    );
}
