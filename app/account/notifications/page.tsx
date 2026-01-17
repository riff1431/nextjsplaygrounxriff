"use client";

import React from "react";
import { Bell, Heart, Star, Zap, UserPlus } from "lucide-react";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

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

type Notification = {
    id: string;
    type: 'follow' | 'like' | 'comment' | 'system' | 'unlock';
    message: string;
    is_read: boolean;
    created_at: string;
    actor_id: string | null;
    actor?: {
        username: string;
        avatar_url: string | null;
    };
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth');
                return;
            }

            const { data, error } = await supabase
                .from('notifications')
                .select(`
                    *,
                    actor:actor_id (
                        username,
                        avatar_url
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) {
                setNotifications(data as any);

                // Mark unread as read
                const unreadIds = data.filter((n: any) => !n.is_read).map((n: any) => n.id);
                if (unreadIds.length > 0) {
                    await supabase
                        .from('notifications')
                        .update({ is_read: true })
                        .in('id', unreadIds);
                }
            }
            setLoading(false);
        };

        fetchNotifications();
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case 'follow': return { icon: UserPlus, color: 'blue' };
            case 'like': return { icon: Heart, color: 'red' };
            case 'unlock': return { icon: Star, color: 'purple' };
            case 'system': return { icon: Zap, color: 'yellow' };
            default: return { icon: Bell, color: 'pink' };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
                <div className="animate-pulse text-pink-500">Loading notifications...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20 lg:pb-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Bell className="w-6 h-6 text-pink-400" />
                    Notifications
                </h1>

                <div className="space-y-2">
                    {notifications.length === 0 ? (
                        <div className="text-gray-500 text-center py-8">No notifications yet.</div>
                    ) : (
                        notifications.map((notif) => {
                            const { icon: Icon, color } = getIcon(notif.type);
                            return (
                                <div key={notif.id} className={`p-4 rounded-xl flex gap-4 items-start border transition ${notif.is_read ? 'border-transparent bg-transparent opacity-70 hover:opacity-100 hover:bg-white/5' : 'border-pink-500/20 bg-white/5'}`}>
                                    <div className={`p-2 rounded-full bg-${color}-500/20 text-${color}-400 mt-1`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm text-gray-200">
                                            {notif.actor && <span className="font-bold mr-1">@{notif.actor.username}</span>}
                                            {notif.message.replace(notif.actor?.username || '', '')}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                        </div>
                                    </div>
                                    {!notif.is_read && <div className="w-2 h-2 rounded-full bg-pink-500 mt-2"></div>}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    )
}
