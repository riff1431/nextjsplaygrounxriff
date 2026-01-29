"use client";

import React, { useState, useEffect } from 'react';
import { X, Crown, Users, Video, Lock, CheckCircle, Play, Mic, AlertCircle, User } from 'lucide-react';
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
    const [accessStatus, setAccessStatus] = useState<'locked' | 'unlocked' | 'pending' | 'rejected' | 'none'>('locked');

    useEffect(() => {
        checkAccess();
    }, [session.id]);

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

        // 2. If Private, check request status
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

    // Action Logic
    let primaryAction;
    if (accessStatus === 'unlocked') {
        primaryAction = (
            <button onClick={handleEnter} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition">
                Enter Room <Play className="w-5 h-5 fill-current" />
            </button>
        );
    } else if (isPrivate && accessStatus === 'locked') {
        // Private, Not Unlocked. Check if Approved logic handled implicitly? 
        // Actually, if 'locked' here it implies 'Not Paid'. 
        // But for private, we need approval first. 
        // In checkAccess: if req exists: 
        //    if approved -> set 'locked' (ready to pay)
        //    if pending -> set 'pending'
        //    if none -> needs request.

        // So if accessStatus === 'locked', it means either Public(Locked) OR Private(Approved, Locked).
        // Wait, if no request exists for private, we should be in a state that offers "Request".
        // Let's refine checkAccess default:
        // If Private & No Request -> 'none' (handled by !unlock && !req condition in rendering?).

        // Correction: if no unlock found, accessStatus is 'locked' by default.
        // Let's use specific states for clarity in render.
    }

    const renderAction = () => {
        if (loading) return <div className="py-4 text-center text-gray-500 animate-pulse">Checking access...</div>;

        if (accessStatus === 'unlocked') {
            return (
                <button onClick={handleEnter} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-green-900/30">
                    Enter Room <Play className="w-5 h-5 fill-current" />
                </button>
            );
        }

        if (accessStatus === 'pending') {
            return (
                <button disabled className="w-full py-4 bg-gray-700 text-gray-400 font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                    Request Pending...
                </button>
            );
        }

        if (accessStatus === 'rejected') {
            return (
                <button disabled className="w-full py-4 bg-red-900/50 text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                    Request Declined
                </button>
            );
        }

        // State is 'locked'.
        // If Private & No Request (we need to detect this specific case better)
        // Ideally checkAccess should set 'needs_request' if private & no request found.

        // Let's assume for now:
        // If Private AND requestStatus != 'approved' (which we need to fetch) -> Request
        // We need that logic. 

        // Simplified: checkAccess sets 'locked' only if ready to pay (Public OR Private+Approved).
        // Otherwise 'needs_request'.

        // But let's look at the component logic again.
        // checkAccess sets 'locked' if no payment found. 
        // Then checks requests.
    };

    // Refined Render Logic inside return
    const canUnlock = !isPrivate || (isPrivate && accessStatus === 'locked'); // 'locked' here means Approved but Unpaid based on my checkAccess notes? logic needs to be tight.

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
                            onClick={handleUnlock}
                            disabled={unlocking}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-lg shadow-lg shadow-pink-900/40 transition flex items-center justify-center gap-2"
                        >
                            {unlocking ? "Processing Payment..." : `Unlock Access $${price}`}
                        </button>
                    )}

                    <p className="mt-4 text-xs text-gray-500">
                        Secure payment via PlaygroundX Wallet
                    </p>
                </div>
            </div>
        </div>
    );
}
