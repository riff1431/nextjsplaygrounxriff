"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Hook to fetch a page's content from admin_settings.
 * Returns { content, loading } — content is null if no DB entry exists.
 */
export function usePageContent(key: string) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from("admin_settings")
            .select("value")
            .eq("key", key)
            .maybeSingle()
            .then(({ data }) => {
                if (data?.value && data.value.trim()) {
                    setContent(data.value);
                }
                setLoading(false);
            });
    }, [key]);

    return { content, loading };
}
