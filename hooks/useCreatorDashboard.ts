"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface DashboardStats {
    tipsEarned: number;
    giftsCount: number;
    totalFollowers: number;
    activeRooms: number;
    subscribers: number;
    subscriptionEarnings: number;
}

interface RecentRoom {
    id: string;
    title: string | null;
    type: string | null;
    status: string;
    created_at: string;
}

interface CreatorProfile {
    username: string | null;
    avatar_url: string | null;
    subscription_price_weekly: number | null;
    subscription_price_monthly: number | null;
}

interface CreatorDashboardData {
    profile: CreatorProfile | null;
    stats: DashboardStats;
    recentRooms: RecentRoom[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    saveSubscriptionPrices: (weekly: string, monthly: string) => Promise<boolean>;
}

export function useCreatorDashboard(): CreatorDashboardData {
    const { user } = useAuth();
    const supabase = createClient();

    const [profile, setProfile] = useState<CreatorProfile | null>(null);
    const [stats, setStats] = useState<DashboardStats>({
        tipsEarned: 0,
        giftsCount: 0,
        totalFollowers: 0,
        activeRooms: 0,
        subscribers: 0,
        subscriptionEarnings: 0,
    });
    const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async () => {
        if (!user?.id) return;

        try {
            setIsLoading(true);
            setError(null);

            // 1. Fetch profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("username, avatar_url, subscription_price_weekly, subscription_price_monthly")
                .eq("id", user.id)
                .single();

            if (profileData) {
                setProfile(profileData);
            }

            // 2. Fetch creator's room IDs
            const { data: allRooms } = await supabase
                .from("rooms")
                .select("id, title, type, status, created_at")
                .eq("host_id", user.id)
                .order("created_at", { ascending: false });

            const roomIds = (allRooms || []).map((r) => r.id);
            setRecentRooms((allRooms || []).slice(0, 10));

            // 3. Count active rooms
            const activeRooms = (allRooms || []).filter((r) => r.status === "live").length;

            // 4. Count followers
            const { count: followersCount } = await supabase
                .from("followers")
                .select("id", { count: "exact", head: true })
                .eq("following_id", user.id);

            // Also check the 'follows' table
            const { count: followsCount } = await supabase
                .from("follows")
                .select("id", { count: "exact", head: true })
                .eq("following_id", user.id);

            const totalFollowers = (followersCount || 0) + (followsCount || 0);

            // 5. Count subscribers
            const { count: subscribersCount } = await supabase
                .from("subscriptions")
                .select("id", { count: "exact", head: true })
                .eq("creator_id", user.id)
                .eq("status", "active");

            // 6. Calculate tips earned across all rooms
            let tipsEarned = 0;

            if (roomIds.length > 0) {
                // Bar lounge requests (accepted)
                const { data: barTips } = await supabase
                    .from("bar_lounge_requests")
                    .select("amount")
                    .in("room_id", roomIds)
                    .eq("status", "accepted");
                tipsEarned += (barTips || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

                // Confession tips
                const { data: confTips } = await supabase
                    .from("confession_tips")
                    .select("amount, confession_id")
                    .not("confession_id", "is", null);
                // Filter by creator's confessions
                const { data: creatorConfessions } = await supabase
                    .from("confessions")
                    .select("id")
                    .in("room_id", roomIds);
                const confIds = (creatorConfessions || []).map((c) => c.id);
                const filteredConfTips = (confTips || []).filter((t) => confIds.includes(t.confession_id));
                tipsEarned += filteredConfTips.reduce((sum, r) => sum + Number(r.amount || 0), 0);

                // Truth or dare tips
                const { data: todTips } = await supabase
                    .from("truth_dare_tips")
                    .select("amount")
                    .in("room_id", roomIds);
                tipsEarned += (todTips || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

                // Truth or dare requests (accepted)
                const { data: todRequests } = await supabase
                    .from("truth_dare_requests")
                    .select("amount")
                    .in("room_id", roomIds)
                    .neq("status", "pending");
                tipsEarned += (todRequests || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

                // X Chat reactions
                const { data: xchatReactions } = await supabase
                    .from("x_chat_reactions")
                    .select("amount")
                    .in("room_id", roomIds);
                tipsEarned += (xchatReactions || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

                // X Chat paid messages
                const { data: xchatMessages } = await supabase
                    .from("x_chat_messages")
                    .select("paid_amount")
                    .in("room_id", roomIds)
                    .gt("paid_amount", 0);
                tipsEarned += (xchatMessages || []).reduce((sum, r) => sum + Number(r.paid_amount || 0), 0);

                // Confession requests (delivered/completed)
                const { data: confRequests } = await supabase
                    .from("confession_requests")
                    .select("amount")
                    .eq("creator_id", user.id)
                    .in("status", ["delivered", "completed", "in_progress"]);
                tipsEarned += (confRequests || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

                // Confession unlocks
                const { data: confUnlocks } = await supabase
                    .from("confession_unlocks")
                    .select("price_paid, confession_id");
                const filteredConfUnlocks = (confUnlocks || []).filter((u) => confIds.includes(u.confession_id));
                tipsEarned += filteredConfUnlocks.reduce((sum, r) => sum + Number(r.price_paid || 0), 0);

                // Suga gifts
                const { data: sugaGifts } = await supabase
                    .from("suga_gifts")
                    .select("amount")
                    .in("room_id", roomIds);
                tipsEarned += (sugaGifts || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

                // Suga entry fees
                const { data: sugaEntries } = await supabase
                    .from("suga_entry_fees")
                    .select("amount")
                    .in("room_id", roomIds);
                tipsEarned += (sugaEntries || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);

                // Flash drop unlocks
                const { data: creatorDrops } = await supabase
                    .from("flash_drops")
                    .select("id")
                    .in("room_id", roomIds);
                const dropIds = (creatorDrops || []).map((d) => d.id);
                if (dropIds.length > 0) {
                    const { data: dropUnlocks } = await supabase
                        .from("flash_drop_unlocks")
                        .select("amount")
                        .in("drop_id", dropIds);
                    tipsEarned += (dropUnlocks || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
                }

                // Truth or dare unlocks
                const { data: todUnlocks } = await supabase
                    .from("truth_dare_unlocks")
                    .select("amount_paid")
                    .in("room_id", roomIds);
                tipsEarned += (todUnlocks || []).reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
            }

            // 7. Count gifts (suga_gifts)
            let giftsCount = 0;
            if (roomIds.length > 0) {
                const { count: gc } = await supabase
                    .from("suga_gifts")
                    .select("id", { count: "exact", head: true })
                    .in("room_id", roomIds);
                giftsCount = gc || 0;
            }

            // 8. Calculate subscription earnings
            let subscriptionEarnings = 0;
            const { data: activeSubs } = await supabase
                .from("subscriptions")
                .select("tier")
                .eq("creator_id", user.id)
                .eq("status", "active");
            if (activeSubs && profileData) {
                for (const sub of activeSubs) {
                    if (sub.tier === "weekly") {
                        subscriptionEarnings += Number(profileData.subscription_price_weekly || 0);
                    } else if (sub.tier === "monthly") {
                        subscriptionEarnings += Number(profileData.subscription_price_monthly || 0);
                    }
                }
            }

            setStats({
                tipsEarned: Math.round(tipsEarned * 100) / 100,
                giftsCount,
                totalFollowers,
                activeRooms,
                subscribers: subscribersCount || 0,
                subscriptionEarnings: Math.round(subscriptionEarnings * 100) / 100,
            });
        } catch (err: any) {
            console.error("Dashboard fetch error:", err);
            setError(err.message || "Failed to load dashboard");
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, supabase]);

    const saveSubscriptionPrices = useCallback(
        async (weekly: string, monthly: string): Promise<boolean> => {
            if (!user?.id) return false;

            const weeklyVal = weekly ? parseFloat(weekly) : null;
            const monthlyVal = monthly ? parseFloat(monthly) : null;

            const { error } = await supabase
                .from("profiles")
                .update({
                    subscription_price_weekly: weeklyVal,
                    subscription_price_monthly: monthlyVal,
                })
                .eq("id", user.id);

            if (error) {
                console.error("Save subscription error:", error);
                return false;
            }

            setProfile((prev) =>
                prev
                    ? {
                        ...prev,
                        subscription_price_weekly: weeklyVal,
                        subscription_price_monthly: monthlyVal,
                    }
                    : prev
            );
            return true;
        },
        [user?.id, supabase]
    );

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return {
        profile,
        stats,
        recentRooms,
        isLoading,
        error,
        refresh: fetchDashboard,
        saveSubscriptionPrices,
    };
}
