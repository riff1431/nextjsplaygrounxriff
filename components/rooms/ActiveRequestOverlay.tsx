"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ActiveRequestOverlayProps {
    roomId: string;
    isHost?: boolean; // If host, maybe show "Clear" button?
}

type RequestData = {
    id: string;
    type: string; // 'system_truth', 'custom_dare', etc.
    content: string;
    tier?: string;
    fan_id?: string;
    amount: number;
    status: string;
};

export default function ActiveRequestOverlay({ roomId, isHost }: ActiveRequestOverlayProps) {
    const supabase = createClient();
    const [activeRequest, setActiveRequest] = useState<RequestData | null>(null);

    // Initial Fetch & Realtime Subscription
    useEffect(() => {
        if (!roomId) return;

        // Fetch current active if any (e.g. joined late)
        supabase
            .from('truth_dare_requests')
            .select('*')
            .eq('room_id', roomId)
            .eq('status', 'active')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single()
            .then(({ data }) => {
                if (data) setActiveRequest(data);
            });

        // Realtime
        const channel = supabase.channel(`public:truth_dare_requests:${roomId}`)
            .on('postgres_changes', {
                event: '*', // Listen to INSERT (rarely active immediately) and UPDATE
                schema: 'public',
                table: 'truth_dare_requests',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                const newRec = payload.new as RequestData;
                if (newRec.status === 'active') {
                    setActiveRequest(newRec);
                } else if (newRec.status === 'completed' || newRec.status === 'rejected') {
                    // If the completed one was the one we were showing, clear it
                    setActiveRequest(prev => prev?.id === newRec.id ? null : prev);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, supabase]);


    const handleComplete = async () => {
        if (!activeRequest || !isHost) return;
        await supabase
            .from('truth_dare_requests')
            .update({ status: 'completed' })
            .eq('id', activeRequest.id);
        setActiveRequest(null);
    };

    if (!activeRequest) return null;

    const isTruth = activeRequest.type.includes('truth');
    const colorClass = isTruth ? 'from-blue-600 to-blue-900' : 'from-pink-600 to-pink-900';
    const label = isTruth ? 'TRUTH' : 'DARE';

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 z-50">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={activeRequest.id}
                    initial={{ scale: 0, rotateY: 90, opacity: 0 }}
                    animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className={`
                        pointer-events-auto
                        relative w-full max-w-lg aspect-video rounded-3xl 
                        bg-gradient-to-br ${colorClass}
                        border-4 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]
                        flex flex-col items-center justify-center text-center p-8
                        backface-hidden perspective-1000
                    `}
                >
                    {/* Floating Particles/Decoration could go here */}

                    <div className="text-sm font-black tracking-[0.3em] text-white/50 mb-4 uppercase">
                        {activeRequest.tier || "Custom"} {label} Request
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl md:text-5xl font-black text-white drop-shadow-lg leading-tight"
                    >
                        "{activeRequest.content}"
                    </motion.div>

                    {activeRequest.amount > 0 && (
                        <div className="mt-6 px-4 py-2 bg-black/30 rounded-full border border-white/10 text-yellow-400 font-bold text-lg flex items-center gap-2">
                            Paid ${activeRequest.amount}
                        </div>
                    )}

                    {isHost && (
                        <button
                            onClick={handleComplete}
                            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white/70 hover:text-white transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
