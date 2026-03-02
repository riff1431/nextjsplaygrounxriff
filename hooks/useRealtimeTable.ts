"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeTableOptions<T> {
    /** The table name to subscribe to */
    table: string;
    /** The schema (default: 'public') */
    schema?: string;
    /** Filter string, e.g. "room_id=eq.xxx" */
    filter?: string;
    /** Which events to listen for (default: '*') */
    event?: PostgresEvent;
    /** Initial data to populate (from an initial fetch) */
    initialData?: T[];
    /** Whether the subscription is active (default: true) */
    enabled?: boolean;
}

/**
 * Shared hook for subscribing to Supabase Realtime INSERT/UPDATE/DELETE on any table.
 *
 * Usage:
 *   const { data, isConnected } = useRealtimeTable<MyRow>({
 *     table: 'confession_requests',
 *     filter: `room_id=eq.${roomId}`,
 *     initialData: fetchedRequests,
 *   });
 */
export function useRealtimeTable<T extends { id?: string }>({
    table,
    schema = "public",
    filter,
    event = "*",
    initialData = [],
    enabled = true,
}: UseRealtimeTableOptions<T>) {
    const [data, setData] = useState<T[]>(initialData);
    const [isConnected, setIsConnected] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);

    // Sync initialData changes
    useEffect(() => {
        if (initialData.length > 0) {
            setData(initialData);
        }
    }, [initialData]);

    useEffect(() => {
        if (!enabled) return;

        const supabase = createClient();

        const channelName = `realtime-${table}-${filter || "all"}-${Date.now()}`;

        const channelConfig: any = {
            event,
            schema,
            table,
        };
        if (filter) {
            channelConfig.filter = filter;
        }

        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes" as any,
                channelConfig,
                (payload: RealtimePostgresChangesPayload<T>) => {
                    const { eventType, new: newRecord, old: oldRecord } = payload;

                    setData((prev) => {
                        switch (eventType) {
                            case "INSERT":
                                // Avoid duplicates
                                if (newRecord && (newRecord as any).id) {
                                    const exists = prev.some((item) => (item as any).id === (newRecord as any).id);
                                    if (exists) return prev;
                                }
                                return [...prev, newRecord as T];

                            case "UPDATE":
                                return prev.map((item) =>
                                    (item as any).id === (newRecord as any)?.id
                                        ? { ...item, ...(newRecord as T) }
                                        : item
                                );

                            case "DELETE":
                                return prev.filter(
                                    (item) => (item as any).id !== (oldRecord as any)?.id
                                );

                            default:
                                return prev;
                        }
                    });
                }
            )
            .subscribe((status) => {
                setIsConnected(status === "SUBSCRIBED");
            });

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [table, schema, filter, event, enabled]);

    /** Manually add an item (optimistic update) */
    const addItem = useCallback((item: T) => {
        setData((prev) => [...prev, item]);
    }, []);

    /** Manually update an item (optimistic update) */
    const updateItem = useCallback((id: string, updates: Partial<T>) => {
        setData((prev) =>
            prev.map((item) =>
                (item as any).id === id ? { ...item, ...updates } : item
            )
        );
    }, []);

    /** Manually remove an item (optimistic update) */
    const removeItem = useCallback((id: string) => {
        setData((prev) => prev.filter((item) => (item as any).id !== id));
    }, []);

    return {
        data,
        setData,
        isConnected,
        addItem,
        updateItem,
        removeItem,
    };
}
