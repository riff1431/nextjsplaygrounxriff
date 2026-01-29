"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Search, Filter, Crown, Lock, User, Video, Mic, ArrowLeft, Users } from 'lucide-react';
import BrandLogo from '@/components/common/BrandLogo';

import SessionPreviewModal from '@/components/live/SessionPreviewModal';

type LiveRoom = {
    id: string;
    title: string;
    type: string;
    host_id: string;
    status: string;
    created_at: string;
    host: {
        username: string;
        avatar_url: string;
    };
    // We might need to fetch specific game details (price/private) separately or via view
    // For MVP listing, we'll assume some defaults or fetch on demand
    meta?: {
        is_private: boolean;
        price: number;
        capacity: number;
        filled: number;
        description?: string;
    };
};

export default function LiveSessionsPage() {
    const supabase = createClient();
    const router = useRouter();
    const [rooms, setRooms] = useState<LiveRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedSession, setSelectedSession] = useState<LiveRoom | null>(null);

    useEffect(() => {
        fetchRooms();

        const channel = supabase.channel('live_rooms_list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchRooms())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchRooms = async () => {
        // Fetch all LIVE rooms
        const { data, error } = await supabase
            .from('rooms')
            .select(`
                *,
                host:profiles!host_id(username, avatar_url)
            `)
            .eq('status', 'live')
            .order('created_at', { ascending: false });

        if (data) {
            // For each room, we ideally want to know is_private / price.
            // This might require a secondary fetch to truth_dare_games etc.
            // unique room types
            const enriched = await Promise.all(data.map(async (room: any) => {
                let meta = { is_private: false, price: 10, capacity: 50, filled: 0 };

                if (room.type === 'truth_dare') {
                    const { data: game } = await supabase
                        .from('truth_dare_games')
                        .select('is_private, unlock_price, capacity, current_participants')
                        .eq('room_id', room.id)
                        .single();
                    if (game) {
                        meta = {
                            is_private: game.is_private,
                            price: game.unlock_price,
                            capacity: game.capacity || 50,
                            filled: game.current_participants || 0 // We might need to count this properly
                        };
                    }
                }
                return { ...room, host: room.host, meta };
            }));
            setRooms(enriched);
        }
        setLoading(false);
    };

    const filteredRooms = rooms.filter(r => {
        if (filter === 'all') return true;
        if (filter === 'private') return r.meta?.is_private;
        if (filter === 'public') return !r.meta?.is_private;
        return true;
    });

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20">
            {/* Header */}
            <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/home')} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
                            Live Sessions
                        </h1>
                        <p className="text-gray-400 text-sm">Join active rooms happening right now</p>
                    </div>
                </div>
                <BrandLogo showBadge={false} />
            </div>

            {/* Filters */}
            <div className="max-w-6xl mx-auto mb-8 flex gap-3 overflow-x-auto pb-2">
                {['all', 'public', 'private'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl border text-sm capitalize transition whitespace-nowrap ${filter === f
                            ? 'bg-pink-600 border-pink-500 text-white'
                            : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'
                            }`}
                    >
                        {f} Rooms
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-20 text-gray-500 animate-pulse">Loading live sessions...</div>
                ) : filteredRooms.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-500">
                        <Video className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        No active sessions found.
                    </div>
                ) : (
                    filteredRooms.map(room => (
                        <div key={room.id} className="group relative rounded-3xl bg-gray-900/40 border border-white/5 overflow-hidden hover:border-pink-500/30 transition-all hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]">
                            {/* Cover / Preview */}
                            <div className="h-40 bg-gray-800 relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
                                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
                                </div>
                                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-[10px] items-center gap-1 flex">
                                    {room.meta?.is_private ? <Lock className="w-3 h-3 text-yellow-400" /> : <Video className="w-3 h-3 text-pink-400" />}
                                    <span className={room.meta?.is_private ? "text-yellow-300" : "text-pink-300"}>
                                        {room.meta?.is_private ? "Private" : "Public"}
                                    </span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">{room.title}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            {room.host.avatar_url ? (
                                                <img src={room.host.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center"><User className="w-3 h-3" /></div>
                                            )}
                                            <span className="truncate">{room.host.username}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-green-400">${room.meta?.price || 10}</div>
                                        <div className="text-[10px] text-gray-500">Entry</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-gray-500 mb-4 bg-black/20 p-2 rounded-lg">
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        <span>{room.meta?.filled} / {room.meta?.capacity}</span>
                                    </div>
                                    <div className="capitalize text-pink-400/80">{room.type.replace('_', ' ')}</div>
                                </div>

                                <button
                                    onClick={() => setSelectedSession(room)}
                                    className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2"
                                >
                                    {room.meta?.is_private ? 'Request to Join' : 'Join Room'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Preview Modal */}
            {selectedSession && (
                <SessionPreviewModal
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                />
            )}
        </div>
    );
}
