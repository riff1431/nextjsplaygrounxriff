"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

interface ChatMessage {
    id: string;
    session_id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    message: string;
    is_system: boolean;
    created_at: string;
}

/**
 * Shared hook for real-time session chat.
 * Fetches existing messages and subscribes to new ones via Supabase Realtime.
 */
export function useSessionChat(sessionId: string | null) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabaseRef = useRef(createClient());
    const supabase = supabaseRef.current;

    // Fetch existing messages
    const fetchMessages = useCallback(async () => {
        if (!sessionId) return;

        try {
            const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/chat?limit=200`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setMessages(data.messages || []);
        } catch (err: any) {
            console.error("useSessionChat fetch error:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Real-time subscription for new messages
    useEffect(() => {
        if (!sessionId) return;

        const channel = supabase
            .channel(`session-chat-${sessionId}`)
            .on(
                "postgres_changes" as any,
                {
                    event: "INSERT",
                    schema: "public",
                    table: "room_session_messages",
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload: any) => {
                    if (payload.new) {
                        setMessages((prev) => {
                            // Prevent duplicates
                            if (prev.some((m) => m.id === payload.new.id)) return prev;
                            return [...prev, payload.new as ChatMessage];
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [sessionId, supabase]);

    // Send a message
    const sendMessage = useCallback(
        async (message: string) => {
            if (!sessionId || !user || !message.trim()) return;

            setIsSending(true);
            try {
                const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                // Don't manually add — Realtime subscription handles it
                return data;
            } catch (err: any) {
                setError(err.message);
                return { error: err.message };
            } finally {
                setIsSending(false);
            }
        },
        [sessionId, user]
    );

    return {
        messages,
        isLoading,
        isSending,
        error,
        sendMessage,
        refresh: fetchMessages,
    };
}
