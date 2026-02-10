"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { DollarSign, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Profile } from "@/types";

export default function SubscriptionSettings({ user }: { user: any }) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [prices, setPrices] = useState({
        weekly: "",
        monthly: ""
    });

    useEffect(() => {
        if (user?.id) {
            fetchSettings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.id]);

    const fetchSettings = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('subscription_price_weekly, subscription_price_monthly')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching settings:', error);
            return;
        }

        if (data) {
            setPrices({
                weekly: data.subscription_price_weekly?.toString() || "",
                monthly: data.subscription_price_monthly?.toString() || ""
            });
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const weeklyPrice = parseFloat(prices.weekly);
            const monthlyPrice = parseFloat(prices.monthly);

            if (isNaN(weeklyPrice) && prices.weekly !== "") {
                toast.error("Invalid weekly price");
                setLoading(false);
                return;
            }
            if (isNaN(monthlyPrice) && prices.monthly !== "") {
                toast.error("Invalid monthly price");
                setLoading(false);
                return;
            }

            const updates = {
                subscription_price_weekly: prices.weekly === "" ? null : weeklyPrice,
                subscription_price_monthly: prices.monthly === "" ? null : monthlyPrice,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;

            toast.success("Subscription prices updated!");
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                <DollarSign className="w-5 h-5 text-green-500" />
                Subscription Settings
            </h2>
            <p className="text-sm text-gray-400 mb-6">
                Set your subscription prices. Fans can subscribe to unlock access to all your paid content.
                Leave blank to disable a tier.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Weekly Price ($)
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">$</span>
                        </div>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={prices.weekly}
                            onChange={(e) => setPrices({ ...prices, weekly: e.target.value })}
                            className="bg-black/50 border border-white/10 rounded-xl py-3 pl-8 pr-4 w-full text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
                            placeholder="e.g. 4.99"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Monthly Price ($)
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">$</span>
                        </div>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={prices.monthly}
                            onChange={(e) => setPrices({ ...prices, monthly: e.target.value })}
                            className="bg-black/50 border border-white/10 rounded-xl py-3 pl-8 pr-4 w-full text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
                            placeholder="e.g. 14.99"
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
