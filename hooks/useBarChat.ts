import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

export type ChatMessage = {
    id: string;
    room_id: string;
    session_id: string | null;
    user_id: string | null;
    handle: string | null;
    content: string;
    is_system: boolean;
    created_at: string;
};

export function useBarChat(roomId: string | null, sessionId?: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;

    useEffect(() => {
        if (!roomId) {
            console.log("[useBarChat] No roomId, clearing messages");
            setMessages([]);
            return;
        }
        console.log("[useBarChat] Init with roomId:", roomId, "sessionId:", sessionId);

        // Load initial messages
        const load = async () => {
            let query = supabase
                .from("bar_lounge_messages")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(100);
            
            // session_id DB filter
            if (sessionId) query = query.eq("session_id", sessionId);

            const { data, error } = await query;

            if (error) {
                console.error("[useBarChat] Error loading chat:", error);
                return;
            }
            console.log("[useBarChat] Loaded", data?.length, "messages");
            if (data) setMessages(data.reverse());
        };

        load();

        // Subscribe to new messages — unique channel per session to avoid cross-session leakage
        const channelName = sessionId ? `bar-chat-${roomId}-${sessionId}` : `bar-chat-${roomId}`;
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "bar_lounge_messages",
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    // If we're scoped to a session, ignore messages from other sessions
                    if (sessionId && newMsg.session_id && newMsg.session_id !== sessionId) return;
                    setMessages((prev) => {
                        // Avoid duplicates if same message arrives via multiple paths
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, sessionId]);

    const sendMessage = useCallback(async (content: string, userId?: string, handle?: string) => {
        if (!roomId || !content.trim()) return;

        const insertPayload: any = {
            room_id: roomId,
            user_id: userId ?? null,
            handle: handle ?? null,
            content: content.trim(),
        };
        // session_id DB insert
        if (sessionId) insertPayload.session_id = sessionId;

        console.log("[useBarChat] Sending message:", { roomId, sessionId, content: content.trim() });
        const { error } = await supabase.from("bar_lounge_messages").insert(insertPayload);

        if (error) {
            console.error("[useBarChat] Failed to send message:", error);
            throw error;
        }
        console.log("[useBarChat] Message inserted successfully");
    }, [roomId, sessionId]);

    return { messages, sendMessage };
}
