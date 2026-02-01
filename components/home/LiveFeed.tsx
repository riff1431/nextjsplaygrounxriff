"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Lock, Radio, Users, ChevronRight } from "lucide-react";
import SessionPreviewModal from "@/components/live/SessionPreviewModal";

interface ActiveStream {
    id: string;
    room_id: string;
    session_title: string;
    session_description: string;
    is_private: boolean;
    unlock_price: number;
    room: {
        title: string;
        host_id: string; // Needed to fetch profile
    };
    host?: {
        username: string;
        avatar_url: string | null;
    };
}

export default function LiveFeed() {
    const [streams, setStreams] = useState<ActiveStream[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<any>(null); // Using any to match Modal's loose typing for now
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        fetchStreams();

        const channel = supabase
            .channel('live_feed_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'truth_dare_games' }, (payload) => {
                console.log("LiveFeed: Realtime update!", payload);
                fetchStreams();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchStreams() {
        try {
            // 1. Fetch Games
            const { data: games, error } = await supabase
                .from('truth_dare_games')
                .select(`
                    room_id,
                    session_title,
                    session_description,
                    is_private,
                    unlock_price,
                    room:rooms (
                        title,
                        host_id
                    )
                `)
                .eq('status', 'active');

            console.log("LiveFeed: Fetched games:", games?.length, games);

            if (error) {
                console.error("Error fetching streams:", error);
                setLoading(false);
                return;
            }

            const rawStreams = (games as any[]) || [];

            // 2. Fetch Creator Profiles
            if (rawStreams.length > 0) {
                const hostIds = Array.from(new Set(rawStreams.map(s => s.room?.host_id).filter(Boolean)));

                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', hostIds);

                // Merge
                const streamsWithProfiles = rawStreams.map(s => ({
                    ...s,
                    id: s.room_id,
                    host: profiles?.find(p => p.id === s.room?.host_id)
                }));
                setStreams(streamsWithProfiles);
            } else {
                setStreams([]);
            }

        } catch (e) {
            console.error("Feed error:", e);
        } finally {
            setLoading(false);
        }
    }

    if (!loading && streams.length === 0) {
        return (
            <div className="mb-8">
                <h2 className="text-lg font-bold text-white tracking-wide mb-4">Live Now</h2>
                <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-white/5 bg-gray-900/50">
                    <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mb-4">
                        <Radio className="w-8 h-8 text-pink-500/50" />
                    </div>
                    <p className="text-gray-400 text-sm">No live streams at the moment</p>
                    <p className="text-gray-600 text-xs mt-1">Be the first to go live!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide">Live Now</h2>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {loading ? (
                    [1, 2].map(i => (
                        <div key={i} className="aspect-[4/5] rounded-2xl bg-white/5 animate-pulse" />
                    ))
                ) : (
                    streams.map((stream) => {
                        const bgImage = stream.host?.avatar_url || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80";

                        return (
                            <div
                                key={stream.id}
                                onClick={() => {
                                    // Adapt stream data to match SessionPreviewModal expected structure
                                    setSelectedSession({
                                        id: stream.room_id,
                                        title: stream.session_title || stream.room.title,
                                        host: stream.host || { username: 'Unknown', avatar_url: null },
                                        meta: {
                                            is_private: stream.is_private,
                                            price: stream.unlock_price,
                                            description: stream.session_description,
                                            // mocks for now as LiveFeed doesn't fetch these
                                            filled: 0,
                                            capacity: 100
                                        }
                                    });
                                }}
                                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/5 bg-gray-900 transition-all hover:border-pink-500/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] aspect-[4/5]"
                            >
                                {/* Background Image with conditional blur */}
                                <div
                                    className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${stream.is_private ? 'blur-md scale-110 opacity-60' : 'group-hover:scale-105 opacity-80'}`}
                                    style={{ backgroundImage: `url(${bgImage})` }}
                                />

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                                {/* "Private" Lock Overlay */}
                                {stream.is_private && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30 mb-2">
                                            <Lock className="w-7 h-7 text-white" />
                                        </div>
                                        <span className="text-white font-bold text-lg drop-shadow-md">Unlock for ${stream.unlock_price}</span>
                                    </div>
                                )}

                                {/* Content */}
                                <div className="absolute inset-x-0 bottom-0 p-3 z-20">
                                    <div className="mb-2">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/90 text-white text-[9px] font-bold uppercase tracking-wider shadow-lg shadow-red-600/20">
                                                <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
                                            </span>
                                            {stream.is_private && (
                                                <span className="px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-gray-300 text-[9px] font-medium">
                                                    Private
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-white font-bold text-base leading-tight mb-0.5 line-clamp-1">
                                            {stream.session_title || "Interactive Session"}
                                        </h3>
                                        <p className="text-gray-300 text-xs line-clamp-1">
                                            {stream.host?.username || "Creator"}
                                        </p>
                                    </div>

                                    {!stream.is_private ? (
                                        <div className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                                            Watch <ChevronRight className="w-3 h-3" />
                                        </div>
                                    ) : (
                                        <div className="w-full py-1.5 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 backdrop-blur-md border border-pink-500/20 text-pink-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                                            Unlock
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {selectedSession && (
                <SessionPreviewModal
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                />
            )}
        </div>
    );
}
