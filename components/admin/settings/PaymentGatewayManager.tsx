"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Banknote, Landmark, Save, Eye, EyeOff, Zap, CheckCircle2, XCircle, Loader2, AlertTriangle, ExternalLink, ShieldCheck, Info } from "lucide-react";
import { usePayment } from "../../../app/context/PaymentContext";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { toast } from "sonner";

interface StripeTestResult {
    success: boolean;
    mode?: 'live' | 'test';
    accountName?: string;
    country?: string;
    currency?: string;
    error?: string;
}

export default function PaymentGatewayManager() {
    const { config, updateConfig, loading } = usePayment();
    const [formData, setFormData] = useState(config);
    const [saving, setSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState(false);
    const [testingStripe, setTestingStripe] = useState(false);
    const [stripeTestResult, setStripeTestResult] = useState<StripeTestResult | null>(null);
    const [stripeConnectionStatus, setStripeConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

    // Sync local state when config loads
    useEffect(() => {
        setFormData(config);
    }, [config]);

    // Auto-check Stripe connection status on load
    useEffect(() => {
        if (!loading && config.stripe.enabled && config.stripe.publicKey && config.stripe.secretKey) {
            checkStripeConnection(config.stripe.secretKey, config.stripe.publicKey, true);
        }
    }, [loading]);

    const checkStripeConnection = async (secretKey: string, publicKey: string, silent = false) => {
        if (!silent) setTestingStripe(true);
        setStripeTestResult(null);

        try {
            const res = await fetch('/api/v1/payments/stripe/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secretKey, publicKey }),
            });

            const data: StripeTestResult = await res.json();
            setStripeTestResult(data);
            setStripeConnectionStatus(data.success ? 'connected' : 'disconnected');

            if (!silent) {
                if (data.success) {
                    toast.success(`Stripe connected! (${data.mode?.toUpperCase()} mode — ${data.accountName})`);
                } else {
                    toast.error(data.error || 'Stripe connection failed');
                }
            }
        } catch (err) {
            setStripeConnectionStatus('disconnected');
            if (!silent) toast.error('Failed to test Stripe connection');
        } finally {
            setTestingStripe(false);
        }
    };

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
        // Reset test results when toggling stripe
        if (gateway === 'stripe') {
            setStripeTestResult(null);
            setStripeConnectionStatus('unknown');
        }
    };

    const getStripeMode = () => {
        if (formData.stripe.publicKey.startsWith('pk_live_')) return 'live';
        if (formData.stripe.publicKey.startsWith('pk_test_')) return 'test';
        return null;
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
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                    </NeonButton>
                }
            />

            <div className="mt-6 space-y-6">
                {/* Stripe */}
                <div className={`rounded-2xl border transition-all overflow-hidden ${formData.stripe.enabled ? 'bg-blue-500/5 border-blue-500/20' : 'bg-black/40 border-white/5 opacity-70'}`}>
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                    stripeConnectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                                    stripeConnectionStatus === 'disconnected' ? 'bg-red-500/20 text-red-400' :
                                    'bg-blue-500/20 text-blue-400'
                                }`}>
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-white">Stripe</div>
                                        {stripeConnectionStatus === 'connected' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                                <CheckCircle2 className="w-3 h-3" /> CONNECTED
                                            </span>
                                        )}
                                        {stripeConnectionStatus === 'disconnected' && formData.stripe.enabled && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                                <XCircle className="w-3 h-3" /> NOT CONNECTED
                                            </span>
                                        )}
                                        {getStripeMode() && formData.stripe.enabled && (
                                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                                getStripeMode() === 'live'
                                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                                    : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                            }`}>
                                                {getStripeMode()?.toUpperCase()} MODE
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400">Credit/Debit Cards • Visa, Mastercard, Amex</div>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={formData.stripe.enabled} onChange={() => toggleGateway('stripe')} />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {formData.stripe.enabled && (
                            <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                                {/* Setup Instructions */}
                                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                                        <div className="text-xs text-blue-300/80 leading-relaxed">
                                            <span className="font-semibold text-blue-300">How to get your keys:</span> Go to{' '}
                                            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 inline-flex items-center gap-0.5">
                                                Stripe Dashboard → API Keys <ExternalLink className="w-3 h-3" />
                                            </a>
                                            {' '}→ Copy your Publishable key and Secret key below. Use <span className="font-mono text-blue-400">pk_test_</span> / <span className="font-mono text-blue-400">sk_test_</span> keys for testing.
                                        </div>
                                    </div>
                                </div>

                                {/* Key Inputs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">Publishable Key</label>
                                        <input
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition"
                                            value={formData.stripe.publicKey}
                                            onChange={(e) => {
                                                setFormData({ ...formData, stripe: { ...formData.stripe, publicKey: e.target.value } });
                                                setStripeTestResult(null);
                                                setStripeConnectionStatus('unknown');
                                            }}
                                            placeholder="pk_test_... or pk_live_..."
                                        />
                                        {formData.stripe.publicKey && !formData.stripe.publicKey.startsWith('pk_') && (
                                            <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Must start with pk_test_ or pk_live_
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">Secret Key</label>
                                        <div className="relative">
                                            <input
                                                type={showSecrets ? "text" : "password"}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono pr-10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition"
                                                value={formData.stripe.secretKey}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, stripe: { ...formData.stripe, secretKey: e.target.value } });
                                                    setStripeTestResult(null);
                                                    setStripeConnectionStatus('unknown');
                                                }}
                                                placeholder="sk_test_... or sk_live_..."
                                            />
                                            <button
                                                onClick={() => setShowSecrets(!showSecrets)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                                                type="button"
                                            >
                                                {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        {formData.stripe.secretKey && !formData.stripe.secretKey.startsWith('sk_') && (
                                            <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Must start with sk_test_ or sk_live_
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Test Connection + Result */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => checkStripeConnection(formData.stripe.secretKey, formData.stripe.publicKey)}
                                        disabled={testingStripe || !formData.stripe.publicKey || !formData.stripe.secretKey}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 hover:border-blue-500/50"
                                    >
                                        {testingStripe ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                                        ) : (
                                            <><Zap className="w-4 h-4" /> Test Connection</>
                                        )}
                                    </button>

                                    {!formData.stripe.publicKey && !formData.stripe.secretKey && (
                                        <span className="text-xs text-gray-500">Enter your API keys to get started</span>
                                    )}
                                </div>

                                {/* Test Result */}
                                {stripeTestResult && (
                                    <div className={`p-3 rounded-xl border animate-in fade-in slide-in-from-top-1 ${
                                        stripeTestResult.success
                                            ? 'bg-green-500/5 border-green-500/20'
                                            : 'bg-red-500/5 border-red-500/20'
                                    }`}>
                                        {stripeTestResult.success ? (
                                            <div className="flex items-start gap-2">
                                                <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-green-400">Connection Verified</p>
                                                    <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-400">
                                                        <span>Account: <span className="text-white font-medium">{stripeTestResult.accountName}</span></span>
                                                        <span>Mode: <span className={`font-bold ${stripeTestResult.mode === 'live' ? 'text-orange-400' : 'text-purple-400'}`}>{stripeTestResult.mode?.toUpperCase()}</span></span>
                                                        {stripeTestResult.country && <span>Country: <span className="text-white font-medium">{stripeTestResult.country?.toUpperCase()}</span></span>}
                                                        {stripeTestResult.currency && <span>Currency: <span className="text-white font-medium">{stripeTestResult.currency?.toUpperCase()}</span></span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2">
                                                <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-red-400">Connection Failed</p>
                                                    <p className="text-xs text-red-300/80 mt-0.5">{stripeTestResult.error}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Mode Warning */}
                                {getStripeMode() === 'live' && (
                                    <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
                                        <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                                        <p className="text-xs text-orange-300/80">
                                            <span className="font-semibold text-orange-300">Live mode active.</span> Real charges will be made. Use <span className="font-mono">pk_test_</span> / <span className="font-mono">sk_test_</span> keys for testing.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
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
