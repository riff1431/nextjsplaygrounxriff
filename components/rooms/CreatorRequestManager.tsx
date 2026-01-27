"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, DollarSign } from 'lucide-react';

interface CreatorRequestManagerProps {
    roomId: string;
}

type RequestData = {
    id: string;
    type: string;
    content: string;
    tier: string;
    amount: number;
    status: string;
    fan_id: string;
};

export default function CreatorRequestManager({ roomId }: CreatorRequestManagerProps) {
    const supabase = createClient();
    const [queue, setQueue] = useState<RequestData[]>([]);

    useEffect(() => {
        if (!roomId) return;

        // Load existing pending
        supabase
            .from('truth_dare_requests')
            .select('*')
            .eq('room_id', roomId)
            .eq('status', 'pending')
            .order('created_at', { ascending: true }) // Oldest first
            .then(({ data }) => {
                if (data) setQueue(data);
            });

        // Realtime
        const channel = supabase.channel(`creator_queue:${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'truth_dare_requests',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const newRec = payload.new as RequestData;
                if (newRec.status === 'pending') {
                    setQueue(prev => [...prev, newRec]);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, supabase]);

    const handleConfirm = async (req: RequestData) => {
        // Set to active (triggers Overlay for everyone)
        await supabase
            .from('truth_dare_requests')
            .update({ status: 'active' })
            .eq('id', req.id);

        // Remove from local queue
        setQueue(prev => prev.filter(q => q.id !== req.id));
    };

    const handleReject = async (req: RequestData) => {
        // Reject (removes it, functionally 'eats' the money in this MVP unless we refund)
        // User asked for "Confirm", assuming rejection is rare or manual refund.
        await supabase
            .from('truth_dare_requests')
            .update({ status: 'rejected' })
            .eq('id', req.id);

        setQueue(prev => prev.filter(q => q.id !== req.id));
    };

    if (queue.length === 0) return null;

    // Show only the first one (FIFO)
    const current = queue[0];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm"
            >
                <div className="bg-gray-900/90 backdrop-blur-xl border border-pink-500/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                    {/* Glowing Border Effect */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>

                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="text-xs text-pink-400 font-bold uppercase tracking-wider mb-1">
                                Incoming {current.tier || "Custom"} {current.type.includes('truth') ? 'Truth' : 'Dare'}
                            </div>
                            <div className="text-white font-semibold text-lg leading-tight">
                                "{current.content}"
                            </div>
                        </div>
                        <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> {current.amount}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => handleReject(current)}
                            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-semibold text-sm transition"
                        >
                            Skip / Reject
                        </button>
                        <button
                            onClick={() => handleConfirm(current)}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-pink-900/40 transition flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" /> Confirm & Show
                        </button>
                    </div>

                    {queue.length > 1 && (
                        <div className="mt-3 text-center text-[10px] text-gray-500">
                            +{queue.length - 1} more requests in queue
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
