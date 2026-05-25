import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, AlertCircle, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { cs, fp } from "@/utils/currency";

const CheckoutForm = ({ amount, roomId, confirmUrl, onClose, onSuccess }: { amount: number, roomId?: string, confirmUrl?: string, onClose: () => void, onSuccess: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message || 'Payment failed');
            setIsLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            // Payment succeeded! Verify and Unlock on server
            try {
                // Call confirm endpoint with paymentIntent.id
                const res = await fetch(confirmUrl || '/api/v1/payments/stripe/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentIntentId: paymentIntent.id,
                        roomId
                    }),
                });

                const data = await res.json();
                if (data.success) {
                    onSuccess();
                } else {
                    setMessage(data.error || "Unlock failed.");
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Confirmation error:", err);
                setMessage("Payment processed but unlock failed.");
                setIsLoading(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            {message && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{message}</span>
                </div>
            )}
            <button
                disabled={isLoading || !stripe || !elements}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Security Check...</span>
                    </>
                ) : (
                    <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{`Pay ${fp(amount, 2)}`}</span>
                    </>
                )}
            </button>
        </form>
    );
};

interface StripePaymentModalProps {
    amount: number;
    roomId?: string; // Optional now
    confirmUrl?: string; // Optional custom confirm endpoint
    metadata?: any; // Optional metadata for intent
    onClose: () => void;
    onSuccess: () => void;
}

export default function StripePaymentModal({ amount, roomId, confirmUrl, metadata, onClose, onSuccess }: StripePaymentModalProps) {
    const [clientSecret, setClientSecret] = useState('');
    const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch Stripe public key dynamically from admin settings
    useEffect(() => {
        async function initStripe() {
            try {
                // Fetch the public key from our API
                const keyRes = await fetch('/api/v1/payments/stripe/config');
                const keyData = await keyRes.json();

                if (!keyData.publicKey) {
                    setError('Stripe is not configured. Please contact support.');
                    setLoading(false);
                    return;
                }

                // Initialize Stripe with the fetched key
                setStripePromise(loadStripe(keyData.publicKey));

                // Create PaymentIntent
                const intentRes = await fetch('/api/v1/payments/stripe/intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount, roomId, metadata }),
                });

                const intentData = await intentRes.json();

                if (intentData.error) {
                    setError(intentData.error);
                    setLoading(false);
                    return;
                }

                setClientSecret(intentData.clientSecret);
                setLoading(false);
            } catch (err: any) {
                console.error('Stripe initialization error:', err);
                setError('Failed to initialize payment. Please try again.');
                setLoading(false);
            }
        }

        initStripe();
    }, [amount, roomId]);

    const options = {
        clientSecret,
        appearance: {
            theme: 'night' as const,
            labels: 'floating' as const,
            variables: {
                colorPrimary: '#ec4899', // pink-500 to match topup pink presets
                colorBackground: '#0d0d12', // deep luxury dark
                colorText: '#ffffff',
                colorDanger: '#ff4a5a',
                fontFamily: 'Outfit, Inter, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '16px',
            },
            rules: {
                '.Input': {
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    boxShadow: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                },
                '.Input:focus': {
                    borderColor: '#ec4899',
                    boxShadow: '0 0 0 3px rgba(236, 72, 153, 0.25)',
                },
                '.Input--invalid': {
                    borderColor: '#ff4a5a',
                    boxShadow: '0 0 0 3px rgba(255, 74, 90, 0.25)',
                },
                '.Label': {
                    color: '#a1a1aa',
                    fontWeight: '500',
                }
            }
        },
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="w-full max-w-md bg-[#0b0c10]/90 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.15)] relative p-6 animate-in fade-in zoom-in duration-200">
                {/* Visual Accent Gradient Top Strip */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />
                
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header Section */}
                <div className="flex items-center gap-3 mb-5 mt-2">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                        <Lock className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Stripe Secure Payment</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">256-bit SSL Encrypted</span>
                        </div>
                    </div>
                </div>

                {/* Amount Row Card */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/[0.06] mb-6">
                    <span className="text-xs text-gray-400 font-medium">Checkout Total</span>
                    <span className="text-2xl font-black text-white tracking-tight">{fp(amount, 2)}</span>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-3">
                        <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                        <span className="text-gray-400 text-xs font-medium">Preparing secure checkout...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <p className="text-red-400 text-sm font-medium">{error}</p>
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition border border-white/10"
                        >
                            Close
                        </button>
                    </div>
                ) : clientSecret && stripePromise ? (
                    <Elements options={options} stripe={stripePromise}>
                        <CheckoutForm amount={amount} roomId={roomId} confirmUrl={confirmUrl} onClose={onClose} onSuccess={onSuccess} />
                    </Elements>
                ) : null}
            </div>
        </div>
    );
}


