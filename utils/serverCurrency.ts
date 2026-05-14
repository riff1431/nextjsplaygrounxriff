import { createClient } from "@/utils/supabase/server";

// Default currency symbol — used as fallback
const DEFAULT_SYMBOL = "€";

/**
 * Server-side utility to get the platform's configured currency symbol.
 * Used in API routes where the client-side cs() utility isn't available.
 */
export async function getServerCurrencySymbol(): Promise<string> {
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from("admin_settings")
            .select("value")
            .eq("key", "default_currency")
            .single();

        if (data?.value) {
            const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
            if (parsed?.symbol) return parsed.symbol;
        }
    } catch {
        // Silent fail — return default
    }
    return DEFAULT_SYMBOL;
}
