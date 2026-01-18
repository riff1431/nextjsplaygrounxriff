"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Check, Star, Zap, Crown, Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";

interface SubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    creator: Profile;
    currentUserId: string | null;
    onSuccess?: () => void;
}

export default function SubscriptionModal({ isOpen, onClose, creator, currentUserId, onSuccess }: SubscriptionModalProps) {
    const [loading, setLoading] = useState(false);
    const [selectedTier, setSelectedTier] = useState<'weekly' | 'monthly' | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card');
    const supabase = createClient();
    const router = useRouter();

    const weeklyPrice = creator.subscription_price_weekly || 0;
    const monthlyPrice = creator.subscription_price_monthly || 0;

    // Reset state when opening
    if (!isOpen && step !== 1) setStep(1);

    const handleContinue = () => {
        if (!currentUserId) {
            toast.error("Please log in to subscribe");
            router.push("/auth");
            return;
        }
        if (!selectedTier) {
            toast.error("Please select a plan");
            return;
        }
        setStep(2);
    };

    const handlePayment = async () => {
        setLoading(true);
        try {
            // Mock payment processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            const days = selectedTier === 'weekly' ? 7 : 30;
            const periodEnd = new Date();
            periodEnd.setDate(periodEnd.getDate() + days);

            const { error } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: currentUserId,
                    creator_id: creator.id,
                    tier: selectedTier,
                    status: 'active',
                    current_period_end: periodEnd.toISOString()
                });

            if (error) throw error;

            toast.success(`Subscribed to ${creator.full_name || creator.username}!`);
            onSuccess?.();
            onClose();
            setStep(1); // Reset for next time
        } catch (error) {
            console.error("Subscription error:", error);
            console.error("Subscription error:", error);
            // @ts-ignore
            toast.error(error?.message || "Failed to process subscription");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border border-zinc-800 text-white p-0 gap-0 max-w-md overflow-hidden sm:rounded-3xl">
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-pink-600 to-purple-600 p-6 flex flex-col justify-end">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition text-white z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    {step === 2 && (
                        <button
                            onClick={() => setStep(1)}
                            className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition text-white z-10"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="flex items-end gap-4 translate-y-8">
                        <img
                            src={creator.avatar_url || ""}
                            alt={creator.username || "Creator"}
                            className="w-20 h-20 rounded-full border-4 border-zinc-900 shadow-xl object-cover bg-zinc-800"
                        />
                        <div className="mb-2">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {creator.full_name || creator.username}
                                <Crown className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            </h2>
                            <p className="text-pink-100/80 text-sm">@{creator.username}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 px-6 pb-6 space-y-6">
                    {step === 1 ? (
                        /* STEP 1: PLAN SELECTION */
                        <>
                            <div className="text-center">
                                <h3 className="font-semibold text-lg text-white">Unlock Exclusive Content</h3>
                                <p className="text-zinc-400 text-sm mt-1">
                                    Subscribe to get full access to all paid posts, exclusive streams, and badges.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Weekly Plan */}
                                {(weeklyPrice || 0) > 0 && (
                                    <button
                                        onClick={() => setSelectedTier('weekly')}
                                        className={`relative p-4 rounded-2xl border-2 transition text-left ${selectedTier === 'weekly'
                                            ? 'border-pink-500 bg-pink-500/10'
                                            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                                            }`}
                                    >
                                        <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-2">Weekly</div>
                                        <div className="text-2xl font-bold text-white mb-1">
                                            ${weeklyPrice.toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-zinc-500">Billed every 7 days</div>
                                        {selectedTier === 'weekly' && (
                                            <div className="absolute top-3 right-3 bg-pink-500 text-white rounded-full p-0.5">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </button>
                                )}

                                {/* Monthly Plan */}
                                {(monthlyPrice || 0) > 0 && (
                                    <button
                                        onClick={() => setSelectedTier('monthly')}
                                        className={`relative p-4 rounded-2xl border-2 transition text-left ${selectedTier === 'monthly'
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                                            }`}
                                    >
                                        {monthlyPrice < weeklyPrice * 4 && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                                                BEST VALUE
                                            </div>
                                        )}
                                        <div className="text-xs text-zinc-400 font-medium uppercase tracking-wider mb-2">Monthly</div>
                                        <div className="text-2xl font-bold text-white mb-1">
                                            ${monthlyPrice.toFixed(2)}
                                        </div>
                                        <div className="text-[10px] text-zinc-500">Billed every 30 days</div>
                                        {selectedTier === 'monthly' && (
                                            <div className="absolute top-3 right-3 bg-purple-500 text-white rounded-full p-0.5">
                                                <Check className="w-3 h-3" />
                                            </div>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="p-1 rounded bg-zinc-800 text-pink-400"><Zap className="w-3.5 h-3.5" /></div>
                                    <span>Unlock all paid posts</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="p-1 rounded bg-zinc-800 text-purple-400"><Star className="w-3.5 h-3.5" /></div>
                                    <span>Supporter badge on profile</span>
                                </div>
                            </div>

                            <button
                                onClick={handleContinue}
                                disabled={!selectedTier}
                                className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-lg hover:bg-zinc-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                Continue to Payment
                            </button>
                        </>
                    ) : (
                        /* STEP 2: PAYMENT METHOD */
                        <>
                            <div className="text-center">
                                <h3 className="font-semibold text-lg text-white">Select Payment Method</h3>
                                <p className="text-zinc-400 text-sm mt-1">
                                    Choose how you want to pay for your subscription.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition ${paymentMethod === 'card'
                                        ? 'bg-zinc-800 border-pink-500 text-white'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-700">
                                        <CreditCardIcon className="w-5 h-5" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium">Credit Card</div>
                                        <div className="text-xs opacity-60">Visa, Mastercard, Amex</div>
                                    </div>
                                    {paymentMethod === 'card' && <Check className="w-5 h-5 text-pink-500" />}
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('paypal')}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition ${paymentMethod === 'paypal'
                                        ? 'bg-zinc-800 border-blue-500 text-white'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-900/20 flex items-center justify-center border border-blue-900/30">
                                        <div className="text-blue-500 font-bold text-xs">Py</div>
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium">PayPal</div>
                                        <div className="text-xs opacity-60">Pay safely with PayPal</div>
                                    </div>
                                    {paymentMethod === 'paypal' && <Check className="w-5 h-5 text-blue-500" />}
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('bank')}
                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition ${paymentMethod === 'bank'
                                        ? 'bg-zinc-800 border-green-500 text-white'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-green-900/20 flex items-center justify-center border border-green-900/30">
                                        <Building2 className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <div className="font-medium">Manual Bank Transfer</div>
                                        <div className="text-xs opacity-60">Direct transfer details</div>
                                    </div>
                                    {paymentMethod === 'bank' && <Check className="w-5 h-5 text-green-500" />}
                                </button>
                            </div>

                            {/* Info Box for Selected Method */}
                            <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50 text-sm text-zinc-400">
                                {paymentMethod === 'card' && "You will be redirected to our secure payment gateway."}
                                {paymentMethod === 'paypal' && "You will be redirected to PayPal to complete your purchase."}
                                {paymentMethod === 'bank' && (
                                    <div className="space-y-1">
                                        <p className="text-white font-medium mb-2">Bank Details:</p>
                                        <p>Bank: <span className="text-zinc-300">PlayGroundX Bank</span></p>
                                        <p>Account: <span className="text-zinc-300">123-456-7890</span></p>
                                        <p className="text-xs mt-2 text-yellow-500 flex items-center gap-1">
                                            <Zap className="w-3 h-3" /> Processing may take 24-48h.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={loading}
                                className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    paymentMethod === 'bank' ? "Confirm Transfer" : "Pay Now"
                                )}
                            </button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function CreditCardIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
    )
}

function Building2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
        </svg>
    )
}
