"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Edit3, Settings } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import LiveDropBoard from "@/components/rooms/flashdrop-creator/LiveDropBoard";

// Re-using the same CSS to maintain the thematic feel
import "../flashdrop-creator.css";
import ProtectRoute from "@/components/common/ProtectRoute";

export default function FlashDropSetupPage() {
    const { user } = useAuth();
    const [roomId, setRoomId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        const supabase = createClient();
        async function findRoom() {
            const { data: rooms } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .eq("type", "flash-drop")
                .order("created_at", { ascending: true })
                .limit(1);

            if (rooms && rooms.length > 0) {
                setRoomId(rooms[0].id);
            }
        }
        findRoom();
    }, [user]);

    return (
        <ProtectRoute allowedRoles={["creator"]}>
            <div
                className="flashdrop-creator-theme min-h-screen bg-background bg-cover bg-center bg-no-repeat relative flex flex-col"
                style={{ backgroundImage: "url('/images/bg-flashdrop.jpeg')" }}
            >
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

                <div className="relative z-10 px-6 py-6 flex flex-col w-full max-w-5xl mx-auto h-screen overflow-hidden gap-6">
                    {/* Top Bar */}
                    <div className="flex items-center shrink-0 relative justify-between">
                        <Link
                            href="/rooms/flash-drop-creator"
                            className="glass-card rounded-lg px-4 py-2 hover:bg-primary/20 transition-colors flex items-center gap-2 cursor-pointer z-50 text-primary border border-primary/30"
                        >
                            <ArrowLeft size={18} />
                            <span className="text-sm font-bold">Back to Dashboard</span>
                        </Link>
                        
                        <div className="flex flex-col items-end text-right">
                            <h1 className="font-display text-2xl md:text-3xl font-black neon-text flex items-center gap-2">
                                <Settings className="text-primary animate-spin-slow" size={24} />
                                Flash Drop Setup
                            </h1>
                            <p className="text-sm text-primary/70 font-semibold uppercase tracking-widest mt-1">
                                Pre-load your packages offline
                            </p>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="glass-panel rounded-xl overflow-hidden shadow-2xl shadow-primary/10 border border-primary/20 flex flex-col h-full p-4 relative">
                            {/* Instruction Header */}
                            <div className="flex items-center gap-3 mb-6 shrink-0 bg-white/5 p-4 rounded-xl border border-white/10">
                                <div className="p-3 bg-primary/20 rounded-full text-primary">
                                    <Edit3 size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-wide">Drop Configurator</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Attach videos, pictures, or text to your Drops here. Anything you configure will be immediately available and ready to fire on the Live Board once you start your broadcasting session.
                                    </p>
                                </div>
                            </div>
                            
                            {/* Board wrapper */}
                            <div className="flex-1 relative flex flex-col min-h-0 border border-primary/20 rounded-2xl overflow-hidden bg-black/40">
                                {roomId ? (
                                    <LiveDropBoard roomId={roomId} />
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-primary/60 font-semibold animate-pulse">
                                        Initializing Setup Workspace...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
}
