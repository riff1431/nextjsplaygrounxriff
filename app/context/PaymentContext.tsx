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
    riskpaygo: {
        enabled: boolean;
        apiUrl: string;
        merchantId: string;
        apiToken: string;
        webhookSecret: string;
        returnUrl: string;
        cancelUrl: string;
        mode: 'test' | 'live';
    };
    nowpayments: {
        enabled: boolean;
        apiKey: string;
        ipnSecret: string;
        mode: 'sandbox' | 'production';
    };
    paygate: {
        enabled: boolean;
        apiUrl: string;
        checkoutUrl: string;
        usdcAddress: string;
        affiliateWallet: string;
        commissionPercent: number;
        ipnSecret: string;
        returnUrl: string;
        cancelUrl: string;
    };
    payram: {
        enabled: boolean;
        apiUrl: string;
        apiKey: string;
        currency: string;
        returnUrl: string;
        cancelUrl: string;
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
    riskpaygo: {
        enabled: false,
        apiUrl: "https://riskpaygo.com/portal/api/plugin",
        merchantId: "",
        apiToken: "",
        webhookSecret: "",
        returnUrl: "",
        cancelUrl: "",
        mode: "test"
    },
    nowpayments: {
        enabled: false,
        apiKey: "",
        ipnSecret: "",
        mode: "sandbox"
    },
    paygate: {
        enabled: false,
        apiUrl: "https://api.paygate.to",
        checkoutUrl: "https://checkout.paygate.to",
        usdcAddress: "",
        affiliateWallet: "",
        commissionPercent: 0,
        ipnSecret: "",
        returnUrl: "",
        cancelUrl: ""
    },
    payram: {
        enabled: false,
        apiUrl: "http://localhost:8080",
        apiKey: "",
        currency: "USDT",
        returnUrl: "",
        cancelUrl: ""
    }
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

            if (data?.value && !error) {
                // Merge with default to ensure structure exists
                setConfig(prev => ({
                    ...prev,
                    stripe: { ...prev.stripe, ...data.value.stripe },
                    paypal: { ...prev.paypal, ...data.value.paypal },
                    bank: { ...prev.bank, ...data.value.bank },
                    riskpaygo: { ...prev.riskpaygo, ...data.value.riskpaygo },
                    nowpayments: { ...prev.nowpayments, ...data.value.nowpayments },
                    paygate: { ...prev.paygate, ...data.value.paygate },
                    payram: { ...prev.payram, ...data.value.payram },
                }));
                setLoading(false);
                return;
            }
        } catch (error) {
            console.warn("Could not load from admin_settings, falling back to public payment_settings table:", error);
        }

        // Fallback: Fetch from public columns of payment_settings table
        try {
            const { data: dbRows, error: dbErr } = await supabase
                .from("payment_settings")
                .select("provider, is_enabled, config");

            if (dbRows && dbRows.length > 0 && !dbErr) {
                setConfig(prev => {
                    const newConfig = { ...prev };
                    dbRows.forEach((row: any) => {
                        const prov = row.provider as keyof PaymentConfig;
                        if (prov === 'stripe') {
                            newConfig.stripe.enabled = row.is_enabled;
                            if (row.config?.public_key) {
                                newConfig.stripe.publicKey = row.config.public_key;
                            }
                        }
                        else if (prov === 'paypal') {
                            newConfig.paypal.enabled = row.is_enabled;
                            if (row.config?.client_id) {
                                newConfig.paypal.clientId = row.config.client_id;
                            }
                        }
                        else if (prov === 'bank') {
                            newConfig.bank.enabled = row.is_enabled;
                            newConfig.bank.bankName = row.config?.bank_name || newConfig.bank.bankName;
                            newConfig.bank.accountName = row.config?.account_name || newConfig.bank.accountName;
                            newConfig.bank.accountNumber = row.config?.account_number || newConfig.bank.accountNumber;
                            newConfig.bank.routingNumber = row.config?.routing_number || row.config?.swift || newConfig.bank.routingNumber;
                            newConfig.bank.instructions = row.config?.instructions || newConfig.bank.instructions;
                        }
                        else if (prov === 'riskpaygo') {
                            newConfig.riskpaygo.enabled = row.is_enabled;
                            newConfig.riskpaygo.apiUrl = row.config?.api_url || newConfig.riskpaygo.apiUrl;
                            newConfig.riskpaygo.returnUrl = row.config?.return_url || newConfig.riskpaygo.returnUrl;
                            newConfig.riskpaygo.cancelUrl = row.config?.cancel_url || newConfig.riskpaygo.cancelUrl;
                            newConfig.riskpaygo.mode = row.config?.mode || newConfig.riskpaygo.mode;
                        }
                        else if (prov === 'nowpayments') {
                            newConfig.nowpayments.enabled = row.is_enabled;
                            newConfig.nowpayments.mode = row.config?.mode || newConfig.nowpayments.mode;
                        }
                        else if (prov === 'paygate') {
                            newConfig.paygate.enabled = row.is_enabled;
                            newConfig.paygate.apiUrl = row.config?.api_url || newConfig.paygate.apiUrl;
                            newConfig.paygate.checkoutUrl = row.config?.checkout_url || newConfig.paygate.checkoutUrl;
                            newConfig.paygate.usdcAddress = row.config?.usdc_address || newConfig.paygate.usdcAddress;
                            newConfig.paygate.affiliateWallet = row.config?.affiliate_wallet || newConfig.paygate.affiliateWallet;
                            newConfig.paygate.commissionPercent = row.config?.commission_percent || newConfig.paygate.commissionPercent;
                            newConfig.paygate.returnUrl = row.config?.return_url || newConfig.paygate.returnUrl;
                            newConfig.paygate.cancelUrl = row.config?.cancel_url || newConfig.paygate.cancelUrl;
                        }
                        else if (prov === 'payram') {
                            newConfig.payram.enabled = row.is_enabled;
                            newConfig.payram.apiUrl = row.config?.api_url || newConfig.payram.apiUrl;
                            newConfig.payram.currency = row.config?.currency || newConfig.payram.currency;
                            newConfig.payram.returnUrl = row.config?.return_url || newConfig.payram.returnUrl;
                            newConfig.payram.cancelUrl = row.config?.cancel_url || newConfig.payram.cancelUrl;
                        }
                    });
                    return newConfig;
                });
            }
        } catch (err) {
            console.error("Fatal error loading fallback config:", err);
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = async (newConfig: Partial<PaymentConfig>) => {
        const updated = { ...config, ...newConfig };
        setConfig(updated);

        try {
            const res = await fetch('/api/admin/payments/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Failed to update payment settings');
            }
        } catch (error) {
            console.error("Failed to persist payment config:", error);
            throw error;
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
