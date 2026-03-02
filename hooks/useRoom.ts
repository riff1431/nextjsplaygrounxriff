"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface Room {
    id: string;
    host_id: string;
    title: string | null;
    status: "live" | "offline" | "ended";
    type: string | null;
    slug: string | null;
    viewer_count: number;
    created_at: string;
    cover_image?: string;
    /** Joined from profiles */
    profiles?: {
        username?: string;
        avatar_url?: string;
        full_name?: string;
    };
}

/**
 * Fetch a room by ID or type, with realtime status updates.
 *
 * Usage:
 *   const { room, isHost, goLive, endSession } = useRoom({ roomId });
 *   const { room } = useRoom({ roomType: 'confessions', status: 'live' });
 */
export function useRoom(options: {
    roomId?: string | null;
    roomType?: string;
    status?: string;
}) {
    const { roomId, roomType, status } = options;
    const { user } = useAuth();
    const [room, setRoom] = useState<Room | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const fetchRoom = useCallback(async () => {
        try {
            let query = supabase
                .from("rooms")
                .select("*, profiles:host_id(username, avatar_url, full_name)");

            if (roomId) {
                query = query.eq("id", roomId);
            } else if (roomType) {
                query = query.eq("type", roomType);
                if (status) {
                    query = query.eq("status", status);
                }
                query = query.order("created_at", { ascending: false }).limit(1);
            }

            const { data, error: fetchError } = await query.single();

            if (fetchError && fetchError.code !== "PGRST116") {
                throw fetchError;
            }

            setRoom(data || null);
        } catch (err: any) {
            console.error("Room fetch error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [roomId, roomType, status, supabase]);

    useEffect(() => {
        fetchRoom();
    }, [fetchRoom]);

    // Realtime room status updates
    useEffect(() => {
        if (!room?.id) return;

        const channel = supabase
            .channel(`room-${room.id}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "rooms",
                    filter: `id=eq.${room.id}`,
                },
                (payload: any) => {
                    if (payload.new) {
                        setRoom((prev) => (prev ? { ...prev, ...payload.new } : payload.new));
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [room?.id, supabase]);

    const isHost = user?.id === room?.host_id;

    /** Creator: Set room status to 'live' */
    const goLive = useCallback(async () => {
        if (!room?.id || !isHost) return;

        const { error } = await supabase
            .from("rooms")
            .update({ status: "live" })
            .eq("id", room.id);

        if (!error) {
            setRoom((prev) => (prev ? { ...prev, status: "live" } : prev));
        }
    }, [room?.id, isHost, supabase]);

    /** Creator: End the session */
    const endSession = useCallback(async () => {
        if (!room?.id || !isHost) return;

        const { error } = await supabase
            .from("rooms")
            .update({ status: "ended" })
            .eq("id", room.id);

        if (!error) {
            setRoom((prev) => (prev ? { ...prev, status: "ended" } : prev));
        }
    }, [room?.id, isHost, supabase]);

    /** Creator: Create a new room */
    const createRoom = useCallback(
        async (type: string, title?: string) => {
            if (!user) return null;

            const { data, error } = await supabase
                .from("rooms")
                .insert({
                    host_id: user.id,
                    type,
                    title: title || `${type} Room`,
                    status: "offline",
                })
                .select()
                .single();

            if (error) {
                console.error("Create room error:", error);
                return null;
            }

            setRoom(data);
            return data;
        },
        [user, supabase]
    );

    return {
        room,
        isHost,
        isLoading,
        error,
        goLive,
        endSession,
        createRoom,
        refresh: fetchRoom,
    };
}
