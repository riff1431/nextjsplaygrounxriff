"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { _setCurrency } from "@/utils/currency";

export interface CurrencyConfig {
    code: string;   // e.g. "EUR", "USD", "GBP"
    symbol: string; // e.g. "€", "$", "£"
    name: string;   // e.g. "Euro", "US Dollar", "British Pound"
}

/** All supported currencies */
export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "SEK", symbol: "kr", name: "Swedish Krona" },
    { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
    { code: "DKK", symbol: "kr", name: "Danish Krone" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
    { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
    { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
    { code: "TRY", symbol: "₺", name: "Turkish Lira" },
    { code: "PLN", symbol: "zł", name: "Polish Zloty" },
    { code: "CZK", symbol: "Kč", name: "Czech Koruna" },
    { code: "THB", symbol: "฿", name: "Thai Baht" },
    { code: "KRW", symbol: "₩", name: "South Korean Won" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
    { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
];

const DEFAULT_CURRENCY: CurrencyConfig = {
    code: "EUR",
    symbol: "€",
    name: "Euro",
};

interface CurrencyContextType {
    currency: CurrencyConfig;
    /** Format a numeric amount with the currency symbol, e.g. "€10.00" */
    formatPrice: (amount: number, decimals?: number) => string;
    /** Update the default currency (admin only) */
    updateCurrency: (newCurrency: CurrencyConfig) => Promise<void>;
    loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrency] = useState<CurrencyConfig>(DEFAULT_CURRENCY);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    // Sync global store whenever currency changes
    useEffect(() => {
        _setCurrency(currency.symbol, currency.code, currency.name);
    }, [currency]);

    useEffect(() => {
        fetchCurrency();

        // Realtime Subscription (Broadcast)
        const channel = supabase.channel('global_currency')
            .on(
                'broadcast',
                { event: 'currency_updated' },
                (payload) => {
                    const newCurrency = payload.payload as CurrencyConfig;
                    if (newCurrency && newCurrency.code && newCurrency.symbol) {
                        setCurrency(newCurrency);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchCurrency = async () => {
        try {
            const res = await fetch('/api/v1/currency', { cache: 'no-store' });
            const data = await res.json();

            if (data?.value) {
                const val = data.value;
                setCurrency({
                    code: val.code || DEFAULT_CURRENCY.code,
                    symbol: val.symbol || DEFAULT_CURRENCY.symbol,
                    name: val.name || DEFAULT_CURRENCY.name,
                });
            }
        } catch (error) {
            console.error("Error fetching currency:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateCurrency = async (newCurrency: CurrencyConfig) => {
        setCurrency(newCurrency); // Optimistic update

        try {
            // 1. Save to DB
            const { error } = await supabase
                .from("admin_settings")
                .upsert({
                    key: "default_currency",
                    value: newCurrency as any,
                    description: "Default platform currency",
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // 2. Broadcast the update to everyone
            await supabase.channel('global_currency').send({
                type: 'broadcast',
                event: 'currency_updated',
                payload: newCurrency
            });

        } catch (error) {
            console.error("Failed to persist currency settings:", error);
        }
    };

    const formatPrice = useCallback((amount: number, decimals: number = 0) => {
        // For currencies like JPY/KRW that don't use decimals
        const noDecimalCurrencies = ['JPY', 'KRW'];
        const d = noDecimalCurrencies.includes(currency.code) ? 0 : decimals;
        return `${currency.symbol}${amount.toFixed(d)}`;
    }, [currency]);

    return (
        <CurrencyContext.Provider value={{ currency, formatPrice, updateCurrency, loading }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error("useCurrency must be used within a CurrencyProvider");
    }
    return context;
};
