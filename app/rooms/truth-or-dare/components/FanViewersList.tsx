"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Crown, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface Viewer {
    id: string;
    name: string;
    avatar?: string | null;
    joinedAt: number;
}

interface FanViewersListProps {
    roomId: string;
    userId: string | null;
    userName: string;
    userAvatar?: string | null;
}

export default function FanViewersList({ roomId, userId, userName, userAvatar }: FanViewersListProps) {
    const [viewers, setViewers] = useState<Viewer[]>([]);
    const supabase = createClient();

    useEffect(() => {
        if (!roomId || !userId) return;

        // Create presence channel for this room
        const presenceChannel = supabase.channel(`presence:${roomId}`, {
            config: {
                presence: {
                    key: userId,
                }
            }
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const presenceState = presenceChannel.presenceState();
                console.log('👥 Presence sync:', presenceState);

                // Convert presence state to viewers array
                const allViewers: Viewer[] = [];
                Object.entries(presenceState).forEach(([key, presences]) => {
                    if (Array.isArray(presences) && presences.length > 0) {
                        const presenceData = presences[0] as unknown as Record<string, unknown>;
                        allViewers.push({
                            id: (presenceData.id as string) || key,
                            name: (presenceData.name as string) || 'Anonymous',
                            avatar: presenceData.avatar as string | null | undefined,
                            joinedAt: (presenceData.joinedAt as number) || Date.now()
                        });
                    }
                });

                // Sort by join time
                allViewers.sort((a, b) => a.joinedAt - b.joinedAt);
                setViewers(allViewers);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('👤 User joined:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                console.log('👤 User left:', key);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Track this user's presence
                    await presenceChannel.track({
                        id: userId,
                        name: userName,
                        avatar: userAvatar,
                        joinedAt: Date.now()
                    });
                    console.log('✅ Presence tracked for:', userName);
                }
            });

        return () => {
            presenceChannel.untrack();
            supabase.removeChannel(presenceChannel);
        };
    }, [roomId, userId, userName, userAvatar, supabase]);

    // Function to get initials from name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Function to get a consistent color based on user id
    const getAvatarColor = (id: string) => {
        const colors = [
            'from-pink-500 to-rose-600',
            'from-purple-500 to-indigo-600',
            'from-blue-500 to-cyan-600',
            'from-green-500 to-emerald-600',
            'from-yellow-500 to-orange-600',
            'from-red-500 to-pink-600',
            'from-indigo-500 to-purple-600',
            'from-cyan-500 to-teal-600',
        ];
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-pink-400" />
                    <span className="text-sm font-semibold text-white">Fans in Room</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                    {viewers.length} online
                </span>
            </div>

            {/* Viewers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                    {viewers.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full text-center py-6 text-gray-500 text-xs"
                        >
                            No fans in room yet...
                        </motion.div>
                    ) : (
                        viewers.map((viewer, index) => (
                            <motion.div
                                key={viewer.id}
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                transition={{ delay: index * 0.05, type: "spring", damping: 15 }}
                                whileHover={{ scale: 1.03 }}
                                className="group relative"
                            >
                                {/* Card Container */}
                                <div className={`
                                    relative overflow-hidden rounded-xl p-3
                                    bg-gradient-to-br from-gray-900/80 via-gray-800/60 to-gray-900/80
                                    border border-pink-500/30 hover:border-pink-400/60
                                    backdrop-blur-sm
                                    transition-all duration-300
                                    hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]
                                    ${index === 0 ? 'border-yellow-500/40 hover:border-yellow-400/60' : ''}
                                `}>
                                    {/* Glow effect for first user */}
                                    {index === 0 && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
                                    )}

                                    <div className="flex flex-col items-center gap-2 relative z-10">
                                        {/* Avatar */}
                                        <div className="relative">
                                            {viewer.avatar ? (
                                                <img
                                                    src={viewer.avatar}
                                                    alt={viewer.name}
                                                    className="w-14 h-14 rounded-full object-cover border-2 border-pink-500/40 group-hover:border-pink-400 transition-all shadow-lg"
                                                />
                                            ) : (
                                                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(viewer.id)} flex items-center justify-center border-2 border-white/20 group-hover:border-pink-400 transition-all shadow-lg`}>
                                                    <span className="text-white text-base font-bold">
                                                        {getInitials(viewer.name)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Online indicator */}
                                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 shadow-md">
                                                <div className="w-full h-full rounded-full bg-green-400 animate-ping opacity-50" />
                                            </div>

                                            {/* Crown for first viewer */}
                                            {index === 0 && (
                                                <div className="absolute -top-2 -right-2 bg-yellow-500/20 rounded-full p-0.5">
                                                    <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Name */}
                                        <div className="text-center">
                                            <div className={`text-xs font-medium truncate max-w-[80px] ${viewer.id === userId
                                                    ? 'text-pink-300'
                                                    : index === 0
                                                        ? 'text-yellow-300'
                                                        : 'text-white'
                                                }`}>
                                                {viewer.id === userId ? 'You' : viewer.name}
                                            </div>
                                            {index === 0 && (
                                                <div className="text-[9px] text-yellow-500/70 uppercase tracking-wider mt-0.5">
                                                    First
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Viewer count hint */}
            {viewers.length > 0 && (
                <div className="text-[10px] text-gray-500 text-center">
                    Live viewers update in real-time
                </div>
            )}
        </div>
    );
}
