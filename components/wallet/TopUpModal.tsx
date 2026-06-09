"use client";

import React, { useState, useEffect } from "react";
import { X, CreditCard, Banknote, Landmark, ChevronRight, Check, Wallet, Loader2, Upload, Shield, AlertCircle } from "lucide-react";
import { usePayment } from "../../app/context/PaymentContext";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import StripePaymentModal from "@/components/live/StripePaymentModal";
import { uploadToLocalServer } from "@/utils/uploadHelper";
import { cs } from "@/utils/currency";
import { useCurrency } from "@/app/context/CurrencyContext";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onTopUp: (amount: number, method: string, status: 'pending' | 'completed', proofUrl?: string) => Promise<void>;
};

export default function TopUpModal({ isOpen, onClose, onTopUp }: Props) {
    const { config } = usePayment();
    const { currency, formatPrice } = useCurrency();
    const supabase = createClient();
    const { user } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [amount, setAmount] = useState<number>(0);
    const [customAmount, setCustomAmount] = useState("");
    const [method, setMethod] = useState<"card" | "paypal" | "bank" | "riskpaygo" | "nowpayments" | "paygate" | "">("");
    const [loading, setLoading] = useState(false);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [showStripeModal, setShowStripeModal] = useState(false);

    // RiskPayGo billing details
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [country, setCountry] = useState("US");
    const [phone, setPhone] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [stateOfResidence, setStateOfResidence] = useState("FL");
    const [postCode, setPostCode] = useState("");

    useEffect(() => {
        // Reset states when modal is opened
        if (isOpen) {
            setStep(1);
            setAmount(0);
            setCustomAmount("");
            setMethod("");
            setProofFile(null);
            setFirstName("");
            setLastName("");
            setEmail("");
            setCountry("US");
            setPhone("");
            setDateOfBirth("");
            setStateOfResidence("FL");
            setPostCode("");
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && user) {
            if (user.email) setEmail(user.email);
            const fetchProfile = async () => {
                try {
                    const { data } = await supabase
                        .from("profiles")
                        .select("username, display_name")
                        .eq("id", user.id)
                        .single();
                    if (data) {
                        const fullName = data.display_name || data.username || "";
                        const nameParts = fullName.trim().split(/\s+/);
                        if (nameParts[0]) setFirstName(nameParts[0]);
                        if (nameParts.slice(1).join(" ")) setLastName(nameParts.slice(1).join(" "));
                    }
                } catch (err) {
                    console.error("Failed to load profile for pre-populating fields:", err);
                }
            };
            fetchProfile();
        }
    }, [isOpen, user, supabase]);

    if (!isOpen) return null;

    const amounts = [10, 20, 50, 100, 200, 500];

    const handleAmountSelect = (val: number) => {
        setAmount(val);
        setCustomAmount("");
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setCustomAmount(e.target.value);
        if (!isNaN(val) && val > 0) {
            setAmount(val);
        } else {
            setAmount(0);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProofFile(e.target.files[0]);
        }
    };


    const handleRiskPayGoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount) return;

        if (!firstName.trim() || !lastName.trim() || !email.trim() || !country || !phone.trim() || !dateOfBirth) {
            alert("Please fill in all required customer details.");
            return;
        }

        if (country === "US" && (!stateOfResidence || !postCode.trim())) {
            alert("For US customers, state of residence and ZIP/postal code are required.");
            return;
        }

        setLoading(true);
        try {
            const bodyPayload = {
                amount,
                customerDetails: {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    email: email.trim(),
                    country_of_residence: country,
                    phone: phone.trim(),
                    date_of_birth: dateOfBirth,
                    ...(country === "US" ? {
                        state_of_residence: stateOfResidence,
                        post_code: postCode.trim()
                    } : {})
                }
            };

            const res = await fetch('/api/v1/payments/riskpaygo/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });
            const data = await res.json();
            if (data.success && data.checkoutUrl) {
                // Redirect directly to checkout
                window.location.href = data.checkoutUrl;
                return; // Retain loader state while browser redirects
            } else {
                alert(data.error || "Failed to initiate RiskPayGo checkout.");
            }
        } catch (err) {
            console.error("RiskPayGo creation error:", err);
            alert("An error occurred trying to connect to RiskPayGo.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!amount || !method) return;
        if (method === 'bank' && !proofFile) return; // Require proof for bank

        if (method === 'card') {
            // Open Stripe Modal
            setShowStripeModal(true);
            return; // Stop here, wait for Stripe success
        }

        if (method === 'riskpaygo') {
            // Transition to Step 3: Billing Details
            setStep(3);
            return;
        }

        if (method === 'nowpayments') {
            setLoading(true);
            try {
                const res = await fetch('/api/v1/payments/nowpayments/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount })
                });
                const data = await res.json();
                if (data.success && data.checkoutUrl) {
                    window.location.href = data.checkoutUrl;
                    return;
                } else {
                    alert(data.error || "Failed to initiate NOWPayments checkout.");
                }
            } catch (err) {
                console.error("NOWPayments creation error:", err);
                alert("An error occurred trying to connect to NOWPayments.");
            } finally {
                setLoading(false);
            }
            return;
        }

        if (method === 'paygate') {
            setLoading(true);
            try {
                const res = await fetch('/api/v1/payments/paygate/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount })
                });
                const data = await res.json();
                if (data.success && data.checkoutUrl) {
                    window.location.href = data.checkoutUrl;
                    return;
                } else {
                    alert(data.error || "Failed to initiate PayGate checkout.");
                }
            } catch (err) {
                console.error("PayGate creation error:", err);
                alert("An error occurred trying to connect to PayGate.");
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            let proofUrl = undefined;
            const status = method === 'bank' ? 'pending' : 'completed';

            // Upload Proof if Bank Transfer
            if (method === 'bank' && proofFile) {
                const publicUrl = await uploadToLocalServer(proofFile);
                proofUrl = publicUrl;
            }

            await onTopUp(amount, method, status, proofUrl);
            onClose();

            setTimeout(() => {
                setStep(1);
                setAmount(0);
                setCustomAmount("");
                setMethod("");
                setProofFile(null);
            }, 300);
        } catch (error) {
            console.error(error);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {showStripeModal && (
                <StripePaymentModal
                    amount={amount}
                    onClose={() => setShowStripeModal(false)}
                    onSuccess={() => {
                        // Do NOT call onTopUp here — the confirm-wallet API already
                        // inserted the transaction and updated the wallet balance.
                        // Calling onTopUp again would add the funds a second time.
                        setShowStripeModal(false);
                        onClose();
                        // Reset state
                        setTimeout(() => {
                            setStep(1);
                            setAmount(0);
                            setCustomAmount("");
                            setMethod("");
                        }, 300);
                    }}
                    confirmUrl="/api/v1/payments/stripe/confirm-wallet"
                    metadata={{ type: 'wallet_topup' }}
                />
            )}

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                <div className="bg-[#0b0c10]/95 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.18)] relative animate-in fade-in zoom-in-95 duration-300">
                    {/* Visual Accent Gradient Top Strip */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />

                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex items-center justify-between mt-2">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                            <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20 text-pink-400">
                                <Wallet className="w-5 h-5" />
                            </div>
                            Top Up Wallet
                        </h2>
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:bg-white/5 hover:text-white rounded-full text-gray-400 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="text-sm text-gray-400">Select or enter the amount you want to top up.</div>

                                {/* Amount Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    {amounts.map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => handleAmountSelect(val)}
                                            className={`py-3.5 rounded-xl border font-bold text-sm tracking-tight transition-all duration-300 transform active:scale-95 cursor-pointer ${
                                                amount === val && !customAmount
                                                    ? "bg-gradient-to-r from-pink-600 to-pink-500 border-pink-400 text-white shadow-[0_0_20px_rgba(236,72,153,0.45)] scale-[1.02]"
                                                    : "bg-white/[0.02] border-white/10 text-gray-300 hover:bg-pink-500/[0.08] hover:border-pink-500/30 hover:text-white"
                                            }`}
                                        >
                                            {formatPrice(val, 0)}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Amount */}
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-widest text-pink-400/80 mb-2 block">Custom Amount</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm transition-colors group-focus-within:text-pink-400">
                                            {currency.symbol}
                                        </span>
                                        <input
                                            type="number"
                                            value={customAmount}
                                            onChange={handleCustomAmountChange}
                                            placeholder="Enter other amount"
                                            className={`w-full bg-black/40 border rounded-xl py-3.5 pl-9 pr-4 text-white placeholder-gray-600 focus:outline-none focus:ring-4 focus:ring-pink-500/20 transition-all duration-200 ${
                                                customAmount ? "border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.15)]" : "border-white/10 focus:border-pink-500"
                                            }`}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!amount || amount <= 0}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold tracking-wide shadow-[0_0_25px_rgba(236,72,153,0.3)] hover:shadow-[0_0_35px_rgba(236,72,153,0.45)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/[0.06]">
                                    <span className="text-xs text-gray-400 font-medium">Checkout Total</span>
                                    <span className="text-2xl font-black text-white tracking-tight">{formatPrice(amount, 2)}</span>
                                </div>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                                    <div className="text-xs font-bold uppercase tracking-widest text-pink-400/80 mb-1">Select Payment Method</div>

                                    {/* Stripe Card */}
                                    {config.stripe.enabled && (
                                        <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                            method === 'card' 
                                                ? 'bg-gradient-to-r from-pink-950/20 to-purple-950/20 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.15)]' 
                                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-pink-500/30'
                                        }`}>
                                            <input type="radio" name="method" className="hidden" onChange={() => setMethod('card')} />
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/10">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-white">Credit / Debit Card</div>
                                                <div className="text-[11px] text-gray-400 truncate">Instant | Visa, Mastercard, AMEX</div>
                                            </div>
                                            {method === 'card' && <div className="p-1 rounded-full bg-pink-500 text-white shrink-0"><Check className="w-3.5 h-3.5 stroke-[3px]" /></div>}
                                        </label>
                                    )}

                                    {/* RiskPayGo Checkout */}
                                    {config.riskpaygo?.enabled && (
                                        <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                            method === 'riskpaygo' 
                                                ? 'bg-gradient-to-r from-pink-950/20 to-purple-950/20 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.15)]' 
                                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-pink-500/30'
                                        }`}>
                                            <input type="radio" name="method" className="hidden" onChange={() => setMethod('riskpaygo')} />
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center text-pink-400 shrink-0 border border-pink-500/10">
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-white">PayGo Checkout</div>
                                                <div className="text-[11px] text-gray-400 truncate">Secure Direct Checkout (Global)</div>
                                            </div>
                                            {method === 'riskpaygo' && <div className="p-1 rounded-full bg-pink-500 text-white shrink-0"><Check className="w-3.5 h-3.5 stroke-[3px]" /></div>}
                                        </label>
                                    )}

                                    {/* NOWPayments Crypto */}
                                    {config.nowpayments?.enabled && (
                                        <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                            method === 'nowpayments' 
                                                ? 'bg-gradient-to-r from-pink-950/20 to-purple-950/20 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.15)]' 
                                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-pink-500/30'
                                        }`}>
                                            <input type="radio" name="method" className="hidden" onChange={() => setMethod('nowpayments')} />
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/20 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/10">
                                                <Wallet className="w-5 h-5 text-amber-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-white">Crypto (NOWPayments)</div>
                                                <div className="text-[11px] text-gray-400 truncate">BTC, ETH, USDT & 300+ Cryptocurrencies</div>
                                            </div>
                                            {method === 'nowpayments' && <div className="p-1 rounded-full bg-pink-500 text-white shrink-0"><Check className="w-3.5 h-3.5 stroke-[3px]" /></div>}
                                        </label>
                                    )}

                                    {/* PayGate Checkout */}
                                    {config.paygate?.enabled && (
                                        <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                            method === 'paygate' 
                                                ? 'bg-gradient-to-r from-pink-950/20 to-purple-950/20 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.15)]' 
                                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-pink-500/30'
                                        }`}>
                                            <input type="radio" name="method" className="hidden" onChange={() => setMethod('paygate')} />
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 flex items-center justify-center text-violet-400 shrink-0 border border-violet-500/10">
                                                <Shield className="w-5 h-5 text-violet-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-white">PayGate Checkout</div>
                                                <div className="text-[11px] text-gray-400 truncate">Debit/Credit Cards & Crypto (Polygon)</div>
                                            </div>
                                            {method === 'paygate' && <div className="p-1 rounded-full bg-pink-500 text-white shrink-0"><Check className="w-3.5 h-3.5 stroke-[3px]" /></div>}
                                        </label>
                                    )}

                                    {/* PayPal */}
                                    {config.paypal.enabled && (
                                        <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                            method === 'paypal' 
                                                ? 'bg-gradient-to-r from-pink-950/20 to-purple-950/20 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.15)]' 
                                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-pink-500/30'
                                        }`}>
                                            <input type="radio" name="method" className="hidden" onChange={() => setMethod('paypal')} />
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-600/20 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/10">
                                                <Banknote className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-white">PayPal</div>
                                                <div className="text-[11px] text-gray-400 truncate">Instant Wallet checkout</div>
                                            </div>
                                            {method === 'paypal' && <div className="p-1 rounded-full bg-pink-500 text-white shrink-0"><Check className="w-3.5 h-3.5 stroke-[3px]" /></div>}
                                        </label>
                                    )}

                                    {/* Bank */}
                                    {config.bank.enabled && (
                                        <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                                            method === 'bank' 
                                                ? 'bg-gradient-to-r from-pink-950/20 to-purple-950/20 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.15)]' 
                                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-pink-500/30'
                                        }`}>
                                            <input type="radio" name="method" className="hidden" onChange={() => setMethod('bank')} />
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center text-green-400 shrink-0 border border-green-500/10">
                                                <Landmark className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-white">Offline Bank Transfer</div>
                                                <div className="text-[11px] text-gray-400 truncate">Manually verified by admin</div>
                                            </div>
                                            {method === 'bank' && <div className="p-1 rounded-full bg-pink-500 text-white shrink-0"><Check className="w-3.5 h-3.5 stroke-[3px]" /></div>}
                                        </label>
                                    )}

                                    {!config.stripe.enabled && !config.riskpaygo?.enabled && !config.paypal.enabled && !config.bank.enabled && !config.nowpayments?.enabled && !config.paygate?.enabled && (
                                        <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                                            <AlertCircle className="w-6 h-6 text-red-400" />
                                            <span className="text-red-400 text-xs font-semibold">No payment methods configured.</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-[10px] text-gray-500 leading-normal text-center px-4 py-2.5 border border-white/5 rounded-xl bg-white/[0.02]">
                                    All purchases are final. No refunds once access is granted. Please review our <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline hover:text-pink-300 transition font-medium">Refund Policy</a>.
                                </div>

                                {method === 'bank' && config.bank.enabled && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                                        <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 text-yellow-200 text-[11px] space-y-1">
                                            <p className="font-extrabold text-xs mb-1.5 flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5" /> Offline Bank details:</p>
                                            <p><span className="text-gray-400 font-medium">Bank Name:</span> {config.bank.bankName}</p>
                                            <p><span className="text-gray-400 font-medium">Account:</span> <span className="font-mono bg-black/40 px-1 py-0.5 rounded border border-white/5">{config.bank.accountNumber}</span></p>
                                            {config.bank.routingNumber && <p><span className="text-gray-400 font-medium">Routing / SWIFT:</span> {config.bank.routingNumber}</p>}
                                            <p><span className="text-gray-400 font-medium">Reference:</span> <span className="font-mono bg-black/40 px-1 py-0.5 rounded border border-white/5">Your username</span></p>
                                            <p className="mt-2 text-yellow-300/80 leading-relaxed font-medium">{config.bank.instructions}</p>
                                        </div>

                                        <div className="border-2 border-dashed border-white/10 hover:border-pink-500/30 hover:bg-pink-500/[0.01] rounded-2xl p-7 text-center transition-all duration-300 relative group cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="flex flex-col items-center gap-2.5">
                                                <div className="p-2.5 rounded-full bg-white/5 text-gray-400 group-hover:text-pink-400 group-hover:bg-pink-500/10 transition-colors border border-white/5">
                                                    <Upload className="w-5 h-5" />
                                                </div>
                                                {proofFile ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs text-green-400 font-semibold truncate max-w-[200px]">{proofFile.name}</span>
                                                        <span className="text-[10px] text-gray-500">File uploaded successfully</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs text-gray-200 font-semibold group-hover:text-white transition-colors">Upload Payment Proof</span>
                                                        <span className="text-[10px] text-gray-500">Click to select receipt screenshot</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold transition duration-200 text-sm cursor-pointer"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!method || loading || (method === 'bank' && !proofFile)}
                                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.45)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : method === 'bank' ? "Submit Verification" : method === 'riskpaygo' ? "Continue" : "Pay Now"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <form onSubmit={handleRiskPayGoSubmit} className="space-y-4 animate-in fade-in duration-300">
                                <div className="text-xs font-bold uppercase tracking-widest text-pink-400/80 mb-2">Billing Details</div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">First Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="John"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 text-sm transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Last Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Smith"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 text-sm transition"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Date of Birth</label>
                                        <input
                                            type="date"
                                            required
                                            value={dateOfBirth}
                                            onChange={(e) => setDateOfBirth(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500 text-sm transition scheme-dark"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Phone Number</label>
                                        <input
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+13465550123"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 text-sm transition"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="john.smith@example.com"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 text-sm transition"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Country of Residence</label>
                                    <select
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        className="w-full bg-black/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500 text-sm transition"
                                    >
                                        <option value="US">United States (US)</option>
                                        <option value="GB">United Kingdom (GB)</option>
                                        <option value="CA">Canada (CA)</option>
                                        <option value="AU">Australia (AU)</option>
                                        <option value="DE">Germany (DE)</option>
                                        <option value="FR">France (FR)</option>
                                        <option value="ES">Spain (ES)</option>
                                        <option value="IT">Italy (IT)</option>
                                        <option value="NL">Netherlands (NL)</option>
                                        <option value="BR">Brazil (BR)</option>
                                        <option value="MX">Mexico (MX)</option>
                                        <option value="JP">Japan (JP)</option>
                                        <option value="SG">Singapore (SG)</option>
                                        <option value="NZ">New Zealand (NZ)</option>
                                    </select>
                                </div>

                                {country === "US" && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">State of Residence</label>
                                            <select
                                                value={stateOfResidence}
                                                onChange={(e) => setStateOfResidence(e.target.value)}
                                                className="w-full bg-black/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500 text-sm transition"
                                            >
                                                <option value="AL">Alabama (AL)</option>
                                                <option value="AK">Alaska (AK)</option>
                                                <option value="AZ">Arizona (AZ)</option>
                                                <option value="AR">Arkansas (AR)</option>
                                                <option value="CA">California (CA)</option>
                                                <option value="CO">Colorado (CO)</option>
                                                <option value="CT">Connecticut (CT)</option>
                                                <option value="DE">Delaware (DE)</option>
                                                <option value="FL">Florida (FL)</option>
                                                <option value="GA">Georgia (GA)</option>
                                                <option value="HI">Hawaii (HI)</option>
                                                <option value="ID">Idaho (ID)</option>
                                                <option value="IL">Illinois (IL)</option>
                                                <option value="IN">Indiana (IN)</option>
                                                <option value="IA">Iowa (IA)</option>
                                                <option value="KS">Kansas (KS)</option>
                                                <option value="KY">Kentucky (KY)</option>
                                                <option value="LA">Louisiana (LA)</option>
                                                <option value="ME">Maine (ME)</option>
                                                <option value="MD">Maryland (MD)</option>
                                                <option value="MA">Massachusetts (MA)</option>
                                                <option value="MI">Michigan (MI)</option>
                                                <option value="MN">Minnesota (MN)</option>
                                                <option value="MS">Mississippi (MS)</option>
                                                <option value="MO">Missouri (MO)</option>
                                                <option value="MT">Montana (MT)</option>
                                                <option value="NE">Nebraska (NE)</option>
                                                <option value="NV">Nevada (NV)</option>
                                                <option value="NH">New Hampshire (NH)</option>
                                                <option value="NJ">New Jersey (NJ)</option>
                                                <option value="NM">New Mexico (NM)</option>
                                                <option value="NY">New York (NY)</option>
                                                <option value="NC">North Carolina (NC)</option>
                                                <option value="ND">North Dakota (ND)</option>
                                                <option value="OH">Ohio (OH)</option>
                                                <option value="OK">Oklahoma (OK)</option>
                                                <option value="OR">Oregon (OR)</option>
                                                <option value="PA">Pennsylvania (PA)</option>
                                                <option value="RI">Rhode Island (RI)</option>
                                                <option value="SC">South Carolina (SC)</option>
                                                <option value="SD">South Dakota (SD)</option>
                                                <option value="TN">Tennessee (TN)</option>
                                                <option value="TX">Texas (TX)</option>
                                                <option value="UT">Utah (UT)</option>
                                                <option value="VT">Vermont (VT)</option>
                                                <option value="VA">Virginia (VA)</option>
                                                <option value="WA">Washington (WA)</option>
                                                <option value="WV">West Virginia (WV)</option>
                                                <option value="WI">Wisconsin (WI)</option>
                                                <option value="WY">Wyoming (WY)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">ZIP / Post Code</label>
                                            <input
                                                type="text"
                                                required
                                                value={postCode}
                                                onChange={(e) => setPostCode(e.target.value)}
                                                placeholder="33101"
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 text-sm transition"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold transition duration-200 text-sm cursor-pointer"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.45)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Pay"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
