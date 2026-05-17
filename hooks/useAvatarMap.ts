"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * useAvatarMap — batch-fetches avatar_url from the `profiles` table
 * for a list of sender IDs and caches the results.
 *
 * Usage:
 *   const avatarMap = useAvatarMap(messages.map(m => m.sender_id));
 *   const url = avatarMap[senderId]; // string | undefined
 */
export function useAvatarMap(senderIds: (string | null | undefined)[]) {
    const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
    const fetchedRef = useRef<Set<string>>(new Set());

    // Derive unique, non-null IDs that haven't been fetched yet
    const newIds = useMemo(() => {
        const unique = new Set<string>();
        for (const id of senderIds) {
            if (id && !fetchedRef.current.has(id)) {
                unique.add(id);
            }
        }
        return Array.from(unique);
    }, [senderIds]);

    useEffect(() => {
        if (newIds.length === 0) return;

        // Mark as fetched immediately to prevent duplicate requests
        newIds.forEach((id) => fetchedRef.current.add(id));

        const supabase = createClient();

        async function fetchAvatars() {
            // Supabase `in` filter supports up to ~300 items; batch if needed
            const batchSize = 100;
            for (let i = 0; i < newIds.length; i += batchSize) {
                const batch = newIds.slice(i, i + batchSize);
                const { data } = await supabase
                    .from("profiles")
                    .select("id, avatar_url")
                    .in("id", batch);

                if (data) {
                    setAvatarMap((prev) => {
                        const next = { ...prev };
                        data.forEach((profile) => {
                            if (profile.avatar_url) {
                                next[profile.id] = profile.avatar_url;
                            }
                        });
                        return next;
                    });
                }
            }
        }

        fetchAvatars();
    }, [newIds]);

    return avatarMap;
}
