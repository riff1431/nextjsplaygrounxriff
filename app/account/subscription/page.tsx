"use client";

import React, { useEffect, useState } from "react";
import { Users, Crown, ChevronRight, Zap, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import SubscriptionSettings from "@/components/creator/SubscriptionSettings";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_24px_rgba(236,72,153,0.14),0_0_56px_rgba(59,130,246,0.08)]",
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
        full_name: string;
        avatar_url: string;
    };
};

export default function SubscriptionsPage() {
    const supabase = createClient();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isCreator, setIsCreator] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                setUser(user);

                // Check profile role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'creator') {
                    setIsCreator(true);
                }

                // Fetch subscriptions
                // Note: The previous query used 'subscription_plans' joined table which doesn't exist in my new schema.
                // Resetting to use the new schema: 'subscriptions' table with 'creator:profiles(...)'
                const { data: subs, error: subError } = await supabase
                    .from("subscriptions")
                    .select(`
                        id,
                        status,
                        current_period_end,
                        tier,
                        creator:profiles!creator_id (
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq("user_id", user.id);

                if (subError) {
                    console.error("Error fetching subscriptions:", subError);
                } else {
                    setSubscriptions(subs as any || []);
                }
            } catch (err) {
                console.error("Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const handleManage = (subId: string) => {
        alert("Manage subscription feature coming soon!");
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20 lg:pb-6">
            <div className="max-w-3xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-400" />
                    Subscriptions
                </h1>

                {/* Creator Settings Section */}
                {isCreator && user && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-pink-400 font-semibold border-b border-white/10 pb-2">
                            <Crown className="w-5 h-5" />
                            <span>Creator Management</span>
                        </div>
                        <SubscriptionSettings user={user} />
                    </div>
                )}

                {/* Active Subs */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 font-semibold border-b border-white/10 pb-2">
                        <Zap className="w-5 h-5" />
                        <span>Your Active Subscriptions</span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                        </div>
                    ) : subscriptions.length === 0 ? (
                        <div className="text-center p-8 border border-white/10 rounded-2xl bg-white/5">
                            <p className="text-gray-400">You don't have any active subscriptions.</p>
                        </div>
                    ) : (
                        subscriptions.map((sub) => {
                            const color = "pink";
                            const tier = sub.tier;
                            const creatorName = sub.creator?.full_name || "Unknown Creator";
                            const avatar = sub.creator?.avatar_url || "";
                            const initial = creatorName[0] || "?";

                            return (
                                <NeonCard key={sub.id} className="p-4 flex items-center justify-between group hover:border-white/30 transition">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full bg-${color}-600/20 border border-${color}-500/50 flex items-center justify-center text-${color}-300 font-bold text-lg overflow-hidden`}>
                                            {avatar ? (
                                                <img src={avatar} alt={creatorName} className="w-full h-full object-cover" />
                                            ) : (
                                                initial
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white flex items-center gap-2">
                                                {creatorName}
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border border-${color}-500/30 bg-${color}-500/10 text-${color}-300 uppercase`}>
                                                    {tier}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Renews {formatDate(sub.current_period_end)}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleManage(sub.id)}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition flex items-center gap-1 text-gray-300 hover:text-white"
                                    >
                                        Manage <ChevronRight className="w-4 h-4" />
                                    </button>
                                </NeonCard>
                            );
                        })
                    )}
                </div>

                {/* Discovery Promo */}
                <div className="mt-8 rounded-2xl bg-gradient-to-r from-pink-900/20 to-blue-900/20 border border-white/10 p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Discover more Creators</h3>
                        <p className="text-sm text-gray-400">Find your next favorite vibe.</p>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-pink-600 to-blue-600 rounded-xl font-bold text-white shadow-lg hover:opacity-90 transition">
                        Explore Hub
                    </button>
                </div>
            </div>
        </div>
    );
}
