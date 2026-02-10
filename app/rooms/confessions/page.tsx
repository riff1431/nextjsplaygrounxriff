"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Video, Lock, Check, X, FileText, Mic, CreditCard, Wallet, Building2, Globe } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import StripePaymentModal from "@/components/live/StripePaymentModal";

// ---- Shared Logic/Components -----------------------------------------------

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                "hover:shadow-[0_0_34px_rgba(236,72,153,0.20),0_0_78px_rgba(59,130,246,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

// ---- Types ---------------------------------------------------------------

type RequestStatus = 'pending_approval' | 'in_progress' | 'delivered' | 'completed' | 'rejected';

interface ConfessionRequest {
    id: string;
    type: 'Text' | 'Audio' | 'Video';
    amount: number;
    topic: string;
    status: RequestStatus;
    delivery_content?: string;
    created_at: string;
}

interface Confession {
    id: string;
    tier: string;
    title: string;
    teaser: string;
    content?: string;
    media_url?: string;
    type: 'Text' | 'Voice' | 'Video';
    price: number;
    unlocked?: boolean;
}

// --------------------------------------------------------------------------

const tierColors: Record<string, string> = {
    Soft: "border-blue-400/30 text-blue-200 shadow-blue-900/20",
    Spicy: "border-pink-400/30 text-pink-200 shadow-pink-900/20",
    Dirty: "border-rose-500/30 text-rose-200 shadow-rose-900/20",
    Dark: "border-purple-500/30 text-purple-200 shadow-purple-900/20",
    Forbidden: "border-red-600/30 text-red-200 shadow-red-900/20",
};

