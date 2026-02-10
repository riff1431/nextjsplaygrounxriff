"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { NeonCard, NeonButton } from "@/components/ui/neon-shared";
import { ArrowLeft, Lock, MessageCircle, Sparkles, Video, Crown, Trophy } from "lucide-react";

// Fallback icon
function BarDrinkIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M7 3h10l-1 7a4 4 0 0 1-4 3H12a4 4 0 0 1-4-3L7 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path d="M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 13v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M9 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

const CATEGORIES: Record<string, { label: string; icon: any; tone: string }> = {
    "flash-drop": { label: "Flash Drops", icon: Sparkles, tone: "blue" },
    "confessions": { label: "Confessions", icon: Lock, tone: "red" },
    "x-chat": { label: "X Chat", icon: MessageCircle, tone: "yellow" },
    "bar-lounge": { label: "Bar Lounge", icon: BarDrinkIcon, tone: "purple" },
    "truth-or-dare": { label: "Truth or Dare", icon: Video, tone: "green" },
    "competition": { label: "Competitions", icon: Trophy, tone: "orange" },
    "suga-4-u": { label: "Suga 4 U", icon: Crown, tone: "pink" },
};

export default function RoomCategoryPage({ params }: { params: { category: string } }) {
    const router = useRouter();
    const supabase = createClient();
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const categoryKey = params.category;
    const categoryInfo = CATEGORIES[categoryKey] || { label: "Rooms", icon: MessageCircle, tone: "pink" };
    const Icon = categoryInfo.icon;

    useEffect(() => {
        const fetchRooms = async () => {
            // In a real app we'd filter by category type in DB
            // For now fetching all live rooms and client-side filtering or just showing all
            try {
                const { data, error } = await supabase
                    .from('rooms')
                    .select('*, host:profiles!host_id(username, avatar_url)')
                    .eq('status', 'live');

                if (error) throw error;
                setRooms(data || []);
            } catch (err) {
                console.error("Error fetching rooms:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, []);

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-white/10 transition"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-${categoryInfo.tone}-500/20 text-${categoryInfo.tone}-500`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {categoryInfo.label}
                        </h1>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
                    </div>
                ) : rooms.length === 0 ? (
                    <NeonCard className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                        <Icon className="w-16 h-16 text-gray-700 mb-4" />
                        <h3 className="text-xl font-bold text-gray-300 mb-2">No active rooms</h3>
                        <p className="text-gray-500 max-w-sm mb-6">
                            There are currently no live {categoryInfo.label} rooms. Check back later!
                        </p>
                        <NeonButton onClick={() => router.push('/home')}>
                            Explore Other Categories
                        </NeonButton>
                    </NeonCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map((room) => (
                            <button
                                key={room.id}
                                onClick={() => router.push(`/room/${room.id}`)}
                                className="group relative aspect-video rounded-2xl overflow-hidden border border-white/10 hover:border-pink-500/50 transition-all"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                <div className="absolute inset-0 bg-zinc-900" />
                                {room.cover_image && (
                                    <img src={room.cover_image} alt={room.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                )}

                                <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex flex-col items-start text-left">
                                    <h3 className="text-lg font-bold text-white mb-1">{room.title}</h3>
                                    <div className="text-sm text-gray-300 flex items-center gap-2">
                                        <span>@{room.host?.username || "Host"}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-500" />
                                        <span className="text-pink-400">{categoryInfo.label}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
