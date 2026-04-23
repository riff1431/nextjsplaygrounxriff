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

    // Listen for realtime broadcast events
    useEffect(() => {
        if (!roomId || !userId) return;

        const channel = supabase.channel(`room:${roomId}:private_call_${userId}`)
            .on("broadcast", { event: "private_call_request" }, (payload) => {
                // Creator receives: a fan requested a call
                if (role === "creator") {
                    const d = payload.payload;
                    setCallState({
                        callId: d.callId,
                        roomId: roomId,
                        fanId: d.fanId,
                        creatorId: userId,
                        fanName: d.fanName,
                        status: "pending",
                        agoraChannel: d.agoraChannel,
                        durationSeconds: d.duration,
                        startedAt: null,
                    });
                }
            })
            .on("broadcast", { event: "private_call_ringing" }, (payload) => {
                const d = payload.payload;
                // Fan receives: creator accepted, now ringing
                if (role === "fan" && d.fanId === userId) {
                    setCallState(prev => prev ? { ...prev, status: "ringing", agoraChannel: d.agoraChannel, durationSeconds: d.duration } : {
                        callId: d.callId,
                        roomId: roomId,
                        fanId: d.fanId,
                        creatorId: d.creatorId,
                        fanName: "",
                        status: "ringing",
                        agoraChannel: d.agoraChannel,
                        durationSeconds: d.duration,
                        startedAt: null,
                    });
                }
            })
            .on("broadcast", { event: "private_call_active" }, (payload) => {
                const d = payload.payload;
                if (d.fanId === userId || d.creatorId === userId) {
                    setCallState(prev => prev ? { ...prev, status: "active", startedAt: d.startedAt, agoraChannel: d.agoraChannel, durationSeconds: d.duration } : null);
                }
            })
            .on("broadcast", { event: "private_call_ended" }, (payload) => {
                const d = payload.payload;
                if (d.fanId === userId || d.creatorId === userId) {
                    setCallState(prev => prev ? { ...prev, status: "ended" } : null);
                    // Auto-clear after short delay
                    setTimeout(() => setCallState(null), 2000);
                }
            })
            .on("broadcast", { event: "private_call_declined" }, (payload) => {
                const d = payload.payload;
                if (d.fanId === userId) {
                    setCallState(prev => prev ? { ...prev, status: "declined" } : null);
                    setTimeout(() => setCallState(null), 3000);
                }
            })
            .on("broadcast", { event: "private_call_rejected" }, (payload) => {
                const d = payload.payload;
                if (d.creatorId === userId) {
                    setCallState(prev => prev ? { ...prev, status: "rejected_by_fan" } : null);
                    setTimeout(() => setCallState(null), 3000);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, role]);

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

    // Creator: accept call
    const acceptCall = useCallback(async () => {
        if (!roomId || !callState) return;
        setIsLoading(true);
        try {
            await fetch(`/api/v1/rooms/${roomId}/suga/private-call`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ callId: callState.callId, action: "accept" }),
            });
        } catch (err) {
            console.error("Failed to accept call:", err);
        } finally {
            setIsLoading(false);
        }
    }, [roomId, callState]);

    // Creator: decline call
    const declineCall = useCallback(async () => {
        if (!roomId || !callState) return;
        setIsLoading(true);
        try {
            await fetch(`/api/v1/rooms/${roomId}/suga/private-call`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ callId: callState.callId, action: "decline" }),
            });
            setCallState(null);
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
