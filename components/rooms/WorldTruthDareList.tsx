
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Flame, Lock, Users, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

// Types
type ActiveSession = {
    room_id: string;
    session_title: string;
    session_description: string;
    is_private: boolean;
    unlock_price: number;
    host_name: string;
    host_avatar: string | null;
};

export default function WorldTruthDareList() {
    const supabase = createClient();
    const router = useRouter();
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                // Fetch active games joined with room host profile
                const { data, error } = await supabase
                    .from('truth_dare_games')
                    .select(`
                        room_id, session_title, session_description, is_private, unlock_price,
                        rooms!inner (
                             id,
                             host_id,
                             status
                        )
                    `)
                    .eq('status', 'active');

                if (error) throw error;

                // Now fetch profiles for hosts (since joined query is tricky with deeply nested/alias)
                // Or try a view. For now, manual fetch works for small lists.
                // Optimizing: fetch profiles in parallel
                const validGames = data.filter((g: any) => g.rooms?.status === 'live');
                if (validGames.length === 0) {
                    setSessions([]);
                    setLoading(false);
                    return;
                }

                const hostIds = validGames.map((g: any) => g.rooms.host_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', hostIds);

                const profileMap = new Map(profiles?.map(p => [p.id, p]));

                const mapped = validGames.map((g: any) => ({
                    room_id: g.room_id,
                    session_title: g.session_title,
                    session_description: g.session_description,
                    is_private: g.is_private,
                    unlock_price: g.unlock_price,
                    host_name: profileMap.get(g.rooms.host_id)?.username || "Unknown",
                    host_avatar: profileMap.get(g.rooms.host_id)?.avatar_url || null
                }));

                setSessions(mapped);

            } catch (err) {
                console.error("Error fetching T&D sessions:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();

        // Realtime subscription (truth_dare_games update)
        const channel = supabase.channel('world_tod')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'truth_dare_games' }, () => fetchSessions())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading) return <div className="p-4 text-xs text-gray-500 animate-pulse">Loading active sessions...</div>;
    if (sessions.length === 0) return null; // Don't show if empty

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 text-pink-200 text-sm font-medium">
                <Flame className="w-4 h-4 text-pink-500" />
                World Truth & Dare
                <span className="text-[10px] ml-auto text-pink-500/70 animate-pulse">● Live Now</span>
            </div>

            <div className="space-y-3">
                {sessions.map(session => (
                    <div
                        key={session.room_id}
                        onClick={() => router.push(`/rooms/truth-or-dare?roomId=${session.room_id}`)}
                        className="group relative cursor-pointer rounded-xl border border-pink-500/20 bg-black/40 overflow-hidden hover:border-pink-500/50 transition-colors"
                    >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="p-3 relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {session.host_avatar ? (
                                        <img src={session.host_avatar} className="w-5 h-5 rounded-full border border-pink-500/30" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-pink-500/20" />
                                    )}
                                    <span className="text-xs text-pink-200 font-medium">{session.host_name}</span>
                                </div>
                                {session.is_private ? (
                                    <span className="text-[10px] flex items-center gap-1 bg-purple-900/40 border border-purple-500/30 px-1.5 py-0.5 rounded text-purple-200">
                                        <Lock className="w-3 h-3" /> ${session.unlock_price}
                                    </span>
                                ) : (
                                    <span className="text-[10px] flex items-center gap-1 bg-green-900/40 border border-green-500/30 px-1.5 py-0.5 rounded text-green-200">
                                        <Users className="w-3 h-3" /> Free
                                    </span>
                                )}
                            </div>

                            <div className="text-sm text-gray-200 font-medium truncate mb-0.5">{session.session_title}</div>
                            {session.session_description && (
                                <div className="text-[11px] text-gray-500 truncate">{session.session_description}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
