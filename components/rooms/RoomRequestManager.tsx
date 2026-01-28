"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, User } from 'lucide-react';
import { toast } from 'sonner';

interface RoomRequestManagerProps {
    roomId: string;
}

type RoomRequest = {
    id: string;
    user_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    profile?: {
        username: string;
        avatar_url: string;
    };
};

export default function RoomRequestManager({ roomId }: RoomRequestManagerProps) {
    const supabase = createClient();
    const [requests, setRequests] = useState<RoomRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roomId) return;

        const fetchRequests = async () => {
            // Fetch requests + profile info
            const { data, error } = await supabase
                .from('room_requests')
                .select(`
                    *,
                    profile:profiles!user_id(username, avatar_url)
                `)
                .eq('room_id', roomId)
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (data) {
                // Map the joined profile data cleanly
                const mapped = data.map((r: any) => ({
                    ...r,
                    profile: r.profile
                }));
                setRequests(mapped);
            }
            setLoading(false);
        };

        fetchRequests();

        // Realtime Subscription
        const channel = supabase.channel(`room_requests_host_${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'room_requests',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                if (payload.new.status === 'pending') {
                    // Refetch to get profile (doing single fetch to avoid complex join logic in realtime payload)
                    fetchRequests();
                    toast.info("New Join Request!");
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, supabase]);

    const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('room_requests')
                .update({ status: action })
                .eq('id', requestId);

            if (error) throw error;

            toast.success(`Request ${action}`);
            setRequests(prev => prev.filter(r => r.id !== requestId));

        } catch (e) {
            console.error(e);
            toast.error("Failed to update request");
        }
    };

    if (loading) return null;
    if (requests.length === 0) return null;

    return (
        <div className="absolute top-24 right-6 z-50 w-80">
            <div className="bg-black/80 backdrop-blur-xl border border-pink-500/30 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-pink-500/20 px-4 py-2 text-xs font-bold text-pink-300 border-b border-pink-500/20 flex justify-between items-center">
                    <span>PENDING REQUESTS</span>
                    <span className="bg-pink-500 text-white px-1.5 rounded-full text-[10px]">{requests.length}</span>
                </div>

                <div className="max-h-60 overflow-y-auto">
                    <AnimatePresence>
                        {requests.map(req => (
                            <motion.div
                                key={req.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-3 border-b border-white/5 flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {req.profile?.avatar_url ? (
                                        <img src={req.profile.avatar_url} className="w-8 h-8 rounded-full border border-white/10" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                            <User className="w-4 h-4 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="truncate">
                                        <div className="text-sm font-medium text-white truncate">{req.profile?.username || "Unknown"}</div>
                                        <div className="text-[10px] text-gray-500">Wants to join</div>
                                    </div>
                                </div>

                                <div className="flex gap-1 shrink-0">
                                    <button
                                        onClick={() => handleAction(req.id, 'rejected')}
                                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'approved')}
                                        className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