export default function ConfessionsRoomPreview() {
    const router = useRouter();
    const params = useParams();
    const roomId = params?.roomId as string || "default-room";
    const { user } = useAuth();

    // State
    const [requests, setRequests] = useState<ConfessionRequest[]>([]);
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [loadingWall, setLoadingWall] = useState(false);
    const [myWalletBalance, setMyWalletBalance] = useState(0);

    // Request Form
    const [reqType, setReqType] = useState<'Text' | 'Audio' | 'Video'>('Text');
    const [reqAmount, setReqAmount] = useState(10);
    const [reqTopic, setReqTopic] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Modals
    const [reviewRequest, setReviewRequest] = useState<ConfessionRequest | null>(null);
    const [purchaseConfession, setPurchaseConfession] = useState<Confession | null>(null);
    const [viewConfession, setViewConfession] = useState<Confession | null>(null);

    // [NEW] Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wallet' | 'stripe' | 'paypal' | 'bank'>('stripe');
    const [stripeConfig, setStripeConfig] = useState<{
        amount: number;
        confirmUrl: string;
        metadata: any;
        onSuccess: () => void;
    } | null>(null);

    // Countdown (Preserved Static)
    const GOAL_TARGET = 250;
    const [goalTotal, setGoalTotal] = useState(140);
    const pay = (amount: number) => setGoalTotal(g => g + amount);

    useEffect(() => {
        if (user && roomId) {
            fetchRequests();
            fetchConfessions();
            fetchWallet();

            // [New] Real-time Alerts
            const supabase = createClient();
            const channel = supabase
                .channel('fan-notifications')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        if (payload.new.type === 'request_delivered') {
                            showToast(payload.new.message, 'success');
                            fetchRequests();
                        }
                    }
                )
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [user, roomId]);

    const fetchWallet = async () => {
        // Mock fetch or simple RPC check (ideally API)
        // For MVP we just assume 0 if fail, or get from supabase directly
        const supabase = createClient();
        const { data } = await supabase.from('wallets').select('balance').eq('user_id', user?.id).single();
        if (data) setMyWalletBalance(data.balance);
    };

    const fetchRequests = async () => {
        setLoadingRequests(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/requests`);
            const data = await res.json();
            if (data.requests) setRequests(data.requests);
        } catch (e) {
            console.error("Failed requests", e);
        } finally {
            setLoadingRequests(false);
        }
    };

    const fetchConfessions = async () => {
        setLoadingWall(true);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions`);
            const data = await res.json();
            if (data.confessions) {
                const mapped = data.confessions.map((c: any) => ({
                    id: c.id,
                    tier: c.tier || 'Spicy',
                    title: c.title,
                    teaser: c.teaser || c.title,
                    content: c.content,
                    media_url: c.media_url,
                    type: c.type || 'Text',
                    price: c.price || 5, // Default if missing
                }));
                setConfessions(mapped);
            }
        } catch (e) {
            console.error("Failed wall", e);
        } finally {
            setLoadingWall(false);
        }
    };

    const [myUnlocks, setMyUnlocks] = useState<Set<string>>(new Set());

    const handleOpenConfirm = () => {
        if (!reqTopic.trim() || reqAmount <= 0) return;
        setShowConfirmModal(true);
    };

    // [NEW] Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ... (rest of the component logic, updating alerts to showToast)

    const handleConfirmAndPay = async () => {
        setIsSending(true);

        if (selectedPaymentMethod === 'stripe') {
            setStripeConfig({
                amount: reqAmount,
                confirmUrl: "/api/v1/payments/stripe/confirm-confession-request",
                metadata: {
                    roomId,
                    type: reqType,
                    topic: reqTopic.slice(0, 400), // Truncate to fit Stripe metadata limits (approx)
                    creatorId: null // Route will fetch if needed, or we can pass if we have it
                },
                onSuccess: () => {
                    // Optimistically add to list (Stripe success guarantees it will be added by webhook/api eventually)
                    // But here we might want to just fetch requests
                    fetchRequests();
                    setReqTopic("");
                    setShowConfirmModal(false);
                    showToast("Request Sent! Payment processed.", 'success');
                    setIsSending(false);
                }
            });
            return;
        }

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: reqType,
                    amount: reqAmount,
                    topic: reqTopic,
                    paymentMethod: selectedPaymentMethod
                })
            });
            const data = await res.json();
            if (data.success) {
                // Optimistically update list
                if (data.request) {
                    setRequests(prev => [data.request, ...prev]);
                } else {
                    fetchRequests(); // Fallback
                }

                fetchWallet(); // Update balance
                setReqTopic("");
                setShowConfirmModal(false);
                showToast("Request Sent! Payment processed.", 'success');
            } else {
                showToast("Failed: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Error sending request", 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleUnlockPurchase = async () => {
        if (!purchaseConfession) return;

        if (selectedPaymentMethod === 'stripe') {
            setStripeConfig({
                amount: purchaseConfession.price,
                confirmUrl: "/api/v1/payments/stripe/confirm-confession-unlock",
                metadata: {
                    confessionId: purchaseConfession.id
                },
                onSuccess: () => {
                    setMyUnlocks(prev => new Set(prev).add(purchaseConfession.id));
                    setPurchaseConfession(null);
                    setViewConfession(purchaseConfession);
                    showToast("Confession Unlocked!", 'success');
                }
            });
            return;
        }

        try {
            const res = await fetch(`/api/v1/confessions/${purchaseConfession.id}/unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentMethod: selectedPaymentMethod })
            });
            const data = await res.json();

            if (data.success || data.message === "Already unlocked") {
                setMyUnlocks(prev => new Set(prev).add(purchaseConfession!.id));
                setPurchaseConfession(null);
                setViewConfession(purchaseConfession);
                showToast("Confession Unlocked!", 'success');
            } else {
                showToast("Purchase failed: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Payment error", 'error');
        }
    };

    const handleApproveDelivery = async (reqId: string) => {
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/requests/${reqId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "approve" })
            });
            if (res.ok) {
                setReviewRequest(null);
                fetchRequests();
                showToast("Approved! Funds Released.", 'success');
            }
        } catch (e) { }
    };

    // ... (rest of the return statement)

    return (
        <ProtectRoute allowedRoles={["fan", "creator"]}>
            <div className="min-h-screen bg-black text-white relative">
                {/* Toast Notification */}
                {toast && (
                    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[70] animate-fade-in-down">
                        <NeonCard className={cx(
                            "px-6 py-3 flex items-center gap-3 border",
                            toast.type === 'success' ? "border-green-500/50 shadow-green-900/40" : "border-red-500/50 shadow-red-900/40"
                        )}>
                            {toast.type === 'success' ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
                            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
                        </NeonCard>
                    </div>
                )}

                <style>{`
            .neon-flicker { animation: neonFlicker 3s infinite alternate; }
            @keyframes neonFlicker {
                0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
                20%, 24%, 55% { opacity: 0.5; }
            }
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { bg: #000; }
            .custom-scrollbar::-webkit-scrollbar-thumb { bg: #333; border-radius: 2px; }
            @keyframes fadeInDown {
                from { opacity: 0; transform: translate(-50%, -20px); }
                to { opacity: 1; transform: translate(-50%, 0); }
            }
            .animate-fade-in-down {
                animation: fadeInDown 0.3s ease-out forwards;
            }
          `}</style>

                {stripeConfig && (
                    <StripePaymentModal
                        amount={stripeConfig.amount}
                        onClose={() => { setStripeConfig(null); setIsSending(false); }}
                        onSuccess={() => {
                            stripeConfig.onSuccess();
                            setStripeConfig(null);
                        }}
                        confirmUrl={stripeConfig.confirmUrl}
                        metadata={stripeConfig.metadata}
                    />
                )}

                {/* --- MODALS --- */}
                {/* ... (rest of the render is same) */}

                {/* --- MODALS --- */}

                {/* [NEW] 0. Request Confirmation Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                        <NeonCard className="w-full max-w-lg p-6 bg-gray-900 border border-pink-500/40">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Confirm Request</h3>
                                <button onClick={() => setShowConfirmModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>

                            {/* Summary */}
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-gray-400 uppercase">Topic</span>
                                    <span className="text-xs text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded">{reqType}</span>
                                </div>
                                <div className="text-gray-200 italic font-medium">"{reqTopic}"</div>
                            </div>

                            <div className="mb-6">
                                <div className="text-sm text-gray-400 mb-3">Select Payment Method</div>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Wallet */}
                                    <button
                                        onClick={() => setSelectedPaymentMethod('wallet')}
                                        className={cx(
                                            "p-3 rounded-xl border flex flex-col items-center gap-2 transition relative overflow-hidden",
                                            selectedPaymentMethod === 'wallet'
                                                ? "bg-rose-600/20 border-rose-500 text-white"
                                                : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <Wallet className="w-6 h-6" />
                                        <span className="text-xs font-bold">My Wallet</span>
                                        <span className="text-[10px] opacity-70">Bal: ${myWalletBalance}</span>
                                        {myWalletBalance < reqAmount && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm text-[10px] text-red-400 font-bold">Low Balance</div>
                                        )}
                                    </button>

                                    {/* Stripe */}
                                    <button
                                        onClick={() => setSelectedPaymentMethod('stripe')}
                                        className={cx(
                                            "p-3 rounded-xl border flex flex-col items-center gap-2 transition",
                                            selectedPaymentMethod === 'stripe'
                                                ? "bg-indigo-600/20 border-indigo-500 text-white"
                                                : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <CreditCard className="w-6 h-6" />
                                        <span className="text-xs font-bold">Stripe</span>
                                    </button>

                                    {/* PayPal */}
                                    <button
                                        onClick={() => setSelectedPaymentMethod('paypal')}
                                        className={cx(
                                            "p-3 rounded-xl border flex flex-col items-center gap-2 transition",
                                            selectedPaymentMethod === 'paypal'
                                                ? "bg-blue-600/20 border-blue-500 text-white"
                                                : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <Globe className="w-6 h-6" />
                                        <span className="text-xs font-bold">PayPal</span>
                                    </button>

                                    {/* Bank */}
                                    <button
                                        onClick={() => setSelectedPaymentMethod('bank')}
                                        className={cx(
                                            "p-3 rounded-xl border flex flex-col items-center gap-2 transition",
                                            selectedPaymentMethod === 'bank'
                                                ? "bg-emerald-600/20 border-emerald-500 text-white"
                                                : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <Building2 className="w-6 h-6" />
                                        <span className="text-xs font-bold">Bank</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-6 px-2">
                                <span className="text-gray-300">Total</span>
                                <span className="text-3xl font-bold text-white">${reqAmount}</span>
                            </div>

                            <button
                                onClick={handleConfirmAndPay}
                                disabled={isSending || (selectedPaymentMethod === 'wallet' && myWalletBalance < reqAmount)}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 font-bold text-lg text-white hover:opacity-90 transition shadow-lg shadow-rose-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? "Processing..." : "Confirm & Pay"}
                            </button>
                        </NeonCard>
                    </div>
                )}

                {/* 1. Purchase Unlock Modal */}
                {purchaseConfession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <NeonCard className="w-full max-w-lg p-6 bg-gray-900 border border-rose-500/30">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xl font-bold text-white">Unlock Confession</h3>
                                <button onClick={() => setPurchaseConfession(null)}><X className="w-5 h-5 text-gray-400" /></button>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center font-bold text-lg">
                                    N
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">@NeonNyla</div>
                                    <div className="text-xs text-rose-300">Creator</div>
                                </div>
                            </div>

                            <div className="bg-black/50 rounded-xl p-4 border border-white/10 mb-6">
                                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">{purchaseConfession.tier} Confession</div>
                                <div className="font-bold text-lg text-white mb-2 leading-tight">"{purchaseConfession.title}"</div>
                            </div>

                            {/* Payment Selector */}
                            <div className="mb-6">
                                <div className="text-sm text-gray-400 mb-3">Select Payment Method</div>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Wallet */}
                                    <button
                                        onClick={() => setSelectedPaymentMethod('wallet')}
                                        className={cx(
                                            "p-3 rounded-xl border flex flex-col items-center gap-2 transition relative overflow-hidden",
                                            selectedPaymentMethod === 'wallet'
                                                ? "bg-rose-600/20 border-rose-500 text-white"
                                                : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <Wallet className="w-6 h-6" />
                                        <span className="text-xs font-bold">My Wallet</span>
                                        <span className="text-[10px] opacity-70">Bal: ${myWalletBalance}</span>
                                        {myWalletBalance < purchaseConfession.price && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm text-[10px] text-red-400 font-bold">Low Balance</div>
                                        )}
                                    </button>

                                    {/* Stripe */}
                                    <button
                                        onClick={() => setSelectedPaymentMethod('stripe')}
                                        className={cx(
                                            "p-3 rounded-xl border flex flex-col items-center gap-2 transition",
                                            selectedPaymentMethod === 'stripe'
                                                ? "bg-indigo-600/20 border-indigo-500 text-white"
                                                : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <CreditCard className="w-6 h-6" />
                                        <span className="text-xs font-bold">Stripe</span>
                                    </button>

                                    {/* PayPal */}
                                    <button
                                        onClick={() => setSelectedPaymentMethod('paypal')}
                                        className={cx(
                                            "p-3 rounded-xl border flex flex-col items-center gap-2 transition",
                                            selectedPaymentMethod === 'paypal'
                                                ? "bg-blue-600/20 border-blue-500 text-white"
                                                : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <Globe className="w-6 h-6" />
                                        <span className="text-xs font-bold">PayPal</span>
                                    </button>

                                    {/* Bank */}
                                    <button
                                        onClick={() => setSelectedPaymentMethod('bank')}
                                        className={cx(
                                            "p-3 rounded-xl border flex flex-col items-center gap-2 transition",
                                            selectedPaymentMethod === 'bank'
                                                ? "bg-emerald-600/20 border-emerald-500 text-white"
                                                : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"
                                        )}
                                    >
                                        <Building2 className="w-6 h-6" />
                                        <span className="text-xs font-bold">Bank</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-6 px-2">
                                <span className="text-gray-400 text-sm">Total Price</span>
                                <span className="text-2xl font-bold text-rose-400">${purchaseConfession.price}</span>
                            </div>

                            <button
                                onClick={handleUnlockPurchase}
                                disabled={selectedPaymentMethod === 'wallet' && myWalletBalance < purchaseConfession.price}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 font-bold text-white hover:opacity-90 transition shadow-[0_0_20px_rgba(225,29,72,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Payment
                            </button>
                        </NeonCard>
                    </div>
                )}

                {/* 2. View Content Modal (for unlocked items) */}
                {viewConfession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                        <NeonCard className="w-full max-w-2xl p-0 bg-gray-900 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                                <div>
                                    <h3 className="font-bold text-lg">{viewConfession.title}</h3>
                                    <div className="text-xs text-rose-300">Unlocked • {viewConfession.type}</div>
                                </div>
                                <button onClick={() => setViewConfession(null)}><X className="w-6 h-6 text-gray-400" /></button>
                            </div>
                            <div className="p-8 overflow-y-auto flex-1 flex items-center justify-center text-center bg-black/20">
                                {viewConfession.type === 'Text' && (
                                    <p className="text-xl leading-relaxed font-serif text-rose-100 italic">
                                        "{viewConfession.content || viewConfession.teaser}"
                                    </p>
                                )}
                                {(viewConfession.type === 'Video' || viewConfession.type === 'Voice') && (
                                    <div className="w-full max-w-lg bg-black rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
                                        {viewConfession.type === 'Video' ? (
                                            viewConfession.media_url ? (
                                                <video
                                                    src={viewConfession.media_url}
                                                    controls
                                                    className="w-full h-full aspect-video object-contain"
                                                    autoPlay
                                                />
                                            ) : (
                                                <div className="h-48 flex items-center justify-center text-gray-500">No video source</div>
                                            )
                                        ) : (
                                            viewConfession.media_url ? (
                                                <div className="p-8 w-full flex flex-col items-center">
                                                    <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mb-4 animate-pulse">
                                                        <Mic className="w-8 h-8 text-rose-400" />
                                                    </div>
                                                    <audio
                                                        src={viewConfession.media_url}
                                                        controls
                                                        className="w-full"
                                                        autoPlay
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-32 flex items-center justify-center text-gray-500">No audio source</div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </NeonCard>
                    </div>
                )}

                {/* 3. Delivery Review Modal */}
                {reviewRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <NeonCard className="w-full max-w-lg p-6 bg-gray-900 border border-green-500/20">
                            <h3 className="text-xl text-green-400 mb-4 font-bold flex items-center justify-between">
                                <span>Delivery Review</span>
                                <button onClick={() => setReviewRequest(null)}><X className="w-5 h-5 text-gray-400" /></button>
                            </h3>

                            <div className="bg-black/50 p-4 rounded-xl border border-white/10 mb-4">
                                <div className="text-xs text-gray-400 mb-1">Your Request:</div>
                                <div className="text-gray-200 italic mb-3">"{reviewRequest.topic}"</div>
                            </div>

                            <div className="space-y-4">
                                <div className="text-sm text-gray-300">Creator has delivered:</div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 min-h-[100px] flex items-center justify-center text-center overflow-hidden">
                                    {reviewRequest.delivery_content ? (
                                        <div className="w-full">
                                            {/* Check if content is URL (Visual check for http) */}
                                            {reviewRequest.delivery_content.startsWith('http') ? (
                                                <>
                                                    {/* Video Ext check (naive but effective for MVP) */}
                                                    {['mp4', 'mov', 'webm'].some(ext => reviewRequest.delivery_content?.toLowerCase().includes('.' + ext)) ? (
                                                        <video src={reviewRequest.delivery_content} controls className="w-full rounded-lg max-h-[300px]" />
                                                    ) : ['mp3', 'wav', 'ogg', 'm4a'].some(ext => reviewRequest.delivery_content?.toLowerCase().includes('.' + ext)) ? (
                                                        <div className="w-full flex justify-center py-4">
                                                            <audio src={reviewRequest.delivery_content} controls className="w-full" />
                                                        </div>
                                                    ) : (
                                                        <a
                                                            href={reviewRequest.delivery_content}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-rose-400 underline break-all font-mono text-xs hover:text-rose-300"
                                                        >
                                                            {reviewRequest.delivery_content}
                                                        </a>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-rose-200 whitespace-pre-wrap font-serif italic text-lg">"{reviewRequest.delivery_content}"</p>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-500">Content loading...</span>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleApproveDelivery(reviewRequest.id)}
                                    className="w-full py-3 rounded-xl bg-green-600 font-bold text-white hover:bg-green-700 transition shadow-lg shadow-green-900/30"
                                >
                                    Accept Delivery & Release Funds
                                </button>
                            </div>
                        </NeonCard>
                    </div>
                )}


                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push("/home")}
                                className="rounded-xl border border-pink-500/25 bg-black/40 px-3 py-2 text-sm text-pink-200 hover:bg-white/5 inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <div>
                                <div className="text-rose-200 text-sm">Confessions — Room Preview</div>
                                <div className="text-[11px] text-gray-400">Creator-led secrets • Pay-to-unlock • Reactions • Requests</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* --- LEFT SIDEBAR --- */}
                        <div className="lg:col-span-4 space-y-6">

                            {/* Creator Spotlight */}
                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-rose-200 text-sm">Creator Spotlight</div>
                                    <span className="text-[10px] px-2 py-[2px] rounded-full border border-rose-400/30 text-rose-200 bg-black/40 neon-flicker">Live</span>
                                </div>
                                <div className="rounded-2xl overflow-hidden border border-rose-400/20 bg-black/40 aspect-video relative flex items-center justify-center bg-gradient-to-b from-rose-900/20 to-black">
                                    <Video className="w-8 h-8 text-rose-500/50" />
                                </div>
                                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-black/35 p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-rose-200">Countdown</div>
                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-yellow-400/30 text-yellow-200 bg-black/40">Goal ${GOAL_TARGET}</span>
                                    </div>
                                    <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div className="h-full bg-rose-500/70" style={{ width: `${clamp((goalTotal / GOAL_TARGET) * 100, 0, 100)}%` }} />
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        {[5, 10, 25].map((amt) => (
                                            <button key={amt} className="rounded-xl border border-rose-400/25 bg-black/40 py-2 text-sm hover:bg-white/5" onClick={() => { setGoalTotal(g => g + amt); pay(amt); }}>+${amt}</button>
                                        ))}
                                    </div>
                                </div>
                            </NeonCard>

                            {/* My Requests */}
                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-rose-200 text-sm">My Requests</div>
                                    <span className="text-[10px] text-gray-400">{requests.length} Active</span>
                                </div>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {loadingRequests && <div className="text-center text-gray-500 text-xs py-2">Loading...</div>}
                                    {!loadingRequests && requests.length === 0 && (
                                        <div className="text-xs text-gray-500 text-center py-4 border border-white/5 rounded-xl bg-white/5">No requests yet.</div>
                                    )}
                                    {requests.map(req => (
                                        <div key={req.id} className="p-3 rounded-xl border border-white/10 bg-black/40 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-xs text-gray-200 truncate font-medium">{req.topic}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={cx(
                                                        "text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider",
                                                        req.status === 'pending_approval' ? "border-yellow-500/30 text-yellow-500" :
                                                            req.status === 'in_progress' ? "border-blue-500/30 text-blue-500" :
                                                                req.status === 'delivered' ? "border-green-500/30 text-green-500" :
                                                                    "border-gray-500/30 text-gray-500"
                                                    )}>{req.status === 'pending_approval' ? 'Pending' : req.status}</span>
                                                    <span className="text-[10px] text-gray-400">${req.amount}</span>
                                                </div>
                                            </div>
                                            {req.status === 'delivered' && (
                                                <button onClick={() => setReviewRequest(req)} className="px-3 py-1.5 text-xs bg-green-900/40 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-900/60 font-bold">Review</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </NeonCard>
                        </div>

                        {/* --- CENTER: Confession Wall --- */}
                        <NeonCard className="lg:col-span-5 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-rose-200 text-sm">Confession Wall</div>
                            </div>

                            <div className="space-y-3">
                                {loadingWall && <div className="text-center text-gray-500 py-10">Loading confessions...</div>}

                                {!loadingWall && confessions.length === 0 && (
                                    <div className="text-center text-gray-500 py-10 border border-white/5 rounded-xl">No confessions posted yet.</div>
                                )}

                                {confessions.map((c) => {
                                    const colorClass = tierColors[c.tier] || tierColors['Spicy'];
                                    const isUnlocked = myUnlocks.has(c.id);

                                    return (
                                        <div key={c.id} className={cx("rounded-2xl border bg-black/35 p-3 transition", isUnlocked ? "border-rose-400/35" : "border-white/10")}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm text-gray-100 flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-2">
                                                            <Lock className={cx("w-3 h-3", isUnlocked ? "opacity-0" : "text-rose-200")} />
                                                            <span className="font-medium">Confession #{c.id.slice(0, 4)}</span>
                                                        </span>
                                                        <span className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", colorClass)}>{c.tier}</span>
                                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">{c.type}</span>
                                                    </div>
                                                    <div className={cx("mt-2 text-sm", isUnlocked ? "text-gray-100" : "text-gray-300 blur-[2px] select-none")}>
                                                        {isUnlocked ? (c.content || c.teaser) : (c.teaser || "This content is hidden")}
                                                    </div>
                                                </div>

                                                {!isUnlocked ? (
                                                    <button
                                                        onClick={() => setPurchaseConfession(c)}
                                                        className="shrink-0 rounded-xl border border-rose-400/30 bg-rose-600 px-4 py-2 text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-900/20"
                                                    >
                                                        Unlock <span className="opacity-75 ml-1">${c.price}</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setViewConfession(c)}
                                                        className="shrink-0 rounded-xl border border-rose-400/25 bg-black/40 px-4 py-2 text-sm hover:bg-white/5"
                                                    >
                                                        Open
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </NeonCard>

                        {/* --- RIGHT SIDEBAR --- */}
                        <div className="lg:col-span-3 space-y-6">

                            {/* Request Form */}
                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-rose-200 text-sm">Request Confession</div>
                                    <span className="text-[10px] text-gray-400">Custom</span>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-4">
                                    {/* ... Inputs ... */}
                                    <div>
                                        <div className="text-[11px] text-gray-400 mb-2">I want a...</div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['Text', 'Audio', 'Video'].map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => setReqType(t as any)}
                                                    className={cx(
                                                        "text-xs py-2 rounded-lg border transition flex flex-col items-center justify-center gap-1",
                                                        reqType === t
                                                            ? "bg-rose-600 border-rose-400 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)]"
                                                            : "bg-black/40 border-white/10 text-gray-400 hover:bg-white/5"
                                                    )}
                                                >
                                                    {t === 'Text' && <FileText className="w-3 h-3" />}
                                                    {t === 'Audio' && <Mic className="w-3 h-3" />}
                                                    {t === 'Video' && <Video className="w-3 h-3" />}
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[11px] text-gray-400 mb-2">My Offer Amount ($)</div>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400">$</span>
                                            <input
                                                type="number"
                                                value={reqAmount}
                                                onChange={(e) => setReqAmount(Number(e.target.value))}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-6 pr-3 py-2 text-sm text-white focus:border-rose-400/50 outline-none"
                                                min={5}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[11px] text-gray-400 mb-2">Topic prompt</div>
                                        <textarea
                                            value={reqTopic}
                                            onChange={(e) => setReqTopic(e.target.value)}
                                            className="w-full rounded-xl border border-rose-400/20 bg-black/40 px-3 py-2 text-sm outline-none resize-none h-24 focus:border-rose-500/50"
                                            placeholder="What should they confess?"
                                        />
                                    </div>

                                    <button
                                        className={cx(
                                            "mt-1 w-full rounded-xl border border-rose-400/30 bg-rose-600 py-3 text-sm font-bold hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(225,29,72,0.2)]",
                                        )}
                                        onClick={handleOpenConfirm}
                                        disabled={isSending || !reqTopic.trim()}
                                    >
                                        Send Request
                                    </button>
                                    <div className="text-[10px] text-gray-500 text-center leading-tight">
                                        Summary & Payment next.
                                    </div>
                                </div>
                            </NeonCard>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
}
