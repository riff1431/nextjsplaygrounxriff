import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export type XChatMessage = {
    id: string;
    room_id: string;
    sender_id: string | null;
    sender_name: string;
    body: string;
    lane: string;
    paid_amount: number;
    status: string;
    creator_reply: string | null;
    created_at: string;
};

export function useXChat(roomId: string | null) {
    const [messages, setMessages] = useState<XChatMessage[]>([]);
    const supabase = createClient();

    useEffect(() => {
        if (!roomId) {
            setMessages([]);
            return;
        }

        // Load initial messages
        const load = async () => {
            const { data, error } = await supabase
                .from("x_chat_messages")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error loading X-Chat messages:", error);
                return;
            }
            if (data) setMessages(data);
        };

        load();

        // Subscribe to changes (INSERT and UPDATE for replies)
        const channel = supabase
            .channel(`x-chat-${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "*", // Listen for all changes to handle inserts and replies (updates)
                    schema: "public",
                    table: "x_chat_messages",
                    filter: `room_id=eq.${roomId}`
                },
                (payload) => {
                    const changedMsg = payload.new as XChatMessage;

                    if (payload.eventType === 'INSERT') {
                        setMessages((prev) => {
                            if (prev.some(m => m.id === changedMsg.id)) return prev;
                            return [...prev, changedMsg];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages((prev) => prev.map(m => m.id === changedMsg.id ? changedMsg : m));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, supabase]);

    const sendMessage = useCallback(async (body: string, senderName: string, lane: string = "Free", paidAmount: number = 0) => {
        if (!roomId || !body.trim()) return;

        const { data, error } = await supabase.from("x_chat_messages").insert({
            room_id: roomId,
            sender_name: senderName,
            body: body.trim(),
            lane,
            paid_amount: paidAmount,
            status: "Queued"
        }).select().single();

        if (error) {
            console.error("Failed to send X-Chat message:", error);
            throw error;
        }
        return data;
    }, [roomId, supabase]);

    return { messages, sendMessage };
}
