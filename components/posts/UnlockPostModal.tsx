"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Wallet, CheckCircle2, Loader2, X, AlertTriangle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { useRouter } from "next/navigation";

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
    const [loading, setLoading] = useState(false);
    const { balance, isLoading: walletLoading, pay, refresh: refreshWallet } = useWallet();
    const router = useRouter();

    const supabase = createClient();
    const price = post.price || 0;
    const authorName = post.profiles?.username || "Creator";
    const insufficient = balance < price;

    const handleUnlock = async () => {
        if (!currentUserId || insufficient) return;

        setLoading(true);
        setStep("processing");

        try {
            // Pay via wallet
            const result = await pay(
                post.user_id, // Pay the creator
                price,
                `Unlock post from @${authorName}`,
                undefined, // no roomId
                "post_unlock",
                post.id
            );

            if (!result.success) {
                throw new Error(result.error || "Payment failed");
            }

            // Record the unlock (upsert to handle re-attempts)
            const { error } = await supabase
                .from('post_unlocks')
                .upsert({
                    user_id: currentUserId,
                    post_id: post.id,
                    amount: price
                }, { onConflict: 'user_id,post_id' });

            if (error) throw error;

            // Unlock content immediately
            onUnlockSuccess();

            setStep("success");
            toast.success("Payment successful!");
            await refreshWallet();

            // Close after brief delay
            setTimeout(() => {
                onClose();
                // Reset state
                setStep("select");
            }, 1500);

        } catch (error: any) {
            console.error("Unlock error:", error);
            toast.error(error?.message || "Payment failed. Please try again.");
            setStep("select");
        } finally {
            setLoading(false);
        }
    };

    return (
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
                        <div className="space-y-5">
                            <div className="text-center">
                                <p className="text-zinc-400 text-sm">You are about to unlock exclusive content from</p>
                                <p className="text-lg font-bold text-white mt-1">@{authorName}</p>
                                <div className="mt-4 inline-block px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/30">
                                    <span className="text-2xl font-bold text-pink-400">€{price.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Wallet Balance */}
                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
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
                                                €{balance.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Remaining after */}
                            {!insufficient && !walletLoading && (
                                <div className="text-xs text-zinc-500 text-center">
                                    Remaining after purchase:{" "}
                                    <span className="text-zinc-300 font-medium">
                                        €{(balance - price).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {/* Insufficient balance warning */}
                            {insufficient && !walletLoading && (
                                <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                                    <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-red-300">Insufficient funds</p>
                                        <p className="text-xs text-red-300/70 mt-0.5">
                                            You need €{(price - balance).toFixed(2)} more. Top up your wallet to continue.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Action */}
                            {insufficient ? (
                                <Button
                                    onClick={() => router.push("/account/wallet")}
                                    className="w-full h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-500/20"
                                >
                                    <Wallet className="w-5 h-5 mr-2" />
                                    Top Up Wallet
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleUnlock}
                                    disabled={loading || walletLoading}
                                    className="w-full h-12 text-lg font-bold rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-500/20"
                                >
                                    Pay €{price.toFixed(2)}
                                </Button>
                            )}
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
                        <Wallet className="w-3 h-3" /> Secure Payment via PlaygroundX Wallet
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
