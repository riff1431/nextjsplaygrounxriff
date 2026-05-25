"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { DollarSign, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cs } from "@/utils/currency";

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
    }, [user?.id]);

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

            toast.success("Subscription prices updated successfully!");
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error("Failed to update settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-950/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-green-500/5 rounded-full blur-2xl" />
            
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2.5 text-white">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Configure Membership Tiers
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
                Set weekly and monthly prices for your premium fans. Subscribing unlocks access to all of your exclusive posts, paywalled media, and custom chat privileges. Leave a price blank to disable that tier.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weekly Pricing Input */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Weekly Tier Rate ({cs()})
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 font-bold text-sm">
                            {cs()}
                        </div>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={prices.weekly}
                            onChange={(e) => setPrices({ ...prices, weekly: e.target.value })}
                            className="bg-black/40 border border-white/10 rounded-xl py-3 pl-8 pr-4 w-full text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition duration-200"
                            placeholder="Disable weekly plan"
                        />
                    </div>
                    <p className="text-[10px] text-zinc-500">
                        Charged every 7 days. Best for quick access models.
                    </p>
                </div>

                {/* Monthly Pricing Input */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Monthly Tier Rate ({cs()})
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 font-bold text-sm">
                            {cs()}
                        </div>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={prices.monthly}
                            onChange={(e) => setPrices({ ...prices, monthly: e.target.value })}
                            className="bg-black/40 border border-white/10 rounded-xl py-3 pl-8 pr-4 w-full text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition duration-200"
                            placeholder="Disable monthly plan"
                        />
                    </div>
                    <p className="text-[10px] text-zinc-500">
                        Charged every 30 days. Perfect for long-term memberships.
                    </p>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-pink-500/10 hover:shadow-pink-500/25 transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Updating rates...
                        </>
                    ) : (
                        <>
                            <Save className="w-3.5 h-3.5" />
                            Save Pricing Plan
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
