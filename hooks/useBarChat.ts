import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export type ChatMessage = {
    id: string;
    room_id: string;
    user_id: string | null;
    handle: string | null;
    content: string;
    is_system: boolean;
    created_at: string;
};

export function useBarChat(roomId: string | null, sessionId?: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const supabase = createClient();

    useEffect(() => {
        if (!roomId) {
            setMessages([]);
            return;
        }

        // Load initial messages
        const load = async () => {
            let query = supabase
                .from("bar_lounge_messages")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(100);
            if (sessionId) query = query.eq("session_id", sessionId);

            const { data, error } = await query;

            if (error) {
                console.error("Error loading chat:", error);
                return;
            }
            if (data) setMessages(data.reverse());
        };

        load();

        // Subscribe to new messages
        const channel = supabase
            .channel(`bar-chat-${roomId}`)
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
    }, [roomId, sessionId, supabase]);

    const sendMessage = useCallback(async (content: string, userId?: string, handle?: string) => {
        if (!roomId || !content.trim()) return;

        const insertPayload: any = {
            room_id: roomId,
            user_id: userId ?? null,
            handle: handle ?? null,
            content: content.trim(),
        };
        if (sessionId) insertPayload.session_id = sessionId;

        const { error } = await supabase.from("bar_lounge_messages").insert(insertPayload);

        if (error) {
            console.error("Failed to send message:", error);
            throw error;
        }
    }, [roomId, sessionId, supabase]);

    return { messages, sendMessage };
}
