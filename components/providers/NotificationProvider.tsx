"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";

type Notification = {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    metadata?: any;
    is_read: boolean;
    created_at: string;
    actor_id?: string | null;
    actor?: {
        username: string;
        avatar_url: string | null;
    } | null;
};

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id?: string) => Promise<void>;
    loading: boolean;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [onboardingComplete, setOnboardingComplete] = useState(false);
    const supabase = createClient();

    // Check if user has fully completed onboarding before showing any toasts
    useEffect(() => {
        if (!user) {
            setOnboardingComplete(false);
            return;
        }
        const checkOnboarding = async () => {
            try {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role, onboarding_completed_at, kyc_status")
                    .eq("id", user.id)
                    .single();
                if (!profile) { setOnboardingComplete(false); return; }
                const done =
                    (profile.role === "fan" && !!profile.onboarding_completed_at) ||
                    (profile.role === "creator" && profile.kyc_status === "approved") ||
                    profile.role === "admin";
                setOnboardingComplete(done);
            } catch {
                setOnboardingComplete(false);
            }
        };
        checkOnboarding();
    }, [user]);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from("notifications")
                .select(`
                    *,
                    actor:actor_id (
                        username,
                        avatar_url
                    )
                `)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            setNotifications((data as any) || []);
            setUnreadCount(data?.filter(n => !n.is_read).length || 0);
        } catch (err) {
            console.error("Error fetching notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        fetchNotifications();

        const channel = supabase
            .channel("realtime_notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                async (payload) => {
                    const newNotif = payload.new as Notification;
                    
                    if (newNotif.actor_id) {
                        try {
                            const { data: actorData } = await supabase
                                .from("profiles")
                                .select("username, avatar_url")
                                .eq("id", newNotif.actor_id)
                                .single();
                            if (actorData) {
                                newNotif.actor = actorData;
                            }
                        } catch (err) {
                            console.error("Error fetching actor details for realtime notification:", err);
                        }
                    }

                    setNotifications((prev) => [newNotif, ...prev]);
                    setUnreadCount((prev) => prev + 1);

                    // Play sound (optional, if assets exist)
                    // const audio = new Audio('/sounds/notification.mp3');
                    // audio.play().catch(e => console.log('Audio play failed', e));

                    // Check if we should skip the global toast to prevent duplicates in specific rooms
                    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
                    const isConfession = (newNotif.type === 'confession_tip' || newNotif.type === 'confession_request' || newNotif.type === 'confession_request_update') && pathname.includes('/rooms/confessions');
                    const isBarLounge = newNotif.type === 'bar_request' && pathname.includes('/rooms/bar-lounge');
                    const isSessionCreated = newNotif.type === 'session_created' || newNotif.type === 'truth_dare_session_created';
                    // Never show toasts to users who haven't finished signing up
                    const skipToast = isConfession || isBarLounge || isSessionCreated || !onboardingComplete;

                    if (!skipToast) {
                        // Toast — enhanced for room invitations
                        if (newNotif.type === "room_invitation" && newNotif.link) {
                            toast("💖 Room Invitation", {
                                description: newNotif.message,
                                duration: 15000,
                                action: {
                                    label: "Enter Room",
                                    onClick: () => window.location.href = newNotif.link!,
                                },
                            });
                        } else if (newNotif.type === "creator_invite") {
                            // Premium collab invite toast
                            const meta = newNotif.metadata || {};
                            const splitPct = meta.split_pct || "?";
                            const sessionTitle = meta.session_title || "Truth or Dare";
                            const collabLink = meta.collab_link || newNotif.link || "/account/notifications";
                            toast("🎭 Collab Invite!", {
                                description: `You've been invited to "${sessionTitle}" — ${splitPct}% revenue split!`,
                                duration: 15000,
                                action: {
                                    label: "Join Session",
                                    onClick: () => window.location.href = collabLink,
                                },
                            });
                        } else {
                            toast(newNotif.title, {
                                description: newNotif.message,
                                action: newNotif.link ? {
                                    label: "View",
                                    onClick: () => window.location.href = newNotif.link!
                                } : undefined,
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const markAsRead = async (id?: string) => {
        if (!user) return;

        try {
            if (id) {
                // Optimistic update
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));

                await supabase
                    .from("notifications")
                    .update({ is_read: true })
                    .eq("id", id);
            } else {
                // Mark all
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);

                await supabase
                    .from("notifications")
                    .update({ is_read: true })
                    .eq("user_id", user.id)
                    .eq("is_read", false);
            }
        } catch (err) {
            console.error("Error marking notifications read:", err);
            // Revert on error? For now simple log.
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, loading }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
