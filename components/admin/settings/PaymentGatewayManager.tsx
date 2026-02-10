"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Banknote, Landmark, Save, Eye, EyeOff } from "lucide-react";
import { usePayment } from "../../../app/context/PaymentContext";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { toast } from "sonner";

export default function PaymentGatewayManager() {
    const { config, updateConfig, loading } = usePayment();
    const [formData, setFormData] = useState(config);
    const [saving, setSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState(false);

    // Sync local state when config loads
    useEffect(() => {
        setFormData(config);
    }, [config]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save to admin_settings via context (legacy support)
            await updateConfig(formData);

            // Also sync to payment_settings table for API access
            await syncToPaymentSettings(formData);

            toast.success("Payment gateway settings updated");
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    // Sync to payment_settings table for Stripe API routes
    const syncToPaymentSettings = async (data: typeof formData) => {
        const supabase = (await import("@/utils/supabase/client")).createClient();

        // Sync Stripe
        await supabase
            .from('payment_settings')
            .upsert({
                provider: 'stripe',
                is_enabled: data.stripe.enabled,
                config: { public_key: data.stripe.publicKey },
                secret_config: { secret_key: data.stripe.secretKey },
                updated_at: new Date().toISOString()
            }, { onConflict: 'provider' });

        // Sync PayPal
        await supabase
            .from('payment_settings')
            .upsert({
                provider: 'paypal',
                is_enabled: data.paypal.enabled,
                config: { client_id: data.paypal.clientId },
                secret_config: {},
                updated_at: new Date().toISOString()
            }, { onConflict: 'provider' });

        // Sync Bank
        await supabase
            .from('payment_settings')
            .upsert({
                provider: 'bank',
                is_enabled: data.bank.enabled,
                config: {
                    bank_name: data.bank.bankName,
                    account_name: data.bank.accountName,
                    account_number: data.bank.accountNumber,
                    routing_number: data.bank.routingNumber,
                    instructions: data.bank.instructions
                },
                secret_config: {},
                updated_at: new Date().toISOString()
            }, { onConflict: 'provider' });
    };

    const toggleGateway = (gateway: 'stripe' | 'paypal' | 'bank') => {
        setFormData(prev => ({
            ...prev,
            [gateway]: { ...prev[gateway], enabled: !prev[gateway].enabled }
        }));
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading payment settings...</div>;

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<CreditCard className="w-4 h-4" />}
                title="Payment Gateways"
                sub="Manage active payment methods and configurations."
                right={
                    <NeonButton variant="blue" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                    </NeonButton>
                }
            />

            <div className="mt-6 space-y-6">
                {/* Stripe */}
                <div className={`p-5 rounded-2xl border transition-all ${formData.stripe.enabled ? 'bg-blue-500/5 border-blue-500/20' : 'bg-black/40 border-white/5 opacity-70'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Stripe</div>
                                <div className="text-xs text-gray-400">Credit/Debit Cards</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={formData.stripe.enabled} onChange={() => toggleGateway('stripe')} />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {formData.stripe.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Public Key</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    value={formData.stripe.publicKey}
                                    onChange={(e) => setFormData({ ...formData, stripe: { ...formData.stripe, publicKey: e.target.value } })}
                                    placeholder="pk_test_..."
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Secret Key</label>
                                <div className="relative">
                                    <input
                                        type={showSecrets ? "text" : "password"}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                        value={formData.stripe.secretKey}
                                        onChange={(e) => setFormData({ ...formData, stripe: { ...formData.stripe, secretKey: e.target.value } })}
                                        placeholder="sk_test_..."
                                    />
                                    <button
                                        onClick={() => setShowSecrets(!showSecrets)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                    >
                                        {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* PayPal */}
                <div className={`p-5 rounded-2xl border transition-all ${formData.paypal.enabled ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-black/40 border-white/5 opacity-70'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Banknote className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">PayPal</div>
                                <div className="text-xs text-gray-400">Digital Wallet</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={formData.paypal.enabled} onChange={() => toggleGateway('paypal')} />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {formData.paypal.enabled && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Client ID</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    value={formData.paypal.clientId}
                                    onChange={(e) => setFormData({ ...formData, paypal: { ...formData.paypal, clientId: e.target.value } })}
                                    placeholder="Ad..."
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Bank Transfer */}
                <div className={`p-5 rounded-2xl border transition-all ${formData.bank.enabled ? 'bg-green-500/5 border-green-500/20' : 'bg-black/40 border-white/5 opacity-70'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                <Landmark className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Offline Bank Transfer</div>
                                <div className="text-xs text-gray-400">Manual Approval Required</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={formData.bank.enabled} onChange={() => toggleGateway('bank')} />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>

                    {formData.bank.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Bank Name</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    value={formData.bank.bankName}
                                    onChange={(e) => setFormData({ ...formData, bank: { ...formData.bank, bankName: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Account Name</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    value={formData.bank.accountName}
                                    onChange={(e) => setFormData({ ...formData, bank: { ...formData.bank, accountName: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Account Number</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    value={formData.bank.accountNumber}
                                    onChange={(e) => setFormData({ ...formData, bank: { ...formData.bank, accountNumber: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Routing / IBAN</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
                                    value={formData.bank.routingNumber}
                                    onChange={(e) => setFormData({ ...formData, bank: { ...formData.bank, routingNumber: e.target.value } })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-400 block mb-1">Instructions</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                                    value={formData.bank.instructions}
                                    onChange={(e) => setFormData({ ...formData, bank: { ...formData.bank, instructions: e.target.value } })}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </NeonCard>
    );
}
