"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface JoinRequest {
    id: string;
    session_id: string;
    user_id: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    responded_at: string | null;
    user?: {
        id: string;
        username?: string;
        avatar_url?: string;
        full_name?: string;
    };
}

/**
 * Shared hook for private session join request flow.
 * - Fan side: submit request, listen for approval/rejection in real-time
 * - Creator side: list pending requests, approve/reject, real-time updates
 */
export function useJoinRequest(sessionId: string | null) {
    const { user } = useAuth();
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;

    // Fetch existing requests (creator) or own request (fan)
    const fetchRequests = useCallback(async () => {
        if (!sessionId) return;

        try {
            // Fetch via API (creator gets all, fan gets own via RLS)
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/respond-join`);
            const data = await res.json();

            if (data.requests) {
                setRequests(data.requests);
                // Find own request
                if (user) {
                    const mine = data.requests.find((r: JoinRequest) => r.user_id === user.id);
                    setMyRequest(mine || null);
                }
            }
        } catch (err) {
            // Fan may get 403 if not creator — fallback to direct query
            if (user) {
                const { data } = await supabase
                    .from("room_join_requests")
                    .select("*")
                    .eq("session_id", sessionId)
                    .eq("user_id", user.id)
                    .single();

                setMyRequest(data || null);
            }
        }
    }, [sessionId, user, supabase]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Real-time: listen for join request changes
    useEffect(() => {
        if (!sessionId) return;

        const channel = supabase
            .channel(`join-requests-${sessionId}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "*",
                    schema: "public",
                    table: "room_join_requests",
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: any) => {
                    if (payload.eventType === "INSERT") {
                        setRequests((prev) => {
                            if (prev.some((r) => r.id === payload.new.id)) return prev;
                            return [payload.new as JoinRequest, ...prev];
                        });
                        if (user && payload.new.user_id === user.id) {
                            setMyRequest(payload.new as JoinRequest);
                        }
                    } else if (payload.eventType === "UPDATE") {
                        setRequests((prev) =>
                            prev.map((r) =>
                                r.id === payload.new.id ? { ...r, ...payload.new } : r
                            )
                        );
                        if (user && payload.new.user_id === user.id) {
                            setMyRequest((prev) => (prev ? { ...prev, ...payload.new } : payload.new));
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [sessionId, user, supabase]);

    // Fan: submit join request
    const submitRequest = useCallback(async () => {
        if (!sessionId || !user) return { success: false, error: "Not authenticated" };
        setIsLoading(true);

        try {
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/request-join`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setMyRequest({
                id: data.request_id,
                session_id: sessionId,
                user_id: user.id,
                status: data.status,
                created_at: new Date().toISOString(),
                responded_at: null,
            });

            return data;
        } catch (err: any) {
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, user]);

    // Creator: approve or reject
    const respondToRequest = useCallback(
        async (requestId: string, action: "approve" | "reject") => {
            if (!sessionId) return { success: false, error: "No session" };
            setIsLoading(true);

            try {
                const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/respond-join`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ request_id: requestId, action }),
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

    const pendingRequests = requests.filter((r) => r.status === "pending");

    return {
        requests,
        pendingRequests,
        myRequest,
        isLoading,
        submitRequest,
        respondToRequest,
        refresh: fetchRequests,
    };
}
