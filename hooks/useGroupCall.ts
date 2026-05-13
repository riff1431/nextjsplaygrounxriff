"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export interface GroupCallState {
    callId: string;
    roomId: string;
    creatorId: string;
    agoraChannel: string;
    participantFanIds: string[];
    type: 'truth' | 'dare';
    status: "invited" | "active" | "ended";
}

export function useGroupCall(roomId: string | null, userId: string | null, role: "fan" | "creator") {
    const [callState, setCallState] = useState<GroupCallState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;

    // ─── Broadcast Listener ────────────────────────────────────────────────────
    // IMPORTANT: Channel name MUST match what the server broadcasts to (`room:${roomId}`).
    // Supabase broadcast is topic-based — clients only receive events from channels they
    // subscribe to BY NAME. The old collision with gameChannel is resolved because we removed
    // the group_call_started handler from gameChannel in the fan page.
    useEffect(() => {
        if (!roomId || !userId) return;

        // Must match the server's broadcast topic
        const channelName = `room:${roomId}`;

        const channel = supabase.channel(channelName)
            .on("broadcast", { event: "group_call_started" }, (payload) => {
                const d = payload.payload;

                if (role === "creator") {
                    // Creator: broadcast confirms the call — don't overwrite optimistic state
                    setCallState(prev => {
                        if (prev?.status === "active") return prev;
                        return {
                            callId: d.callId,
                            roomId: d.roomId,
                            creatorId: d.creatorId,
                            agoraChannel: d.agoraChannel,
                            participantFanIds: d.participantFanIds,
                            type: d.type,
                            status: "active"
                        };
                    });
                } else if (role === "fan") {
                    // Fan: only invited fans get the call
                    if (Array.isArray(d.participantFanIds) && d.participantFanIds.includes(userId)) {
                        setCallState({
                            callId: d.callId,
                            roomId: d.roomId,
                            creatorId: d.creatorId,
                            agoraChannel: d.agoraChannel,
                            participantFanIds: d.participantFanIds,
                            type: d.type,
                            status: "invited"
                        });
                    }
                }
            })
            .on("broadcast", { event: "group_call_ended" }, (payload) => {
                const d = payload.payload;
                setCallState(prev =>
                    prev && prev.callId === d.callId
                        ? { ...prev, status: "ended" }
                        : prev
                );
                // Auto-dismiss after 4 seconds
                setTimeout(() => setCallState(null), 4000);
            })
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log(`[useGroupCall] ✅ Subscribed as ${role} to ${channelName}`);
                } else if (status === "CHANNEL_ERROR") {
                    console.error(`[useGroupCall] ❌ Channel error for ${channelName}`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, role]);

    // ─── DB Hydration (Late-Join / Reconnect Support) ──────────────────────────
    // On mount (when userId is known), check if there's an active call in the DB.
    // This handles fans who refresh the page or join after the broadcast was sent.
    useEffect(() => {
        if (!roomId || !userId || role !== "fan") return;

        async function hydrateFromDB() {
            try {
                const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/group-vote/call/active`);
                if (!res.ok) return;
                const { call } = await res.json();
                if (!call) return;

                // Only set state if this fan is a participant and not already in a call
                if (
                    Array.isArray(call.participant_fan_ids) &&
                    call.participant_fan_ids.includes(userId)
                ) {
                    setCallState(prev => {
                        // Don't overwrite a state that's already been set (e.g. by broadcast)
                        if (prev) return prev;
                        return {
                            callId: call.id,
                            roomId: call.room_id,
                            creatorId: call.creator_id,
                            agoraChannel: call.agora_channel,
                            participantFanIds: call.participant_fan_ids,
                            type: call.type,
                            status: "invited"
                        };
                    });
                }
            } catch (err) {
                console.error("[useGroupCall] DB hydration error:", err);
            }
        }

        hydrateFromDB();
    }, [roomId, userId, role]);

    // ─── Creator: Initiate Call ────────────────────────────────────────────────
    const initiateCall = useCallback(async (type: 'truth' | 'dare') => {
        if (!roomId) return null;
        // Guard: prevent double-initiation
        if (callState && callState.status === "active") {
            toast.warning("A group call is already in progress.");
            return null;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/group-vote/call`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to start group call");
                return null;
            }
            if (data.success) {
                if (data.participantFanIds.length === 0) {
                    toast.warning("No eligible fans found for this campaign.");
                }
                // Set state optimistically — broadcast will also arrive and confirm
                setCallState({
                    callId: data.callId,
                    roomId: roomId,
                    creatorId: userId || "",
                    agoraChannel: data.agoraChannel,
                    participantFanIds: data.participantFanIds,
                    type,
                    status: "active"
                });
                toast.success(`Group ${type} call started! ${data.participantFanIds.length} fans invited.`);
                return data;
            }
            return null;
        } catch (err) {
            console.error("Failed to initiate group call:", err);
            toast.error("Failed to start group call. Please try again.");
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [roomId, userId, callState]);

    // ─── Fan: Accept Call ──────────────────────────────────────────────────────
    const acceptCall = useCallback(() => {
        setCallState(prev => prev ? { ...prev, status: "active" } : null);
    }, []);

    // ─── Fan: Decline Call ─────────────────────────────────────────────────────
    const declineCall = useCallback(() => {
        setCallState(null);
    }, []);

    // ─── Creator: End Call ─────────────────────────────────────────────────────
    const endCall = useCallback(async () => {
        if (!roomId || !callState) return;
        // Optimistically mark as ended locally
        setCallState(prev => prev ? { ...prev, status: "ended" } : null);
        setTimeout(() => setCallState(null), 4000);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/group-vote/call/${callState.callId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end" }),
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Failed to end group call");
            }
        } catch (err) {
            console.error("Failed to end group call:", err);
            toast.error("Failed to end group call.");
        }
    }, [roomId, callState]);

    // ─── Dismiss (after ended state shown) ────────────────────────────────────
    const dismiss = useCallback(() => {
        setCallState(null);
    }, []);

    return useMemo(() => ({
        callState,
        isLoading,
        initiateCall,
        acceptCall,
        declineCall,
        endCall,
        dismiss
    }), [callState, isLoading, initiateCall, acceptCall, declineCall, endCall, dismiss]);
}
