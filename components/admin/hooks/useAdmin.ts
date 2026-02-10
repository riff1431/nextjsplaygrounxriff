import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

export interface GlobalPricing {
    entry_fee: number;
    free_minutes: number;
    rate_per_minute: number;
    // System Prompt Pricing
    system_truth_bronze?: number;
    system_truth_silver?: number;
    system_truth_gold?: number;
    system_dare_bronze?: number;
    system_dare_silver?: number;
    system_dare_gold?: number;
}

export function useAdmin() {
    const supabase = createClient();

    const logAction = useCallback(async (action: string, target: string, details: object = {}) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('audit_logs').insert({
                actor_id: user.id,
                action,
                target_resource: target,
                details
            });

            if (error) console.error("Failed to log audit:", error);
        } catch (e) {
            console.error("Audit log error:", e);
        }
    }, [supabase]);

    const updateSetting = useCallback(async (key: string, value: any, description?: string) => {
        const { error } = await supabase.from('admin_settings').upsert({
            key,
            value,
            description,
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error("Setting update failed:", error);
            toast.error(`Failed to save ${key}`);
            return false;
        }

        await logAction('UPDATE_SETTING', key, { value });
        toast.success("Settings saved");
        return true;
    }, [supabase, logAction]);

    const fetchSetting = useCallback(async <T>(key: string): Promise<T | null> => {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error || !data) return null;
        return data.value;
    }, [supabase]);

    return {
        logAction,
        updateSetting,
        fetchSetting
    };
}
