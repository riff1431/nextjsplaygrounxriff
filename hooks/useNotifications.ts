"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface Notification {
    id: string;
    user_id: string;
    actor_id?: string;
    type: string;
    message: string;
    is_read: boolean;
    reference_id?: string;
    created_at: string;
}

/**
 * Notifications hook with realtime updates.
 *
 * Usage:
 *   const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
 */
export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    // Fetch recent notifications
    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications(data || []);
        } catch (err) {
            console.error("Notifications fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [user, supabase]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Realtime subscription for new notifications
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`notifications-${user.id}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    if (payload.new) {
                        setNotifications((prev) => [payload.new as Notification, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user, supabase]);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    const markAsRead = useCallback(
        async (notificationId: string) => {
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notificationId);

            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
            );
        },
        [supabase]
    );

    const markAllRead = useCallback(async () => {
        if (!user) return;

        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }, [user, supabase]);

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllRead,
        refresh: fetchNotifications,
    };
}
