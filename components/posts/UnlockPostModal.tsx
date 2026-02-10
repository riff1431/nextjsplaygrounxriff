"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, Building2, CheckCircle2, Loader2, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import StripePaymentModal from "@/components/live/StripePaymentModal";

interface UnlockPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: {
        id: string;
        price?: number;
        user_id: string;
        profiles?: {
            username: string | null;
        } | null;
    };
    currentUserId: string | null;
    onUnlockSuccess: () => void;
}

export default function UnlockPostModal({ isOpen, onClose, post, currentUserId, onUnlockSuccess }: UnlockPostModalProps) {
    const [step, setStep] = useState<"select" | "processing" | "success">("select");
    const [paymentMethod, setPaymentMethod] = useState<"card" | "bank" | null>(null);
    const [loading, setLoading] = useState(false);
    const [showStripeModal, setShowStripeModal] = useState(false);

    const supabase = createClient();
    const price = post.price || 0;
    const authorName = post.profiles?.username || "Creator";

    const handleUnlock = async () => {
        if (!currentUserId) {
            toast.error("Please login to continue");
            return;
        }
        if (!paymentMethod) {
            toast.error("Please select a payment method");
            return;
        }

        setLoading(true);
        setStep("processing");

        try {
            if (paymentMethod === 'card') {
                setShowStripeModal(true);
                return;
            }

            // Simulate Payment Gateway delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Actual DB Insertion (For Bank or other methods)
            const { error } = await supabase
                .from('post_unlocks')
                .insert({
                    user_id: currentUserId,
                    post_id: post.id,
                    amount: price
                });

            if (error) throw error;

            setStep("success");
            toast.success("Payment successful!");

            // Close after brief delay
            setTimeout(() => {
                onUnlockSuccess();
                onClose();
                // Reset state
                setStep("select");
                setPaymentMethod(null);
            }, 1500);

        } catch (error) {
            console.error("Unlock error:", error);
            toast.error("Payment failed. Please try again.");
            setStep("select");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {showStripeModal && (
                <StripePaymentModal
                    amount={price}
                    onClose={() => setShowStripeModal(false)}
                    onSuccess={() => {
                        toast.success("Payment successful!");
                        onUnlockSuccess(); // Optimistic unlock
                        setShowStripeModal(false);
                        onClose();
                    }}
                    confirmUrl="/api/v1/payments/stripe/confirm-post-unlock"
                    metadata={{
                        type: 'post_unlock',
                        postId: post.id
                    }}
                />
            )}
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md p-0 overflow-hidden">
                    {/* Header Gradient */}
                    <div className="h-32 bg-gradient-to-br from-pink-600 to-purple-700 relative flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="z-10 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 border border-white/20 shadow-xl">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white shadow-sm">Unlock Content</h2>
                        </div>
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-6">
                        {step === "select" && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <p className="text-zinc-400 text-sm">You are about to unlock exclusive content from</p>
                                    <p className="text-lg font-bold text-white mt-1">@{authorName}</p>
                                    <div className="mt-4 inline-block px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/30">
                                        <span className="text-2xl font-bold text-pink-400">${price.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Payment Method</label>

                                    <button
                                        onClick={() => setPaymentMethod("card")}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${paymentMethod === "card"
                                            ? "bg-pink-500/10 border-pink-500 ring-1 ring-pink-500/50"
                                            : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                                <CreditCard className={`w-5 h-5 ${paymentMethod === "card" ? "text-pink-400" : "text-zinc-400"}`} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-semibold text-white">Credit / Debit Card</div>
                                                <div className="text-xs text-zinc-500">Instant unlock</div>
                                            </div>
                                        </div>
                                        {paymentMethod === "card" && <div className="w-4 h-4 rounded-full bg-pink-500" />}
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod("bank")}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${paymentMethod === "bank"
                                            ? "bg-pink-500/10 border-pink-500 ring-1 ring-pink-500/50"
                                            : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                                <Building2 className={`w-5 h-5 ${paymentMethod === "bank" ? "text-pink-400" : "text-zinc-400"}`} />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-semibold text-white">Bank Transfer</div>
                                                <div className="text-xs text-zinc-500">Processing takes 1-2 mins</div>
                                            </div>
                                        </div>
                                        {paymentMethod === "bank" && <div className="w-4 h-4 rounded-full bg-pink-500" />}
                                    </button>
                                </div>

                                <Button
                                    onClick={handleUnlock}
                                    disabled={!paymentMethod || loading}
                                    className="w-full h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-500/20"
                                >
                                    Pay Now
                                </Button>
                            </div>
                        )}

                        {step === "processing" && (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-pink-500 animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Lock className="w-6 h-6 text-zinc-600" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Processing Payment...</h3>
                                    <p className="text-zinc-400 text-sm">Please do not close this window</p>
                                </div>
                            </div>
                        )}

                        {step === "success" && (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mb-2 animate-bounce">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
                                    <p className="text-zinc-400 text-sm">Unlocking content for you...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Trust */}
                    <div className="bg-zinc-900 p-3 text-center border-t border-zinc-800">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center justify-center gap-2">
                            <Lock className="w-3 h-3" /> Secure Payment Gateway
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
