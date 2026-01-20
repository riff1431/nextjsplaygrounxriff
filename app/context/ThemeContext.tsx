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
    }, []);

    const fetchTheme = async () => {
        try {
            const { data, error } = await supabase
                .from("admin_settings")
                .select("value")
                .eq("key", "theme_config")
                .single();

            if (data?.value) {
                setTheme({ ...DEFAULT_THEME, ...data.value });
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
            const { error } = await supabase
                .from("admin_settings")
                .upsert({
                    key: "theme_config",
                    value: updated as any,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
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
