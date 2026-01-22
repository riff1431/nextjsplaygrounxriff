"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export interface PaymentConfig {
    stripe: {
        enabled: boolean;
        publicKey: string;
        secretKey: string; // Ensure this is never exposed to client if possible, but for this app architecture it might be needed for simple integration or masked
    };
    paypal: {
        enabled: boolean;
        clientId: string;
    };
    bank: {
        enabled: boolean;
        bankName: string;
        accountName: string;
        accountNumber: string;
        routingNumber: string;
        instructions: string;
    };
}

const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
    stripe: { enabled: true, publicKey: "", secretKey: "" },
    paypal: { enabled: true, clientId: "" },
    bank: {
        enabled: true,
        bankName: "Bank of America",
        accountName: "PlayGroundX Inc",
        accountNumber: "1234567890",
        routingNumber: "987654321",
        instructions: "Please include your username in the reference."
    },
};

interface PaymentContextType {
    config: PaymentConfig;
    updateConfig: (newConfig: Partial<PaymentConfig>) => Promise<void>;
    loading: boolean;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const { data, error } = await supabase
                .from("admin_settings")
                .select("value")
                .eq("key", "payment_config")
                .single();

            if (data?.value) {
                // Merge with default to ensure structure exists
                setConfig(prev => ({
                    ...prev,
                    stripe: { ...prev.stripe, ...data.value.stripe },
                    paypal: { ...prev.paypal, ...data.value.paypal },
                    bank: { ...prev.bank, ...data.value.bank },
                }));
            }
        } catch (error) {
            console.error("Error fetching payment config:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = async (newConfig: Partial<PaymentConfig>) => {
        const updated = { ...config, ...newConfig };
        setConfig(updated);

        try {
            const { error } = await supabase
                .from("admin_settings")
                .upsert({
                    key: "payment_config",
                    value: updated as any,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error("Failed to persist payment config:", error);
            // Optionally revert logic here
        }
    };

    return (
        <PaymentContext.Provider value={{ config, updateConfig, loading }}>
            {children}
        </PaymentContext.Provider>
    );
}

export const usePayment = () => {
    const context = useContext(PaymentContext);
    if (!context) {
        throw new Error("usePayment must be used within a PaymentProvider");
    }
    return context;
};
