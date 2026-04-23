"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Check, Star, Zap, Crown, Loader2, ArrowLeft, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Profile } from "@/types";
import { useWallet } from "@/hooks/useWallet";

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
    const [done, setDone] = useState(false);
    const { balance, isLoading: walletLoading, refresh: refreshWallet } = useWallet();
    const supabase = createClient();
    const router = useRouter();

    const weeklyPrice = creator.subscription_price_weekly || 0;
    const monthlyPrice = creator.subscription_price_monthly || 0;

    const selectedPrice = selectedTier === 'weekly' ? weeklyPrice : monthlyPrice;
    const insufficient = balance < selectedPrice;

    // Reset state when closing
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

    const handleWalletPay = async () => {
        if (!currentUserId || insufficient || loading) return;

        setLoading(true);
        try {
            const { error } = await supabase.rpc('subscribe_via_wallet', {
                creator_id_val: creator.id,
                tier_val: selectedTier,
                amount_val: selectedPrice
            });
            if (error) throw error;

            setDone(true);
            await refreshWallet();
            toast.success(`Subscribed to ${creator.full_name || creator.username}!`);

            setTimeout(() => {
                setDone(false);
                setLoading(false);
                onSuccess?.();
                onClose();
                setStep(1);
            }, 1200);
        } catch (error: any) {
            console.error("Subscription error:", error);
            toast.error(error?.message || "Failed to process subscription");
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
                        /* STEP 2: WALLET PAYMENT */
                        <>
                            <div className="text-center">
                                <h3 className="font-semibold text-lg text-white">Pay with Wallet</h3>
                                <p className="text-zinc-400 text-sm mt-1">
                                    {selectedTier === 'weekly' ? 'Weekly' : 'Monthly'} subscription — ${selectedPrice.toFixed(2)}
                                </p>
                            </div>

                            {/* Wallet Balance Card */}
                            <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                                            <Wallet className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">Wallet Balance</p>
                                            <p className="text-xs text-zinc-500">Pay from your wallet</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {walletLoading ? (
                                            <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                                        ) : (
                                            <p className={`text-lg font-bold ${insufficient ? "text-red-400" : "text-emerald-400"}`}>
                                                ${balance.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Amount breakdown */}
                            <div className="bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Subscription</span>
                                    <span className="text-white font-medium">${selectedPrice.toFixed(2)}</span>
                                </div>
                                {!insufficient && !walletLoading && (
                                    <div className="flex justify-between text-sm border-t border-zinc-800 pt-2">
                                        <span className="text-zinc-400">Remaining after</span>
                                        <span className="text-zinc-300">${(balance - selectedPrice).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Insufficient balance warning */}
                            {insufficient && !walletLoading && (
                                <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                                    <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-300">Insufficient funds</p>
                                        <p className="text-xs text-red-300/70 mt-0.5">
                                            You need ${(selectedPrice - balance).toFixed(2)} more. Top up your wallet to continue.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Action */}
                            {insufficient ? (
                                <button
                                    onClick={() => router.push("/account/wallet")}
                                    className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                                >
                                    <Wallet className="w-5 h-5" />
                                    Top Up Wallet
                                </button>
                            ) : (
                                <button
                                    onClick={handleWalletPay}
                                    disabled={loading || walletLoading}
                                    className={`w-full py-3.5 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 ${done
                                        ? "bg-emerald-600 text-white"
                                        : "bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90"
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {done ? (
                                        <>
                                            <CheckCircle2 className="w-5 h-5" /> Subscribed!
                                        </>
                                    ) : loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        `Pay $${selectedPrice.toFixed(2)}`
                                    )}
                                </button>
                            )}

                            <p className="text-zinc-500 text-xs text-center">
                                🔒 Secure payment via PlaygroundX Wallet
                            </p>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
