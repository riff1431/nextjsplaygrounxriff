"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { LogOut, User, Video, MessageCircle, Heart, Share2, Crown } from "lucide-react";
import { toast } from "sonner";

type RoomClientProps = {
    roomId: string;
    initialRoomData?: any;
};

// Helper for consistent neon styling
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function RoomClient({ roomId, initialRoomData }: RoomClientProps) {
    const router = useRouter();
    const supabase = createClient();
    const [room, setRoom] = useState<any>(initialRoomData || null);
    const [loading, setLoading] = useState(!initialRoomData);
    const [error, setError] = useState<string | null>(null);
    const [joined, setJoined] = useState(false);
    const [viewerCount, setViewerCount] = useState(0);
    const [isHost, setIsHost] = useState(false);
    const joinedRef = useRef(false); // To prevent double-join on strict mode

    // 1. Fetch room details
    useEffect(() => {
        const fetchRoomAndUser = async () => {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();

                // Fetch room with host details
                const { data: roomData, error: roomError } = await supabase
                    .from("rooms")
                    .select("*, host:profiles(id, username, avatar_url)")
                    .eq("id", roomId)
                    .single();

                if (roomError) throw roomError;

                setRoom(roomData);

                // Check if current user is host
                if (user && roomData.host?.id === user.id) {
                    setIsHost(true);
                }

                // Initial viewer count fetch
                const { count, error: countError } = await supabase
                    .from("room_participants")
                    .select("*", { count: 'exact', head: true })
                    .eq("room_id", roomId);

                if (!countError) {
                    setViewerCount(count || 0);
                }

            } catch (err: any) {
                console.error("Error fetching room:", err);
                setError("Room not found or offline.");
                toast.error("Could not load room details");
            } finally {
                setLoading(false);
            }
        };

        if (!room) fetchRoomAndUser();
    }, [roomId, room, supabase]);

    // 2. Real-time Viewer Count Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`room_participants:${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'room_participants',
                filter: `room_id=eq.${roomId}`
            }, async () => {
                // Determine count efficiently (or just re-fetch count)
                const { count } = await supabase
                    .from("room_participants")
                    .select("*", { count: 'exact', head: true })
                    .eq("room_id", roomId);
                if (count !== null) setViewerCount(count);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, supabase]);


    // 3. Join / Leave Logic
    useEffect(() => {
        const handleJoin = async () => {
            if (joinedRef.current) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            try {
                const { error } = await supabase
                    .from("room_participants")
                    .insert({ room_id: roomId, user_id: user.id });

                if (error && error.code !== '23505') { // Ignore duplicate key
                    console.error("Error joining:", error);
                } else {
                    joinedRef.current = true;
                    setJoined(true);
                    toast.success("Joined room successfully");
                }
            } catch (err) {
                console.error("Join exception:", err);
            }
        };

        if (roomId) handleJoin();

        // Cleanup: Leave room on unmount
        const handleUnmountLeave = async () => {
            if (!joinedRef.current) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from("room_participants")
                .delete()
                .match({ room_id: roomId, user_id: user.id });
        };

        return () => {
            handleUnmountLeave();
        };
    }, [roomId, supabase]);

    const handleLeaveBtn = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (isHost && user) {
            // End the room
            await supabase
                .from("rooms")
                .update({ status: "offline" })
                .eq("id", roomId);
            toast.success("Room ended");
        } else if (user) {
            // Just leave
            await supabase
                .from("room_participants")
                .delete()
                .match({ room_id: roomId, user_id: user.id });
            toast.info("Left the room");
        }

        router.push("/home");
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-black text-pink-500">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-lg font-medium neon-text">Entering Vibe...</div>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white p-10">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-red-500 mb-2">Unavailable</h2>
                <p className="text-gray-400">{error}</p>
                <button
                    onClick={() => router.push("/home")}
                    className="mt-6 px-6 py-2 rounded-full border border-pink-500/50 text-pink-300 hover:bg-pink-500/10 transition"
                >
                    Return to Lobby
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col md:flex-row">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pink-600/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
            </div>

            {/* Main Content (Stage) */}
            <div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-6 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="h-10 w-10 rounded-full p-[2px] bg-gradient-to-br from-pink-500 to-purple-600">
                                <img
                                    src={room?.host?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"}
                                    alt="Host"
                                    className="h-full w-full rounded-full object-cover bg-black"
                                />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-pink-500 text-[9px] px-1.5 py-0.5 rounded-full text-white font-bold border border-black">
                                LIVE
                            </div>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white drop-shadow-md leading-tight">
                                {room?.title || "Untitled Room"}
                            </h1>
                            <div className="flex items-center gap-2 text-xs text-gray-300">
                                <span className="text-pink-400 font-medium">@{room?.host?.username || "Unknown"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                            <User className="w-3.5 h-3.5 text-pink-400" />
                            <span className="text-xs font-medium text-pink-100">{viewerCount}</span>
                        </div>
                        <button
                            onClick={handleLeaveBtn}
                            className={`p-2 rounded-full transition backdrop-blur-md border border-white/5 ${isHost ? "bg-red-500/20 hover:bg-red-500/40 border-red-500/30" : "bg-white/10 hover:bg-white/20"
                                }`}
                            title={isHost ? "End Room" : "Leave Room"}
                        >
                            {isHost ? (
                                <div className="w-5 h-5 flex items-center justify-center">
                                    <div className="w-3 h-3 bg-red-500 rounded-sm" />
                                </div>
                            ) : (
                                <LogOut className="w-5 h-5 text-gray-200" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Stage / Video Area */}
                <div className="flex-1 bg-black/60 relative flex items-center justify-center group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none z-10" />

                    {/* Placeholder Video Feedback */}
                    <div className="text-center z-0 opacity-40 group-hover:opacity-60 transition duration-500">
                        <div className="h-24 w-24 mx-auto mb-6 rounded-full border border-pink-500/30 flex items-center justify-center bg-pink-500/5 shadow-[0_0_50px_rgba(236,72,153,0.15)]">
                            <Video className="w-10 h-10 text-pink-400/70" />
                        </div>
                        <p className="text-pink-200/50 font-light tracking-wide text-sm uppercase">Stream Feed Connecting...</p>
                    </div>

                    {joined && (
                        <div className="absolute bottom-32 left-0 right-0 flex justify-center z-20 pointer-events-none">
                            <div className="px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in-up">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                You joined the room
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Bottom Bar (Chat Input placeholder) */}
                <div className="p-4 bg-black border-t border-white/10 md:hidden z-20">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Send a message..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50 transition placeholder:text-gray-600"
                        />
                        <button className="p-3 rounded-full bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar (Chat & Interactions) - Desktop Only */}
            <div className="hidden md:flex flex-col w-[380px] bg-black/80 border-l border-white/10 backdrop-blur-xl z-20 h-screen">
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between shadow-sm bg-black/20">
                    <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-pink-400" />
                        Live Chat
                    </h3>
                    <button className="text-[10px] px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-white transition">
                        Hide
                    </button>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-pink-900/20 scrollbar-track-transparent">
                    {/* Welcome Message */}
                    <div className="flex items-start gap-3 opacity-70">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[1px] shrink-0">
                            <div className="h-full w-full rounded-full bg-black/90 flex items-center justify-center">
                                <Crown className="w-4 h-4 text-yellow-500" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">System</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
                                Welcome to the room! Follow the vibe rules and have fun.
                            </p>
                        </div>
                    </div>

                    {/* Mock Chat Items (since we don't have real chat yet) */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold text-gray-300">User_{Math.floor(Math.random() * 9000)}</span>
                                    {i % 2 === 0 && <span className="text-[9px] px-1 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">VIP</span>}
                                </div>
                                <p className="text-sm text-gray-200 leading-relaxed mt-0.5 shadow-black drop-shadow-md">
                                    {i === 1 ? "This setup looks sick! 🔥" : i === 2 ? "Let's goooo!" : "Can you play that new track?"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-white/10 bg-black/40">
                    <div className="flex items-center gap-2 mb-3">
                        <button className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-pink-600/10 hover:border-pink-500/30 transition flex items-center justify-center gap-2 text-xs font-medium text-gray-300">
                            <Heart className="w-4 h-4 text-pink-500" /> Send Luv
                        </button>
                        <button className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-yellow-600/10 hover:border-yellow-500/30 transition flex items-center justify-center gap-2 text-xs font-medium text-gray-300">
                            <Share2 className="w-4 h-4 text-yellow-500" /> Share
                        </button>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className="w-full bg-black border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/20 transition placeholder:text-gray-600"
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-pink-600 text-white hover:bg-pink-500 transition shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                            <Share2 className="w-4 h-4 rotate-90" />
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
                .animate-fade-in { animation: fadeInUp 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}
