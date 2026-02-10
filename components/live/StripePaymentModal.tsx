import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, AlertCircle } from 'lucide-react';

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
            {message && <div className="text-red-400 text-sm">{message}</div>}
            <button
                disabled={isLoading || !stripe || !elements}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50"
            >
                {isLoading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
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
        },
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative p-6 animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <h3 className="text-xl font-bold text-white">Stripe Secure Payment</h3>
                    <p className="text-gray-400 text-sm">Amount: ${amount.toFixed(2)}</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-3">
                        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span className="text-gray-400 text-sm">Preparing secure checkout...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
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

