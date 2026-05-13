"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

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

    useEffect(() => {
        if (!roomId || !userId) return;

        const channel = supabase.channel(`room:${roomId}`)
            .on("broadcast", { event: "group_call_started" }, (payload) => {
                const d = payload.payload;
                
                if (role === "creator") {
                    // Creator auto-joins their own call
                    setCallState({
                        callId: d.callId,
                        roomId: d.roomId,
                        creatorId: d.creatorId,
                        agoraChannel: d.agoraChannel,
                        participantFanIds: d.participantFanIds,
                        type: d.type,
                        status: "active"
                    });
                } else if (role === "fan") {
                    // If fan is in the participants list, they get invited
                    if (d.participantFanIds.includes(userId)) {
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
                setCallState(prev => prev && prev.callId === d.callId ? { ...prev, status: "ended" } : prev);
                setTimeout(() => setCallState(null), 3000);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, userId, role]);

    const initiateCall = useCallback(async (type: 'truth' | 'dare') => {
        if (!roomId) return null;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/group-vote/call`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type }),
            });
            const data = await res.json();
            if (data.success) {
                // State will be set by the broadcast listener to ensure sync, 
                // but we can also set it immediately for perceived performance
                setCallState({
                    callId: data.callId,
                    roomId: roomId,
                    creatorId: userId || "",
                    agoraChannel: data.agoraChannel,
                    participantFanIds: data.participantFanIds,
                    type,
                    status: "active"
                });
                return data;
            }
            return null;
        } catch (err) {
            console.error("Failed to initiate group call:", err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [roomId, userId]);

    const acceptCall = useCallback(() => {
        if (!callState) return;
        setCallState(prev => prev ? { ...prev, status: "active" } : null);
    }, [callState]);

    const declineCall = useCallback(() => {
        setCallState(null);
    }, []);

    const endCall = useCallback(async () => {
        if (!roomId || !callState) return;
        try {
            await fetch(`/api/v1/rooms/${roomId}/truth-or-dare/group-vote/call/${callState.callId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end" }),
            });
        } catch (err) {
            console.error("Failed to end group call:", err);
        }
    }, [roomId, callState]);

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
