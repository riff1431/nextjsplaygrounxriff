"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface Reaction {
    id: string;
    room_type: string | null;
    name: string;
    emoji: string;
    price: number;
    is_active: boolean;
    sort_order: number;
}

interface TipEvent {
    id: string;
    fan_name: string;
    amount: number;
    created_at: string;
}

interface ReactionEvent {
    id: string;
    fan_name: string;
    emoji: string;
    amount: number;
    created_at: string;
}

interface CustomRequest {
    id: string;
    fan_name: string;
    content: string;
    amount: number;
    status: string;
    created_at: string;
}

/**
 * Shared hook for session interactions: tips, reactions, custom requests.
 * Includes reaction catalog fetching and real-time event subscriptions.
 */
export function useSessionInteractions(sessionId: string | null, roomType?: string) {
    const { user } = useAuth();
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [tipEvents, setTipEvents] = useState<TipEvent[]>([]);
    const [reactionEvents, setReactionEvents] = useState<ReactionEvent[]>([]);
    const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;

    // Fetch reaction catalog
    useEffect(() => {
        async function fetchReactions() {
            try {
                const params = roomType ? `?room_type=${roomType}` : "";
                const res = await fetch(`/api/v1/admin/reaction-catalog${params}`);
                const data = await res.json();
                setReactions((data.reactions || []).filter((r: Reaction) => r.is_active));
            } catch (err) {
                console.error("Failed to fetch reaction catalog:", err);
            }
        }
        fetchReactions();
    }, [roomType]);

    // Real-time subscriptions for tips, reactions, and custom requests
    useEffect(() => {
        if (!sessionId) return;

        const channel = supabase
            .channel(`session-interactions-${sessionId}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "INSERT",
                    schema: "public",
                    table: "room_session_tips",
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: any) => {
                    if (payload.new) {
                        setTipEvents((prev) => [...prev, payload.new as TipEvent]);
                    }
                }
            )
            .on(
                "postgres_changes" as any,
                {
                    event: "INSERT",
                    schema: "public",
                    table: "room_session_reactions",
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: any) => {
                    if (payload.new) {
                        setReactionEvents((prev) => [...prev, payload.new as ReactionEvent]);
                    }
                }
            )
            .on(
                "postgres_changes" as any,
                {
                    event: "*",
                    schema: "public",
                    table: "room_session_custom_requests",
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: any) => {
                    if (payload.new) {
                        setCustomRequests((prev) => {
                            const idx = prev.findIndex((r) => r.id === payload.new.id);
                            if (idx >= 0) {
                                const updated = [...prev];
                                updated[idx] = payload.new as CustomRequest;
                                return updated;
                            }
                            return [...prev, payload.new as CustomRequest];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [sessionId, supabase]);

    // Fetch existing custom requests
    const fetchCustomRequests = useCallback(async () => {
        if (!sessionId) return;
        try {
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/custom-request`);
            const data = await res.json();
            setCustomRequests(data.requests || []);
        } catch (err) {
            console.error("Failed to fetch custom requests:", err);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchCustomRequests();
    }, [fetchCustomRequests]);

    // Send tip
    const sendTip = useCallback(
        async (amount: number) => {
            if (!sessionId) return { success: false, error: "No session" };
            setIsLoading(true);
            try {
                const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/tip`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                return data;
            } catch (err: any) {
                return { success: false, error: err.message };
            } finally {
                setIsLoading(false);
            }
        },
        [sessionId]
    );

    // Send reaction
    const sendReaction = useCallback(
        async (reactionId: string) => {
            if (!sessionId) return { success: false, error: "No session" };
            setIsLoading(true);
            try {
                const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/reaction`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reaction_id: reactionId }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                return data;
            } catch (err: any) {
                return { success: false, error: err.message };
            } finally {
                setIsLoading(false);
            }
        },
        [sessionId]
    );

    // Send custom request
    const sendCustomRequest = useCallback(
        async (content: string, amount: number) => {
            if (!sessionId) return { success: false, error: "No session" };
            setIsLoading(true);
            try {
                const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/custom-request`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content, amount }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                return data;
            } catch (err: any) {
                return { success: false, error: err.message };
            } finally {
                setIsLoading(false);
            }
        },
        [sessionId]
    );

    // Calculate total earnings from tips + reactions + custom requests for this session
    const totalTips = tipEvents.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalReactions = reactionEvents.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalRequests = customRequests.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalEarnings = totalTips + totalReactions + totalRequests;

    return {
        // Catalog
        reactions,
        // Events (real-time)
        tipEvents,
        reactionEvents,
        customRequests,
        // Earnings
        totalTips,
        totalReactions,
        totalRequests,
        totalEarnings,
        // State
        isLoading,
        // Actions
        sendTip,
        sendReaction,
        sendCustomRequest,
        refreshRequests: fetchCustomRequests,
    };
}
