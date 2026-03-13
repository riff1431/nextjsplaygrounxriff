"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceUser {
    id: string;
    username?: string;
    avatar_url?: string;
    role?: string;
    online_at: string;
}

/**
 * Track online users in a room using Supabase Presence.
 *
 * Usage:
 *   const { onlineUsers, count } = useRealtimePresence(roomId);
 */
export function useRealtimePresence(roomId: string | null) {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!roomId || !user) return;

        const supabase = createClient();
        const channel = supabase.channel(`presence-room-${roomId}`, {
            config: { presence: { key: user.id } },
        });

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState() as any;
                const users: PresenceUser[] = [];
                for (const key of Object.keys(state)) {
                    const presences = state[key] as PresenceUser[];
                    if (presences.length > 0) {
                        users.push(presences[0]);
                    }
                }
                setOnlineUsers(users);
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        id: user.id,
                        username: user.user_metadata?.username || "Anonymous",
                        avatar_url: user.user_metadata?.avatar_url,
                        role: user.user_metadata?.role || "fan",
                        online_at: new Date().toISOString(),
                    });
                }
            });

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [roomId, user]);

    return {
        onlineUsers,
        count: onlineUsers.length,
    };
}
