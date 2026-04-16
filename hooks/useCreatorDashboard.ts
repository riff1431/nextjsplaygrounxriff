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

            // 6. Fetch Global Creator Earnings (Standardized API)
            let tipsEarned = 0;
            let giftsCount = 0;
            try {
                const res = await fetch("/api/v1/creator/earnings?limit=1");
                if (res.ok) {
                    const earningsData = await res.json();
                    tipsEarned = Number(earningsData.ledger?.total_earned || 0);
                    // Instead of total_gifts, if we just want gifts count we could do:
                    giftsCount = Number(earningsData.month_summary?.events_count || 0); // or count from gifts
                }
            } catch (err) {
                console.error("Failed to fetch standardized earnings", err);
            }

            // 7. Calculate subscription earnings
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
                giftsCount, // this is effectively total events for the month now, but ok
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

    // Active real-time sync for tips and gifts
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel("dashboard_earnings_sync")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "revenue_events", filter: `creator_user_id=eq.${user.id}` }, () => {
                fetchDashboard();
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "creator_earnings_ledger", filter: `creator_id=eq.${user.id}` }, () => {
                fetchDashboard();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `host_id=eq.${user.id}` }, () => {
                fetchDashboard();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, fetchDashboard, supabase]);

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
