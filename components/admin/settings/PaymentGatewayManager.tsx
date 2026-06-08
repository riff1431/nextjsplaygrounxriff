"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Banknote, Landmark, Save, Eye, EyeOff, Zap, CheckCircle2, XCircle, Loader2, AlertTriangle, ExternalLink, ShieldCheck, Info, FileText, Activity, ShieldAlert, Shield, Coins } from "lucide-react";
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

interface RiskTestResult {
    success: boolean;
    warning?: boolean;
    message?: string;
    error?: string;
    details?: any;
    status?: number;
}

interface GatewayField {
    key: string;
    label: string;
    type: 'text' | 'password' | 'select';
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
}

interface DynamicGatewayDef {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    fields: GatewayField[];
    testConnectionEndpoint: string;
    colorClass: string;
    badgeColorClass: string;
}

const DYNAMIC_GATEWAYS: DynamicGatewayDef[] = [
    {
        id: 'nowpayments',
        name: 'NOWPayments',
        description: 'Crypto Payment Gateway • Accept Bitcoin, Ethereum, USDT, and 300+ cryptocurrencies',
        icon: <Coins className="w-5 h-5" />,
        colorClass: 'bg-amber-500/5 border-amber-500/20 peer-checked:bg-amber-600',
        badgeColorClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        fields: [
            {
                key: 'apiKey',
                label: 'API Key',
                type: 'password',
                placeholder: 'Enter NOWPayments API Key',
                required: true
            },
            {
                key: 'ipnSecret',
                label: 'IPN Secret Key',
                type: 'password',
                placeholder: 'Enter Instant Payment Notification Secret Key',
                required: true
            },
            {
                key: 'mode',
                label: 'Gateway Environment Mode',
                type: 'select',
                options: [
                    { label: 'Sandbox (Test Mode)', value: 'sandbox' },
                    { label: 'Production (Live Mode)', value: 'production' }
                ],
                required: true
            }
        ],
        testConnectionEndpoint: '/api/v1/payments/nowpayments/test-connection'
    }
];

