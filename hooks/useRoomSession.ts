"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface RoomSession {
    id: string;
    room_id: string;
    room_type: string;
    creator_id: string;
    title: string;
    description: string | null;
    session_type: "public" | "private";
    entry_fee: number;
    status: "active" | "ended";
    agora_channel: string;
    started_at: string;
    ended_at: string | null;
    viewer_count: number;
    creator?: {
        id: string;
        username?: string;
        avatar_url?: string;
        full_name?: string;
    };
    participant_count?: number;
}

interface UseRoomSessionOptions {
    roomType?: string;
    sessionId?: string;
    status?: string;
}

/**
 * Shared hook for room session management.
 * Supports listing active sessions by room type, fetching a single session,
 * creating/ending sessions, and real-time status updates.
 */
export function useRoomSession(options: UseRoomSessionOptions = {}) {
    const { roomType, sessionId, status = "active" } = options;
    const { user } = useAuth();
    const [sessions, setSessions] = useState<RoomSession[]>([]);
    const [session, setSession] = useState<RoomSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;

    // Fetch sessions list or single session
    const fetchSessions = useCallback(async () => {
        try {
            setError(null);
            if (sessionId) {
                // Fetch single session
                const { data, error: fetchError } = await supabase
                    .from("room_sessions")
                    .select(`
                        *,
                        creator:profiles!room_sessions_creator_id_fkey(id, username, avatar_url, full_name)
                    `)
                    .eq("id", sessionId)
                    .single();

                if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
                setSession(data || null);
            } else if (roomType) {
                // Fetch active sessions for a room type
                const params = new URLSearchParams({ room_type: roomType });
                if (status) params.set("status", status);

                const res = await fetch(`/api/v1/rooms/sessions?${params}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setSessions(data.sessions || []);
            }
        } catch (err: any) {
            console.error("useRoomSession fetch error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, roomType, status, supabase]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Real-time subscription for session status changes
    useEffect(() => {
        const filter = sessionId
            ? `id=eq.${sessionId}`
            : roomType
                ? `room_type=eq.${roomType}`
                : null;

        if (!filter) return;

        const channel = supabase
            .channel(`room-sessions-${sessionId || roomType}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "*",
                    schema: "public",
                    table: "room_sessions",
                    filter,
                },
                (payload: any) => {
                    if (sessionId && payload.new) {
                        setSession((prev) => (prev ? { ...prev, ...payload.new } : payload.new));
                    } else {
                        // Refresh the list
                        fetchSessions();
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [sessionId, roomType, supabase, fetchSessions]);

    // Create a new session
    const createSession = useCallback(
        async (data: {
            room_type: string;
            title: string;
            description?: string;
            session_type: "public" | "private";
            price?: number;
            cost_per_min?: number;
        }) => {
            try {
                setError(null);
                const res = await fetch("/api/v1/rooms/sessions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error);

                setSession(result.session);
                return result;
            } catch (err: any) {
                setError(err.message);
                return { success: false, error: err.message };
            }
        },
        []
    );

    // End a session
    const endSession = useCallback(
        async (id?: string) => {
            const targetId = id || sessionId || session?.id;
            if (!targetId) return { success: false, error: "No session ID" };

            try {
                const res = await fetch(`/api/v1/rooms/sessions/${targetId}/end`, {
                    method: "POST",
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.error);

                setSession((prev) => (prev ? { ...prev, status: "ended" } : prev));
                return result;
            } catch (err: any) {
                setError(err.message);
                return { success: false, error: err.message };
            }
        },
        [sessionId, session?.id]
    );

    const isCreator = user?.id === session?.creator_id;

    return {
        // List mode
        sessions,
        // Single mode
        session,
        // State
        isLoading,
        error,
        isCreator,
        // Actions
        createSession,
        endSession,
        refresh: fetchSessions,
    };
}
