import { useEffect, useState } from "react";
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

export function useBarChat(roomId: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const supabase = createClient();

    useEffect(() => {
        if (!roomId) return;

        // Load initial messages
        const load = async () => {
            const { data } = await supabase
                .from("bar_lounge_messages")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (data) setMessages(data.reverse());
        };

        load();

        // Subscribe to new messages
        const channel = supabase
            .channel(`chat:${roomId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "bar_lounge_messages", filter: `room_id=eq.${roomId}` },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => [...prev, newMsg]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    const sendMessage = async (content: string, userId?: string, handle?: string) => {
        if (!roomId || !content.trim()) return;

        // Optimistic update (optional, but skipping for simplicity/correctness first)
        const { error } = await supabase.from("bar_lounge_messages").insert({
            room_id: roomId,
            user_id: userId ?? null,
            handle: handle ?? null,
            content: content.trim(),
        });

        if (error) console.error("Failed to send message:", error);
    };

    return { messages, sendMessage };
}