export default function PaymentGatewayManager() {
    const { config, updateConfig, loading } = usePayment();
    const [formData, setFormData] = useState(config);
    const [saving, setSaving] = useState(false);
    
    // Stripe states
    const [showSecrets, setShowSecrets] = useState(false);
    const [testingStripe, setTestingStripe] = useState(false);
    const [stripeTestResult, setStripeTestResult] = useState<StripeTestResult | null>(null);
    const [stripeConnectionStatus, setStripeConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

    // RiskPayGo states
    const [showRiskSecrets, setShowRiskSecrets] = useState(false);
    const [testingRisk, setTestingRisk] = useState(false);
    const [riskTestResult, setRiskTestResult] = useState<RiskTestResult | null>(null);
    const [riskConnectionStatus, setRiskConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
    const [generatingTestPayment, setGeneratingTestPayment] = useState(false);
    
    // Dynamic gateways state
    const [testingStates, setTestingStates] = useState<Record<string, boolean>>({});
    const [testResults, setTestResults] = useState<Record<string, any>>({});
    const [connectionStatuses, setConnectionStatuses] = useState<Record<string, 'unknown' | 'connected' | 'disconnected'>>({});
    const [showSecretsMap, setShowSecretsMap] = useState<Record<string, boolean>>({});
    
    // Log drawer states
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [showLogsDrawer, setShowLogsDrawer] = useState(false);

    // Sync local state when config loads
    useEffect(() => {
        setFormData(config);
        // Pre-populate masked secrets for RiskPayGo if values are already saved in context (or default)
        if (config?.riskpaygo) {
            setFormData(prev => ({
                ...prev,
                riskpaygo: {
                    ...prev.riskpaygo,
                    apiToken: config.riskpaygo.apiToken ? "••••••••••••••••" : "",
                    webhookSecret: config.riskpaygo.webhookSecret ? "••••••••••••••••" : ""
                }
            }));
        }
        if (config?.nowpayments) {
            setFormData(prev => ({
                ...prev,
                nowpayments: {
                    ...prev.nowpayments,
                    apiKey: config.nowpayments.apiKey ? "••••••••••••••••" : "",
                    ipnSecret: config.nowpayments.ipnSecret ? "••••••••••••••••" : ""
                }
            }));
        }
    }, [config]);

    // Auto-check Stripe connection status on load
    useEffect(() => {
        if (!loading && config.stripe.enabled && config.stripe.publicKey && config.stripe.secretKey) {
            checkStripeConnection(config.stripe.secretKey, config.stripe.publicKey, true);
        }
        if (!loading && config.riskpaygo?.enabled && config.riskpaygo?.apiUrl && config.riskpaygo?.merchantId) {
            // For RiskPayGo we can check on click to avoid hitting APIs unnecessarily on every load
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

    const handleTestRiskConnection = async () => {
        setTestingRisk(true);
        setRiskTestResult(null);
        try {
            // Read unmasked settings (or placeholders which backend will substitute)
            const res = await fetch('/api/v1/payments/riskpaygo/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiUrl: formData.riskpaygo.apiUrl,
                    merchantId: formData.riskpaygo.merchantId,
                    apiToken: formData.riskpaygo.apiToken,
                    webhookSecret: formData.riskpaygo.webhookSecret,
                    mode: formData.riskpaygo.mode
                })
            });
            const data: RiskTestResult = await res.json();
            setRiskTestResult(data);
            setRiskConnectionStatus(data.success ? 'connected' : 'disconnected');
            
            if (data.success) {
                if (data.warning) {
                    toast.warning(data.error || "Credentials verified with projects warning.");
                } else {
                    toast.success(data.message || "RiskPayGo connection successful!");
                }
            } else {
                toast.error(data.error || "Connection test failed");
            }
        } catch (err) {
            setRiskConnectionStatus('disconnected');
            toast.error("Failed to run RiskPayGo connection test");
        } finally {
            setTestingRisk(false);
        }
    };

    const handleTestDynamicConnection = async (gatewayId: string, testEndpoint: string, fields: GatewayField[]) => {
        setTestingStates(prev => ({ ...prev, [gatewayId]: true }));
        setTestResults(prev => ({ ...prev, [gatewayId]: null }));
        
        try {
            const gatewayData = (formData as any)[gatewayId] || {};
            const payload: Record<string, any> = {};
            fields.forEach(field => {
                payload[field.key] = gatewayData[field.key];
            });

            const res = await fetch(testEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            setTestResults(prev => ({ ...prev, [gatewayId]: data }));
            setConnectionStatuses(prev => ({ ...prev, [gatewayId]: data.success ? 'connected' : 'disconnected' }));
            
            if (data.success) {
                toast.success(data.message || `${gatewayId.toUpperCase()} connection successful!`);
            } else {
                toast.error(data.error || "Connection test failed");
            }
        } catch (err) {
            setConnectionStatuses(prev => ({ ...prev, [gatewayId]: 'disconnected' }));
            toast.error(`Failed to run ${gatewayId.toUpperCase()} connection test`);
        } finally {
            setTestingStates(prev => ({ ...prev, [gatewayId]: false }));
        }
    };

    const handleGenerateTestPayment = async () => {
        setGeneratingTestPayment(true);
        try {
            const res = await fetch('/api/v1/payments/riskpaygo/test-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success && data.checkoutUrl) {
                toast.success("Test checkout generated successfully!");
                window.open(data.checkoutUrl, '_blank');
            } else {
                toast.error(data.error || "Failed to generate test checkout");
            }
        } catch (err) {
            toast.error("Fatal error generating test payment");
        } finally {
            setGeneratingTestPayment(false);
        }
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await fetch('/api/admin/payments/riskpaygo/logs');
            const data = await res.json();
            if (data.logs) {
                setLogs(data.logs);
            }
            if (data.warning) {
                toast.warning(data.warning);
            }
        } catch (err) {
            toast.error("Failed to load gateway logs");
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save to admin_settings and sync to payment_settings via context API route
            await updateConfig(formData);
            toast.success("Payment gateway settings updated");
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const toggleGateway = (gateway: string) => {
        setFormData((prev: any) => ({
            ...prev,
            [gateway]: { ...prev[gateway], enabled: !prev[gateway].enabled }
        }));
        // Reset test results when toggling
        if (gateway === 'stripe') {
            setStripeTestResult(null);
            setStripeConnectionStatus('unknown');
        } else if (gateway === 'riskpaygo') {
            setRiskTestResult(null);
            setRiskConnectionStatus('unknown');
        } else {
            setTestResults(prev => ({ ...prev, [gateway]: null }));
            setConnectionStatuses(prev => ({ ...prev, [gateway]: 'unknown' }));
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

                {/* RiskPayGo Gateway */}
                <div className={`rounded-2xl border transition-all overflow-hidden ${formData.riskpaygo?.enabled ? 'bg-pink-500/5 border-pink-500/20' : 'bg-black/40 border-white/5 opacity-70'}`}>
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                    riskConnectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                                    riskConnectionStatus === 'disconnected' ? 'bg-red-500/20 text-red-400' :
                                    'bg-pink-500/20 text-pink-400'
                                }`}>
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-white">RiskPayGo Checkout</div>
                                        {riskConnectionStatus === 'connected' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                                <CheckCircle2 className="w-3 h-3" /> CONNECTED
                                            </span>
                                        )}
                                        {riskConnectionStatus === 'disconnected' && formData.riskpaygo?.enabled && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                                <XCircle className="w-3 h-3" /> FAILED
                                            </span>
                                        )}
                                        {formData.riskpaygo?.enabled && (
                                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                                formData.riskpaygo.mode === 'live'
                                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                                    : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                            }`}>
                                                {formData.riskpaygo.mode?.toUpperCase()} MODE
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400">High-Risk Processing Solution • Global Checkout Routing</div>
                                </div>
                            </div>
                            <label className="relative inline-flex inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={formData.riskpaygo?.enabled} onChange={() => toggleGateway('riskpaygo')} />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                            </label>
                        </div>

                        {formData.riskpaygo?.enabled && (
                            <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                                {/* Instructions */}
                                <div className="p-3 rounded-xl bg-pink-500/5 border border-pink-500/10">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-4 h-4 text-pink-400 mt-0.5 shrink-0" />
                                        <div className="text-xs text-pink-300/80 leading-relaxed">
                                            <span className="font-semibold text-pink-300 font-bold">API Requirements:</span> Base URL must be `<span className="font-mono">https://riskpaygo.com/portal/api/plugin</span>`. Enter your private Merchant credentials. The callback URL for webhooks is automatically structured on submission.
                                        </div>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">API Base URL</label>
                                        <input
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 focus:outline-none transition"
                                            value={formData.riskpaygo.apiUrl}
                                            onChange={(e) => setFormData({ ...formData, riskpaygo: { ...formData.riskpaygo, apiUrl: e.target.value } })}
                                            placeholder="https://riskpaygo.com/portal/api/plugin"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">Merchant ID</label>
                                        <input
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 focus:outline-none transition"
                                            value={formData.riskpaygo.merchantId}
                                            onChange={(e) => setFormData({ ...formData, riskpaygo: { ...formData.riskpaygo, merchantId: e.target.value } })}
                                            placeholder="Enter Merchant ID"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">Gateway Environment Mode</label>
                                        <select
                                            className="w-full bg-black/80 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 focus:outline-none transition"
                                            value={formData.riskpaygo.mode}
                                            onChange={(e) => setFormData({ ...formData, riskpaygo: { ...formData.riskpaygo, mode: e.target.value as 'test' | 'live' } })}
                                        >
                                            <option value="test">Sandbox (Test Mode)</option>
                                            <option value="live">Production (Live Mode)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">API Private Token</label>
                                        <div className="relative">
                                            <input
                                                type={showRiskSecrets ? "text" : "password"}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono pr-10 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 focus:outline-none transition"
                                                value={formData.riskpaygo.apiToken}
                                                onChange={(e) => setFormData({ ...formData, riskpaygo: { ...formData.riskpaygo, apiToken: e.target.value } })}
                                                placeholder="Enter Private token key"
                                            />
                                            <button
                                                onClick={() => setShowRiskSecrets(!showRiskSecrets)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                                                type="button"
                                            >
                                                {showRiskSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">Webhook Secret</label>
                                        <div className="relative">
                                            <input
                                                type={showRiskSecrets ? "text" : "password"}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono pr-10 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 focus:outline-none transition"
                                                value={formData.riskpaygo.webhookSecret}
                                                onChange={(e) => setFormData({ ...formData, riskpaygo: { ...formData.riskpaygo, webhookSecret: e.target.value } })}
                                                placeholder="Enter Webhook Signature Key"
                                            />
                                            <button
                                                onClick={() => setShowRiskSecrets(!showRiskSecrets)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                                                type="button"
                                            >
                                                {showRiskSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">Return URL (Redirect after payment)</label>
                                        <input
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 focus:outline-none transition"
                                            value={formData.riskpaygo.returnUrl}
                                            onChange={(e) => setFormData({ ...formData, riskpaygo: { ...formData.riskpaygo, returnUrl: e.target.value } })}
                                            placeholder="https://your-domain.com/account/wallet?status=success"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">Cancel URL (Redirect on cancellation)</label>
                                        <input
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 focus:outline-none transition"
                                            value={formData.riskpaygo.cancelUrl}
                                            onChange={(e) => setFormData({ ...formData, riskpaygo: { ...formData.riskpaygo, cancelUrl: e.target.value } })}
                                            placeholder="https://your-domain.com/account/wallet?status=cancelled"
                                        />
                                    </div>
                                </div>

                                {/* Actions Panels */}
                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <button
                                        onClick={handleTestRiskConnection}
                                        disabled={testingRisk || !formData.riskpaygo.apiUrl || !formData.riskpaygo.merchantId || !formData.riskpaygo.apiToken}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 border border-pink-500/30 hover:border-pink-500/50"
                                    >
                                        {testingRisk ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Verifying Connection...</>
                                        ) : (
                                            <><Zap className="w-4 h-4" /> Run Connection Test</>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleGenerateTestPayment}
                                        disabled={generatingTestPayment || !config.riskpaygo?.enabled}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20"
                                    >
                                        {generatingTestPayment ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Spawning Checkout...</>
                                        ) : (
                                            <><Activity className="w-4 h-4" /> Run Payment Test (€1.00)</>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => {
                                            setShowLogsDrawer(true);
                                            fetchLogs();
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                                    >
                                        <FileText className="w-4 h-4" /> View Gateway Event Logs
                                    </button>
                                </div>

                                {/* Test Result Display */}
                                {riskTestResult && (
                                    <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-1 ${
                                        riskTestResult.success 
                                            ? riskTestResult.warning 
                                                ? 'bg-orange-500/5 border-orange-500/20' 
                                                : 'bg-green-500/5 border-green-500/20'
                                            : 'bg-red-500/5 border-red-500/20'
                                    }`}>
                                        {riskTestResult.success ? (
                                            <div className="flex items-start gap-2.5">
                                                {riskTestResult.warning ? (
                                                    <ShieldAlert className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                                                ) : (
                                                    <ShieldCheck className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                                                )}
                                                <div>
                                                    <p className={`text-sm font-bold ${riskTestResult.warning ? 'text-orange-400' : 'text-green-400'}`}>
                                                        {riskTestResult.warning ? 'Connection OK — Domain Action Required' : 'Credentials & Connection Verified'}
                                                    </p>
                                                    <p className="text-xs text-gray-300/90 mt-1 leading-relaxed">
                                                        {riskTestResult.message || riskTestResult.error}
                                                    </p>
                                                    {riskTestResult.details && (
                                                        <div className="mt-2 text-[10px] font-mono bg-black/50 p-2 rounded border border-white/5 text-gray-400 max-h-24 overflow-y-auto">
                                                            {JSON.stringify(riskTestResult.details, null, 2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2.5">
                                                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-bold text-red-400">Connection Terminated</p>
                                                    <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
                                                        {riskTestResult.error}
                                                    </p>
                                                    {riskTestResult.details && (
                                                        <p className="text-[10px] font-mono text-red-400/70 mt-1">
                                                            Gateway response code: {riskTestResult.status || 500}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
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
                                    placeholder="Enter PayPal Client ID"
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

                {/* Dynamic Gateways (e.g. NOWPayments) */}
                {DYNAMIC_GATEWAYS.map((gateway) => {
                    const gatewayConfig = (formData as any)[gateway.id] || { enabled: false };
                    const isEnabled = !!gatewayConfig.enabled;
                    const connectionStatus = connectionStatuses[gateway.id] || 'unknown';
                    const isTesting = !!testingStates[gateway.id];
                    const testResult = testResults[gateway.id];
                    const showSecrets = !!showSecretsMap[gateway.id];

                    return (
                        <div key={gateway.id} className={`rounded-2xl border transition-all overflow-hidden ${isEnabled ? gateway.colorClass : 'bg-black/40 border-white/5 opacity-70'}`}>
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                                            connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
                                            connectionStatus === 'disconnected' ? 'bg-red-500/20 text-red-400' :
                                            gateway.badgeColorClass
                                        }`}>
                                            {gateway.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-bold text-white">{gateway.name}</div>
                                                {connectionStatus === 'connected' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                                                        <CheckCircle2 className="w-3 h-3" /> CONNECTED
                                                    </span>
                                                )}
                                                {connectionStatus === 'disconnected' && isEnabled && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                                        <XCircle className="w-3 h-3" /> FAILED
                                                    </span>
                                                )}
                                                {gatewayConfig.mode && isEnabled && (
                                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border bg-purple-500/20 text-purple-400 border-purple-500/30">
                                                        {gatewayConfig.mode.toUpperCase()} MODE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400">{gateway.description}</div>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isEnabled} onChange={() => toggleGateway(gateway.id)} />
                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                    </label>
                                </div>

                                {isEnabled && (
                                    <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        {/* Key Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {gateway.fields.map((field) => {
                                                const value = gatewayConfig[field.key] || "";
                                                return (
                                                    <div key={field.key}>
                                                        <label className="text-xs text-gray-400 block mb-1.5 font-medium">{field.label}</label>
                                                        {field.type === 'select' ? (
                                                            <select
                                                                className="w-full bg-black/80 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500/50 transition"
                                                                value={value}
                                                                onChange={(e) => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        [gateway.id]: {
                                                                            ...(prev as any)[gateway.id],
                                                                            [field.key]: e.target.value
                                                                        }
                                                                    }));
                                                                    setTestResults(prev => ({ ...prev, [gateway.id]: null }));
                                                                    setConnectionStatuses(prev => ({ ...prev, [gateway.id]: 'unknown' }));
                                                                }}
                                                            >
                                                                {field.options?.map((opt) => (
                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                ))}
                                                            </select>
                                                        ) : field.type === 'password' ? (
                                                            <div className="relative">
                                                                <input
                                                                    type={showSecrets ? "text" : "password"}
                                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono pr-10 focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500/50 transition"
                                                                    value={value}
                                                                    onChange={(e) => {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            [gateway.id]: {
                                                                                ...(prev as any)[gateway.id],
                                                                                [field.key]: e.target.value
                                                                            }
                                                                        }));
                                                                        setTestResults(prev => ({ ...prev, [gateway.id]: null }));
                                                                        setConnectionStatuses(prev => ({ ...prev, [gateway.id]: 'unknown' }));
                                                                    }}
                                                                    placeholder={field.placeholder}
                                                                />
                                                                <button
                                                                    onClick={() => setShowSecretsMap(prev => ({ ...prev, [gateway.id]: !showSecrets }))}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                                                                    type="button"
                                                                >
                                                                    {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <input
                                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-500/50 transition"
                                                                value={value}
                                                                onChange={(e) => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        [gateway.id]: {
                                                                            ...(prev as any)[gateway.id],
                                                                            [field.key]: e.target.value
                                                                        }
                                                                    }));
                                                                    setTestResults(prev => ({ ...prev, [gateway.id]: null }));
                                                                    setConnectionStatuses(prev => ({ ...prev, [gateway.id]: 'unknown' }));
                                                                }}
                                                                placeholder={field.placeholder}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Test Connection + Result */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleTestDynamicConnection(gateway.id, gateway.testConnectionEndpoint, gateway.fields)}
                                                disabled={isTesting || !gateway.fields.every(f => !!gatewayConfig[f.key])}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 hover:border-amber-500/50"
                                            >
                                                {isTesting ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                                                ) : (
                                                    <><Zap className="w-4 h-4" /> Run Connection Test</>
                                                )}
                                            </button>
                                        </div>

                                        {/* Test Result */}
                                        {testResult && (
                                            <div className={`p-3 rounded-xl border animate-in fade-in slide-in-from-top-1 ${
                                                testResult.success
                                                    ? 'bg-green-500/5 border-green-500/20'
                                                    : 'bg-red-500/5 border-red-500/20'
                                            }`}>
                                                {testResult.success ? (
                                                    <div className="flex items-start gap-2">
                                                        <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                                        <div>
                                                            <p className="text-sm font-semibold text-green-400">Connection Verified</p>
                                                            <p className="text-xs text-gray-400 mt-1">{testResult.message || 'Status verified successfully.'}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-2">
                                                        <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                                        <div>
                                                            <p className="text-sm font-semibold text-red-400">Connection Failed</p>
                                                            <p className="text-xs text-red-300/80 mt-0.5">{testResult.error || 'Check configuration keys.'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Audit Logs Slide-over / Drawer */}
            {showLogsDrawer && (
                <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                            <div className="pointer-events-auto w-screen max-w-2xl transform bg-[#0B0B0C] border-l border-white/10 p-6 shadow-2xl transition-transform duration-300 animate-in slide-in-from-right">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-pink-500" />
                                        <h3 className="text-lg font-bold text-white">RiskPayGo Gateway Activity Logs</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={fetchLogs} 
                                            className="px-3 py-1 rounded bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition"
                                        >
                                            Refresh
                                        </button>
                                        <button 
                                            onClick={() => setShowLogsDrawer(false)}
                                            className="text-gray-400 hover:text-white text-sm font-semibold"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>

                                <div className="h-[calc(100vh-140px)] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                    {loadingLogs ? (
                                        <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
                                            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
                                            <span className="text-xs">Fetching event records...</span>
                                        </div>
                                    ) : logs.length === 0 ? (
                                        <div className="text-center py-16 text-gray-500 border border-white/5 bg-white/5 rounded-xl border-dashed">
                                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-30 text-gray-400" />
                                            <p className="text-sm">No transaction or webhook log records found.</p>
                                            <p className="text-xs text-gray-600 mt-1">Run connection/payment tests to populate activity logs.</p>
                                        </div>
                                    ) : (
                                        logs.map((log) => (
                                            <div key={log.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-2.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
                                                        log.status === 'success' || log.status === 'paid' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                        log.status === 'ignored' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                        'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                    <span className="text-gray-500 font-mono">
                                                        {new Date(log.created_at).toLocaleString()}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-black/40 p-2.5 rounded-lg border border-white/5 font-mono">
                                                    <div>Event: <span className="text-pink-300 font-semibold">{log.event_type}</span></div>
                                                    <div>Ref: <span className="text-white">{log.order_id || 'N/A'}</span></div>
                                                    <div>Status Code: <span className={log.status_code >= 400 ? "text-red-400 font-bold" : "text-green-400"}>{log.status_code || 'N/A'}</span></div>
                                                    <div>Gateway Ref: <span className="text-gray-300">{log.payment_ref || 'N/A'}</span></div>
                                                </div>

                                                {log.request_payload && (
                                                    <details className="cursor-pointer group">
                                                        <summary className="text-xs text-gray-400 font-medium hover:text-white transition py-1 select-none flex items-center gap-1">
                                                            <span>Request Parameters</span>
                                                            <span className="text-[10px] text-gray-600 group-open:rotate-90 transition-transform">▶</span>
                                                        </summary>
                                                        <pre className="mt-1 p-2 bg-black/80 rounded border border-white/5 text-[10px] text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
                                                            {JSON.stringify(log.request_payload, null, 2)}
                                                        </pre>
                                                    </details>
                                                )}

                                                {log.response_payload && (
                                                    <details className="cursor-pointer group">
                                                        <summary className="text-xs text-gray-400 font-medium hover:text-white transition py-1 select-none flex items-center gap-1">
                                                            <span>Gateway Response Details</span>
                                                            <span className="text-[10px] text-gray-600 group-open:rotate-90 transition-transform">▶</span>
                                                        </summary>
                                                        <pre className="mt-1 p-2 bg-black/80 rounded border border-white/5 text-[10px] text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
                                                            {JSON.stringify(log.response_payload, null, 2)}
                                                        </pre>
                                                    </details>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </NeonCard>
    );
}
