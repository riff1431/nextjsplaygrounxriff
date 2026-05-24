"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

export interface PrivateCallState {
    callId: string;
    roomId: string;
    fanId: string;
    creatorId: string;
    fanName: string;
    status: "pending" | "ringing" | "active" | "ended" | "declined" | "missed" | "rejected_by_fan";
    agoraChannel: string;
    durationSeconds: number;
    startedAt: string | null;
}

export function usePrivateCall(roomId: string | null, userId: string | null, role: "fan" | "creator") {
    const [callState, setCallState] = useState<PrivateCallState | null>(null);
    const [pendingCalls, setPendingCalls] = useState<PrivateCallState[]>([]);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Timer countdown
    useEffect(() => {
        if (callState?.status === "active" && callState.startedAt && callState.durationSeconds > 0) {
            const startTime = new Date(callState.startedAt).getTime();
            const endTime = startTime + callState.durationSeconds * 1000;

            const tick = () => {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
                setTimeRemaining(remaining);

                if (remaining <= 0) {
                    // Auto-end
                    endCall();
                }
            };

            tick(); // Initial tick
            timerRef.current = setInterval(tick, 1000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        } else {
            setTimeRemaining(callState?.durationSeconds || 0);
        }
    }, [callState?.status, callState?.startedAt, callState?.durationSeconds]);

    // Creator: hydrate pending calls from DB on mount (in case broadcasts were missed)
    useEffect(() => {
        if (role !== "creator" || !roomId || !userId) return;
        const fetchPending = async () => {
            const { data } = await supabase
                .from("suga_private_calls")
                .select("*")
                .eq("room_id", roomId)
                .eq("creator_id", userId)
                .eq("status", "pending")
                .order("created_at", { ascending: true });
            if (data && data.length > 0) {
                const mapped: PrivateCallState[] = data.map((c: any) => ({
                    callId: c.id,
                    roomId: c.room_id,
                    fanId: c.fan_id,
                    creatorId: c.creator_id,
                    fanName: c.fan_name,
                    status: "pending" as const,
                    agoraChannel: c.agora_channel,
                    durationSeconds: c.duration_seconds,
                    startedAt: c.started_at,
                }));
                setPendingCalls(prev => {
                    // Merge: add any DB calls not already in state
                    const existingIds = new Set(prev.map(c => c.callId));
                    const newCalls = mapped.filter(c => !existingIds.has(c.callId));
                    return newCalls.length > 0 ? [...prev, ...newCalls] : prev;
                });
                // Set first pending as callState if nothing active
                setCallState(prev => prev ? prev : mapped[0]);
            }
        };
        fetchPending();
    }, [roomId, userId, role]);

    // Listen for realtime postgres changes on suga_private_calls
    useEffect(() => {
        if (!roomId || !userId) return;

        const channel = supabase.channel(`suga_private_calls_changes_${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "suga_private_calls",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const c = payload.new;
                if (role === "creator" && c.creator_id === userId && c.status === "pending") {
                    const newCall: PrivateCallState = {
                        callId: c.id,
                        roomId: c.room_id,
                        fanId: c.fan_id,
                        creatorId: c.creator_id,
                        fanName: c.fan_name,
                        status: "pending",
                        agoraChannel: c.agora_channel,
                        durationSeconds: c.duration_seconds,
                        startedAt: null,
                    };
                    setPendingCalls(prev => {
                        if (prev.some(x => x.callId === c.id)) return prev;
                        return [...prev, newCall];
                    });
                    setCallState(prev => prev ? prev : newCall);
                }
            })
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "suga_private_calls",
                filter: `room_id=eq.${roomId}`,
            }, (payload) => {
                const c = payload.new;
                const updated: PrivateCallState = {
                    callId: c.id,
                    roomId: c.room_id,
                    fanId: c.fan_id,
                    creatorId: c.creator_id,
                    fanName: c.fan_name,
                    status: c.status as any,
                    agoraChannel: c.agora_channel,
                    durationSeconds: c.duration_seconds,
                    startedAt: c.started_at,
                };

                if (c.status === "pending") {
                    if (role === "creator" && c.creator_id === userId) {
                        setPendingCalls(prev => {
                            if (prev.some(x => x.callId === c.id)) {
                                return prev.map(x => x.callId === c.id ? updated : x);
                            }
                            return [...prev, updated];
                        });
                        setCallState(prev => prev ? prev : updated);
                    }
                } else if (c.status === "ringing") {
                    if (role === "fan" && c.fan_id === userId) {
                        setCallState(prev => prev && prev.callId === c.id ? { ...prev, status: "ringing" } : updated);
                    } else if (role === "creator" && c.creator_id === userId) {
                        setCallState(prev => prev && prev.callId === c.id ? { ...prev, status: "ringing" } : prev);
                        setPendingCalls(prev => prev.filter(x => x.callId !== c.id));
                    }
                } else if (c.status === "active") {
                    if (c.fan_id === userId || c.creator_id === userId) {
                        setCallState(updated);
                    }
                } else if (c.status === "ended") {
                    if (c.fan_id === userId || c.creator_id === userId) {
                        setCallState(updated);
                        setTimeout(() => setCallState(null), 2000);
                    }
                } else if (c.status === "declined") {
                    if (role === "fan" && c.fan_id === userId) {
                        setCallState(updated);
                        setTimeout(() => setCallState(null), 3000);
                    } else if (role === "creator" && c.creator_id === userId) {
                        setPendingCalls(prev => prev.filter(x => x.callId !== c.id));
                        if (callState?.callId === c.id) {
                            setCallState(null);
                        }
                    }
                } else if (c.status === "rejected_by_fan") {
                    if (role === "creator" && c.creator_id === userId) {
                        setCallState(updated);
                        setTimeout(() => setCallState(null), 3000);
                    } else if (role === "fan" && c.fan_id === userId) {
                        setCallState(null);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, role, callState?.callId]);

    // Fan: initiate a private call
    const initiateCall = useCallback(async (fanName: string, requestId?: string) => {
        if (!roomId) return null;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/suga/private-call`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId, fanName }),
            });
            const data = await res.json();
            if (data.success) {
                setCallState({
                    callId: data.callId,
                    roomId: roomId,
                    fanId: userId || "",
                    creatorId: "",
                    fanName,
                    status: "pending",
                    agoraChannel: data.agoraChannel,
                    durationSeconds: data.duration,
                    startedAt: null,
                });
                return data;
            }
            return null;
        } catch (err) {
            console.error("Failed to initiate private call:", err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [roomId, userId]);

    // Creator: accept a specific call from the queue
    const acceptCall = useCallback(async (callId?: string) => {
        if (!roomId) return;
        const targetId = callId || callState?.callId;
        if (!targetId) return;
        setIsLoading(true);
        try {
            await fetch(`/api/v1/rooms/${roomId}/suga/private-call`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ callId: targetId, action: "accept" }),
            });
            // If accepting from queue, promote to active callState
            const acceptedCall = pendingCalls.find(c => c.callId === targetId);
            if (acceptedCall) {
                setCallState({ ...acceptedCall, status: "ringing" });
                setPendingCalls(prev => prev.filter(c => c.callId !== targetId));
            }
        } catch (err) {
            console.error("Failed to accept call:", err);
        } finally {
            setIsLoading(false);
        }
    }, [roomId, callState, pendingCalls]);

    // Creator: decline a specific call from the queue
    const declineCall = useCallback(async (callId?: string) => {
        if (!roomId) return;
        const targetId = callId || callState?.callId;
        if (!targetId) return;
        setIsLoading(true);
        try {
            await fetch(`/api/v1/rooms/${roomId}/suga/private-call`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ callId: targetId, action: "decline" }),
            });
            // Remove from pending queue
            setPendingCalls(prev => prev.filter(c => c.callId !== targetId));
            // Clear callState if it's the one being declined
            if (callState?.callId === targetId) {
                setCallState(null);
            }
        } catch (err) {
            console.error("Failed to decline call:", err);
        } finally {
            setIsLoading(false);
        }
    }, [roomId, callState]);

    // Fan: accept ringing
    const acceptRinging = useCallback(async () => {
        if (!roomId || !callState) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/suga/private-call/${callState.callId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "accept" }),
            });
            const data = await res.json();
            if (data.success) {
                setCallState(prev => prev ? { ...prev, status: "active", startedAt: data.startedAt } : null);
            }
        } catch (err) {
            console.error("Failed to accept ringing:", err);
        } finally {
            setIsLoading(false);
        }
    }, [roomId, callState]);

    // Fan: reject ringing
    const rejectRinging = useCallback(async () => {
        if (!roomId || !callState) return;
        try {
            await fetch(`/api/v1/rooms/${roomId}/suga/private-call/${callState.callId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reject" }),
            });
            setCallState(null);
        } catch (err) {
            console.error("Failed to reject ringing:", err);
        }
    }, [roomId, callState]);

    // End call (either party)
    const endCall = useCallback(async () => {
        if (!roomId || !callState) return;
        if (timerRef.current) clearInterval(timerRef.current);
        try {
            await fetch(`/api/v1/rooms/${roomId}/suga/private-call/${callState.callId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end" }),
            });
        } catch (err) {
            console.error("Failed to end call:", err);
        }
    }, [roomId, callState]);

    // Dismiss (clear local state)
    const dismiss = useCallback(() => {
        setCallState(null);
    }, []);

    return {
        callState,
        pendingCalls,
        timeRemaining,
        isLoading,
        initiateCall,
        acceptCall,
        declineCall,
        acceptRinging,
        rejectRinging,
        endCall,
        dismiss,
    };
}
