"use client";

import React, { useState, useEffect } from 'react';
import { X, Crown, Users, Video, Lock, CheckCircle, Play, Mic, AlertCircle, User, Wallet, CreditCard, ChevronRight, Landmark, Clock } from 'lucide-react';
import dynamic from 'next/dynamic';

const StripePaymentModal = dynamic(() => import('./StripePaymentModal'), { ssr: false });
const PayPalPaymentModal = dynamic(() => import('./PayPalPaymentModal'), { ssr: false });
const BankTransferModal = dynamic(() => import('./BankTransferModal'), { ssr: false });
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type SessionPreviewModalProps = {
    session: any;
    onClose: () => void;
};

export default function SessionPreviewModal({ session, onClose }: SessionPreviewModalProps) {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accessStatus, setAccessStatus] = useState<'locked' | 'unlocked' | 'pending' | 'rejected' | 'none' | 'pending_payment'>('locked');
    const [showPaymentOptions, setShowPaymentOptions] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [paymentSettings, setPaymentSettings] = useState<import('@/types/payment').PaymentSetting[]>([]);
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [showPayPalModal, setShowPayPalModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);

    useEffect(() => {
        checkAccess();
        fetchWalletBalance();
    }, [session.id]);

    useEffect(() => {
        if (showPaymentOptions) {
            fetchWalletBalance();
            fetchPaymentSettings();
        }
    }, [showPaymentOptions]);

    const fetchPaymentSettings = async () => {
        try {
            const res = await fetch('/api/v1/payments/settings');
            const data = await res.json();
            if (Array.isArray(data)) {
                setPaymentSettings(data);
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    const fetchWalletBalance = async () => {
        try {
            console.log("Fetching wallet balance...");
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log("No user found");
                return;
            }

            const { data: wallet, error } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error("Error fetching wallet:", error);
                setWalletBalance(0);
                return;
            }

            if (wallet) {
                console.log("Wallet found:", wallet);
                setWalletBalance(wallet.balance);
            } else {
                console.log("No wallet found, defaulting to 0");
                setWalletBalance(0);
            }
        } catch (err) {
            console.error('Error fetching balance:', err);
            setWalletBalance(0);
        }
    };

    const checkAccess = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        // 1. Check if already unlocked (paid)
        const { data: unlock } = await supabase
            .from('truth_dare_unlocks')
            .select('id')
            .eq('room_id', session.id)
            .eq('fan_id', user.id)
            .maybeSingle();

        if (unlock) {
            setAccessStatus('unlocked');
            setLoading(false);
            return;
        }

        // 2. Check for pending manual payments (Bank Transfer)
        const { data: pendingTx } = await supabase
            .from('payment_transactions')
            .select('status')
            .eq('room_id', session.id)
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (pendingTx) {
            setAccessStatus('pending_payment');
            setLoading(false);
            return;
        }

        // 3. If Private, check request status
        if (session.meta.is_private) {
            const { data: req } = await supabase
                .from('room_requests')
                .select('status')
                .eq('room_id', session.id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (req) {
                // If approved -> 'locked' (ready to pay)
                // If pending -> 'pending'
                // If rejected -> 'rejected'
                setAccessStatus(req.status === 'approved' ? 'locked' : req.status as any);
            } else {
                setAccessStatus('none'); // Needs request
            }
        } else {
            // Public -> locked (ready to pay)
            setAccessStatus('locked');
        }

        setLoading(false);
    };

    const handleUnlock = async () => {
        setUnlocking(true);
        setError(null);
        try {
            // For public rooms or approved private requests, we try to pay/unlock
            const response = await fetch(`/api/v1/rooms/${session.id}/truth-or-dare/unlock`, {
                method: 'POST'
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Failed to unlock");

            // Success
            setAccessStatus('unlocked');
            // Auto redirect after short delay or let user click "Enter"
            setTimeout(() => {
                router.push(`/rooms/truth-or-dare?roomId=${session.id}`);
            }, 1000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setUnlocking(false);
        }
    };

    const handleRequestJoin = async () => {
        setUnlocking(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Please log in");

            const { error: reqError } = await supabase
                .from('room_requests')
                .upsert({
                    room_id: session.id,
                    user_id: user.id,
                    status: 'pending'
                });

            if (reqError) throw reqError;
            setAccessStatus('pending');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUnlocking(false);
        }
    };

    const handleEnter = () => {
        router.push(`/rooms/truth-or-dare?roomId=${session.id}`);
    };

    // Derived State Logic
    const isPrivate = session.meta.is_private;
    const price = session.meta.price || 0;

    // Helper to get bank config
    const getBankDetails = () => {
        const setting = paymentSettings.find(s => s.provider === 'bank');
        return setting?.config || {};
    };

    // Payment Options Modal Content
    if (showPaymentOptions) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
                <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
                    <button onClick={() => setShowPaymentOptions(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-8">
                        <div className="text-center mb-8">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <Lock className="w-8 h-8 text-green-500" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Unlock Session</h3>
                            <p className="text-gray-400 text-sm">Select payment method to pay <span className="text-white font-bold">${price}</span></p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleUnlock}
                                disabled={unlocking}
                                className="w-full p-4 rounded-xl bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700 border border-white/10 flex items-center justify-between group transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-white">My Wallet</div>
                                        <div className="text-xs text-gray-500">
                                            Balance: {walletBalance !== null ? `$${walletBalance.toFixed(2)}` : 'Checking...'}
                                        </div>
                                    </div>
                                </div>
                                {unlocking ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
                                )}
                            </button>

                            {/* Dynamic Payment Gateways */}
                            {paymentSettings.map((setting) => (
                                <button
                                    key={setting.id}
                                    disabled={!setting.is_enabled}
                                    onClick={() => {
                                        if (setting.provider === 'stripe') {
                                            setShowStripeModal(true);
                                            setShowPaymentOptions(false);
                                        } else if (setting.provider === 'paypal') {
                                            setShowPayPalModal(true);
                                            setShowPaymentOptions(false);
                                        } else if (setting.provider === 'bank') {
                                            setShowBankModal(true);
                                            setShowPaymentOptions(false);
                                        }
                                    }}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition group ${setting.is_enabled
                                        ? 'bg-gray-800 border-white/10 hover:bg-gray-700 hover:border-white/20'
                                        : 'bg-gray-800/50 border-white/5 opacity-50 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${setting.is_enabled ? 'bg-white/10' : 'bg-white/5'}`}>
                                            {setting.provider === 'paypal' ? <CreditCard className={`w-5 h-5 ${setting.is_enabled ? 'text-blue-400' : 'text-gray-500'}`} /> :
                                                setting.provider === 'bank' ? <Landmark className={`w-5 h-5 ${setting.is_enabled ? 'text-green-400' : 'text-gray-500'}`} /> :
                                                    <CreditCard className={`w-5 h-5 ${setting.is_enabled ? 'text-indigo-400' : 'text-gray-500'}`} />}
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-semibold ${setting.is_enabled ? 'text-white' : 'text-gray-400'}`}>
                                                {setting.provider === 'bank' ? 'Bank Transfer' :
                                                    setting.provider === 'stripe' ? 'Stripe / Card' :
                                                        'PayPal'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {setting.is_enabled ? 'Available' : 'Unavailable'}
                                            </div>
                                        </div>
                                    </div>
                                    {setting.is_enabled && (
                                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (showStripeModal) {
        return (
            <StripePaymentModal
                amount={price}
                roomId={session.id}
                onClose={() => setShowStripeModal(false)}
                onSuccess={() => {
                    setShowStripeModal(false);
                    checkAccess(); // Refresh access status
                }}
            />
        );
    }

    if (showPayPalModal) {
        return (
            <PayPalPaymentModal
                amount={price}
                roomId={session.id}
                onClose={() => setShowPayPalModal(false)}
                onSuccess={() => {
                    setShowPayPalModal(false);
                    checkAccess(); // Refresh access status
                }}
            />
        );
    }

    if (showBankModal) {
        return (
            <BankTransferModal
                amount={price}
                roomId={session.id}
                bankDetails={getBankDetails()}
                onClose={() => setShowBankModal(false)}
                onSuccess={() => {
                    setShowBankModal(false);
                    checkAccess(); // Refresh access status
                }}
            />
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-white/10 text-white/70 transition z-10">
                    <X className="w-5 h-5" />
                </button>

                {/* Hero / Cover */}
                <div className="h-48 bg-gray-800 relative">
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

                    {/* Badge */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                            {isPrivate ? <Lock className="w-3 h-3 text-yellow-400" /> : <Video className="w-3 h-3 text-pink-400" />}
                            {isPrivate ? "Private Session" : "Public Session"}
                        </div>
                    </div>

                    {/* Creator Avatar - Large centered or overlapping */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                        <div className="w-20 h-20 rounded-full border-4 border-gray-900 bg-gray-800 overflow-hidden shadow-xl">
                            {session.host?.avatar_url ? (
                                <img src={session.host.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-700"><User className="w-8 h-8 text-gray-400" /></div>
                            )}
                        </div>
                        {/* Live Badge */}
                        <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 bg-green-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-black uppercase">
                            Live
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-12 pb-8 px-8 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">{session.title}</h2>
                    <p className="text-gray-400 text-sm mb-6 line-clamp-2">{session.meta?.description || "Join this interactive live session for Truth or Dare!"}</p>

                    {/* Stats / Info */}
                    <div className="flex items-center justify-center gap-6 mb-8 text-sm text-gray-500">
                        <div className="flex flex-col items-center gap-1">
                            <Users className="w-5 h-5 text-gray-400" />
                            <span>{session.meta?.filled} / {session.meta?.capacity}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center gap-1">
                            <Crown className="w-5 h-5 text-yellow-500" />
                            <span>VIP Access</span>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="mb-8 p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
                        <div className="text-xs text-pink-300 uppercase tracking-wider font-semibold mb-1">Session Entry Fee</div>
                        <div className="text-4xl font-bold text-white">${price}</div>
                        <div className={`mt-2 text-sm font-medium ${walletBalance !== null && walletBalance < price ? 'text-red-300' : 'text-green-300'}`}>
                            Your Balance: {walletBalance !== null ? `$${walletBalance.toFixed(2)}` : 'Checking...'}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2 text-left">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    {loading ? (
                        <div className="h-14 flex items-center justify-center text-gray-500 bg-white/5 rounded-xl animate-pulse">
                            Checking access...
                        </div>
                    ) : accessStatus === 'unlocked' ? (
                        <button
                            onClick={handleEnter}
                            className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg shadow-lg shadow-green-900/20 transition flex items-center justify-center gap-2"
                        >
                            Enter Room <Play className="w-5 h-5 fill-current" />
                        </button>
                    ) : accessStatus === 'pending_payment' ? (
                        <button disabled className="w-full py-4 rounded-xl bg-yellow-600/50 text-yellow-200 font-bold text-lg shadow-lg shadow-yellow-900/20 transition flex items-center justify-center gap-2 cursor-not-allowed">
                            <Clock className="w-5 h-5" />
                            Payment Verifying...
                        </button>
                    ) : (isPrivate && accessStatus !== 'locked') ? (
                        // Private Flow (Pending/None/Rejected)
                        accessStatus === 'pending' ? (
                            <button disabled className="w-full py-4 rounded-xl bg-gray-700 text-gray-400 font-bold cursor-not-allowed">Request Pending...</button>
                        ) : accessStatus === 'rejected' ? (
                            <button disabled className="w-full py-4 rounded-xl bg-red-900/50 text-red-400 font-bold cursor-not-allowed">Request Declined</button>
                        ) : (
                            // 'none' or Default for Private -> Request
                            <button
                                onClick={handleRequestJoin}
                                disabled={unlocking}
                                className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-lg shadow-blue-900/20 transition flex items-center justify-center gap-2"
                            >
                                {unlocking ? "Sending Request..." : "Request to Join"}
                            </button>
                        )
                    ) : (
                        // Public OR Private Approved -> Pay to Unlock
                        <button
                            onClick={() => setShowPaymentOptions(true)}
                            className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg shadow-lg shadow-green-900/20 transition flex items-center justify-center gap-2"
                        >
                            Enter Room <Play className="w-5 h-5 fill-current" />
                        </button>
                    )}

                    <p className="mt-4 text-xs text-gray-500">
                        Secure payment via PlaygroundX Wallet
                    </p>
                </div>
            </div>
        </div >
    );
}
