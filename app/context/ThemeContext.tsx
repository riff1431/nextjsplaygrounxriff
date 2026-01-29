"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface ThemeSettings {
    siteName: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string;
}

const DEFAULT_THEME: ThemeSettings = {
    siteName: "PlayGroundX",
    logoUrl: null,
    faviconUrl: null,
    primaryColor: "#ec4899", // pink-500
};

interface ThemeContextType {
    theme: ThemeSettings;
    updateTheme: (newSettings: Partial<ThemeSettings>) => Promise<void>;
    loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchTheme();

        // Realtime Subscription (Broadcast)
        // We use Broadcast because it bypasses RLS for the events
        const channel = supabase.channel('global_theme')
            .on(
                'broadcast',
                { event: 'theme_updated' },
                (payload) => {
                    const newTheme = payload.payload as ThemeSettings;
                    if (newTheme) {
                        setTheme(current => ({ ...current, ...newTheme }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchTheme = async () => {
        try {
            // Fetch from API Route to bypass RLS. Ensure no-store to avoid stale data.
            const res = await fetch('/api/v1/theme', { cache: 'no-store' });
            const data = await res.json();

            if (data?.value) {
                const val = data.value;
                // Normalize keys to handle potential snake_case vs camelCase mismatch
                const normalized: ThemeSettings = {
                    ...DEFAULT_THEME,
                    ...val,
                    // Prioritize camelCase, fallback to snake_case
                    logoUrl: val.logoUrl || val.logo_url || null,
                    faviconUrl: val.faviconUrl || val.favicon_url || null,
                    siteName: val.siteName || val.site_name || DEFAULT_THEME.siteName,
                    primaryColor: val.primaryColor || val.primary_color || DEFAULT_THEME.primaryColor
                };
                setTheme(normalized);
            }
        } catch (error) {
            console.error("Error fetching theme:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateTheme = async (newSettings: Partial<ThemeSettings>) => {
        const updated = { ...theme, ...newSettings };
        setTheme(updated); // Optimistic update

        try {
            // 1. Save to DB (as before)
            const { error } = await supabase
                .from("admin_settings")
                .upsert({
                    key: "theme_config",
                    value: updated as any,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // 2. Broadcast the update to everyone
            await supabase.channel('global_theme').send({
                type: 'broadcast',
                event: 'theme_updated',
                payload: updated
            });

        } catch (error) {
            console.error("Failed to persist theme settings:", error);
            // Revert on error? For now, we'll just log.
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, updateTheme, loading }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
