"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft, Plus, Play, Video, Loader2, Calendar, StopCircle,
    Clock, Wine
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import LoungeChat from "@/components/rooms/bar-lounge-creator/LoungeChat";
import VideoStage from "@/components/rooms/bar-lounge-creator/VideoStage";
import IncomingRequests from "@/components/rooms/bar-lounge-creator/IncomingRequests";
import SummaryPanel from "@/components/rooms/bar-lounge-creator/SummaryPanel";
import WalletPill from "@/components/common/WalletPill";

type Room = {
    id: string;
    title: string | null;
    status: string;
    created_at: string;
};

const CreatorBarLounge = () => {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    const [viewState, setViewState] = useState<"loading" | "sessions" | "live">("loading");
    const [rooms, setRooms] = useState<Room[]>([]);
    const [roomId, setRoomId] = useState<string | undefined>(undefined);

    // New session form
    const [showNewSession, setShowNewSession] = useState(false);
    const [sessionTitle, setSessionTitle] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Load all sessions
    useEffect(() => {
        if (authLoading || !user) return;

        async function fetchSessions() {
            const { data: roomList } = await supabase
                .from("rooms")
                .select("id, title, status, created_at")
                .eq("host_id", user!.id)
                .eq("type", "bar-lounge")
                .order("created_at", { ascending: false });

            if (roomList) setRooms(roomList);
            setViewState("sessions");
        }
        fetchSessions();
    }, [user, authLoading]);

    const liveSessions = rooms.filter(r => r.status === "live");
    const pastSessions = rooms.filter(r => r.status !== "live");

    const handleStartSession = async () => {
        if (!sessionTitle.trim() || !user) return;
        setIsCreating(true);

        // End any stale live sessions
        if (liveSessions.length > 0) {
            await supabase
                .from("rooms")
                .update({ status: "ended" })
                .eq("host_id", user.id)
                .eq("type", "bar-lounge")
                .eq("status", "live");
        }

        const { data: newRoom, error } = await supabase
            .from("rooms")
            .insert({
                host_id: user.id,
                type: "bar-lounge",
                status: "live",
                title: sessionTitle.trim(),
            })
            .select()
            .single();

        if (newRoom) {
            setRooms(prev => [newRoom, ...prev.map(r => r.status === "live" ? { ...r, status: "ended" } : r)]);
            setRoomId(newRoom.id);
            setViewState("live");
            setShowNewSession(false);
            setSessionTitle("");
        } else {
            console.error("Failed to create session:", error);
        }
        setIsCreating(false);
    };

    const handleResumeSession = (room: Room) => {
        setRoomId(room.id);
        setViewState("live");
    };

    const handleEndSession = async () => {
        if (!roomId || !confirm("End this session?")) return;

        await supabase.from("rooms").update({ status: "ended" }).eq("id", roomId);
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: "ended" } : r));
        setRoomId(undefined);
        setViewState("sessions");
    };

    const handleEndSpecificRoom = async (id: string) => {
        await supabase.from("rooms").update({ status: "ended" }).eq("id", id);
        setRooms(prev => prev.map(r => r.id === id ? { ...r, status: "ended" } : r));
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
            " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    // --- Loading ---
    if (viewState === "loading" || authLoading) {
        return (
            <div
                className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex items-center justify-center fd-bar-lounge-creator-theme"
                style={{ backgroundImage: "url('/rooms/bar-lounge/lounge-bg-creator.jpeg')" }}
            >
                <div className="absolute inset-0 bg-black/70" />
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin relative z-10" />
            </div>
        );
    }

    // --- Sessions View ---
    if (viewState === "sessions") {
        return (
            <div
                className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative fd-bar-lounge-creator-theme"
                style={{ backgroundImage: "url('/rooms/bar-lounge/lounge-bg-creator.jpeg')" }}
            >
                <div className="absolute inset-0 bg-black/75" />

                <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push("/home")}
                                className="glass-panel gold-border px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-colors"
                                style={{ color: "hsl(45, 90%, 55%)" }}
                            >
                                <ChevronLeft className="w-[18px] h-[18px]" />
                                <span className="text-sm font-medium">Back</span>
                            </button>
                            <div>
                                <h1
                                    className="text-3xl font-bold"
                                    style={{ fontFamily: "'Pacifico', cursive", color: "hsl(45, 90%, 55%)", textShadow: "0 0 20px hsla(45, 90%, 55%, 0.4)" }}
                                >
                                    Bar Lounge
                                </h1>
                                <p className="text-sm mt-1" style={{ color: "hsl(280, 15%, 60%)" }}>
                                    Manage your live bar sessions
                                </p>
                            </div>
                        </div>
                        <WalletPill />
                    </div>

                    {/* Start New Session Card */}
                    {!showNewSession ? (
                        <button
                            onClick={() => setShowNewSession(true)}
                            className="w-full group relative overflow-hidden rounded-2xl p-8 flex items-center gap-6 transition-all mb-8"
                            style={{
                                background: "hsla(270, 40%, 12%, 0.6)",
                                border: "2px dashed hsla(45, 90%, 55%, 0.3)",
                            }}
                        >
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                                style={{ background: "hsla(45, 90%, 55%, 0.1)", border: "1px solid hsla(45, 90%, 55%, 0.2)" }}
                            >
                                <Plus className="w-8 h-8" style={{ color: "hsl(45, 90%, 55%)" }} />
                            </div>
                            <div className="text-left">
                                <div className="text-xl font-bold text-white">Start New Session</div>
                                <div className="text-sm mt-1" style={{ color: "hsl(280, 15%, 60%)" }}>
                                    Create a new Bar Lounge session and go live
                                </div>
                            </div>
                        </button>
                    ) : (
                        <div
                            className="w-full rounded-2xl p-6 mb-8"
                            style={{
                                background: "hsla(270, 40%, 12%, 0.8)",
                                border: "1px solid hsla(45, 90%, 55%, 0.3)",
                                boxShadow: "0 0 30px hsla(45, 90%, 55%, 0.1)",
                            }}
                        >
                            <div className="flex items-center gap-3 mb-5">
                                <Video className="w-5 h-5" style={{ color: "hsl(45, 90%, 55%)" }} />
                                <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                                    New Session
                                </h2>
                            </div>

                            <input
                                autoFocus
                                value={sessionTitle}
                                onChange={(e) => setSessionTitle(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleStartSession()}
                                placeholder="e.g. Friday Night Hangout 🍸"
                                className="w-full rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none mb-4 text-sm"
                                style={{
                                    background: "hsla(270, 30%, 18%, 0.5)",
                                    border: "1px solid hsla(280, 40%, 35%, 0.4)",
                                }}
                            />

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { setShowNewSession(false); setSessionTitle(""); }}
                                    className="flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5"
                                    style={{ border: "1px solid hsla(280, 40%, 35%, 0.4)", color: "hsl(280, 15%, 60%)" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartSession}
                                    disabled={!sessionTitle.trim() || isCreating}
                                    className="flex-1 rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    style={{
                                        background: "linear-gradient(135deg, hsl(45, 70%, 40%), hsl(45, 90%, 55%), hsl(45, 90%, 65%))",
                                        color: "hsl(270, 50%, 8%)",
                                    }}
                                >
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                    Start Session
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Active / Live Sessions */}
                    {liveSessions.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "hsl(45, 90%, 55%)" }}>
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Live Now
                            </h2>
                            <div className="space-y-3">
                                {liveSessions.map(room => (
                                    <div
                                        key={room.id}
                                        className="rounded-2xl p-5 flex items-center justify-between transition-all"
                                        style={{
                                            background: "hsla(270, 40%, 12%, 0.6)",
                                            border: "1px solid hsla(150, 80%, 45%, 0.3)",
                                            boxShadow: "0 0 20px hsla(150, 80%, 45%, 0.08)",
                                        }}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-green-400 text-xs font-medium uppercase tracking-wide">Live</span>
                                            </div>
                                            <div className="text-lg font-semibold text-white truncate" style={{ fontFamily: "'Playfair Display', serif" }}>
                                                {room.title || "Untitled Session"}
                                            </div>
                                            <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "hsl(280, 15%, 60%)" }}>
                                                <Clock className="w-3 h-3" />
                                                Started {formatDate(room.created_at)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4 shrink-0">
                                            <button
                                                onClick={() => handleEndSpecificRoom(room.id)}
                                                className="rounded-xl px-4 py-2.5 text-xs font-medium transition-colors hover:bg-red-900/30"
                                                style={{ border: "1px solid hsla(320, 80%, 60%, 0.4)", color: "hsl(320, 80%, 60%)" }}
                                            >
                                                End
                                            </button>
                                            <button
                                                onClick={() => handleResumeSession(room)}
                                                className="rounded-xl px-5 py-2.5 text-sm font-bold flex items-center gap-2 transition-all hover:brightness-110"
                                                style={{
                                                    background: "linear-gradient(135deg, hsl(150, 60%, 30%), hsl(150, 70%, 40%))",
                                                    color: "white",
                                                    boxShadow: "0 0 15px hsla(150, 80%, 45%, 0.3)",
                                                }}
                                            >
                                                <Play className="w-4 h-4" /> Resume
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past Sessions */}
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "hsl(280, 15%, 60%)" }}>
                            <Calendar className="w-4 h-4" />
                            Session History
                        </h2>
                        {pastSessions.length === 0 ? (
                            <div
                                className="rounded-2xl p-10 text-center"
                                style={{ background: "hsla(270, 40%, 12%, 0.4)", border: "1px solid hsla(280, 40%, 25%, 0.3)" }}
                            >
                                <Wine className="w-10 h-10 mx-auto mb-3" style={{ color: "hsl(280, 15%, 40%)" }} />
                                <p className="text-sm" style={{ color: "hsl(280, 15%, 50%)" }}>No past sessions yet. Start your first one above!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {pastSessions.map(room => (
                                    <div
                                        key={room.id}
                                        className="rounded-xl p-4 flex items-center justify-between transition-colors hover:bg-white/5"
                                        style={{
                                            background: "hsla(270, 40%, 12%, 0.3)",
                                            border: "1px solid hsla(280, 40%, 25%, 0.25)",
                                        }}
                                    >
                                        <div className="min-w-0">
                                            <div className="font-medium text-white/80 truncate text-sm">{room.title || "Untitled Session"}</div>
                                            <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: "hsl(280, 15%, 50%)" }}>
                                                <Clock className="w-3 h-3" />
                                                {formatDate(room.created_at)}
                                            </div>
                                        </div>
                                        <span
                                            className="text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-wider shrink-0"
                                            style={{ background: "hsla(280, 40%, 25%, 0.3)", color: "hsl(280, 15%, 55%)" }}
                                        >
                                            Ended
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- Live View ---
    return (
        <div
            className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col fd-bar-lounge-creator-theme"
            style={{ backgroundImage: "url('/rooms/bar-lounge/lounge-bg-creator.jpeg')" }}
        >
            {/* Top Bar */}
            <div className="relative z-20 flex items-center justify-center px-4 py-3 glass-panel rounded-none border-x-0 border-t-0">
                <button
                    onClick={handleEndSession}
                    className="absolute left-4 glass-panel px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-900/20 transition-colors"
                    style={{ borderColor: "hsla(320, 80%, 60%, 0.4)", color: "hsl(320, 80%, 60%)" }}
                >
                    <StopCircle className="w-[18px] h-[18px]" />
                    <span className="text-sm font-medium">End Session</span>
                </button>
                <div className="text-center">
                    <h1 className="text-2xl gold-text" style={{ fontFamily: "'Pacifico', cursive" }}>Bar Lounge</h1>
                    <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "hsl(280, 15%, 55%)" }}>
                        {rooms.find(r => r.id === roomId)?.title || "Live Session"}
                    </p>
                </div>
                <div className="absolute right-4">
                    <WalletPill />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[350px_650px_350px] p-4 max-w-[1600px] mx-auto">
                {/* Left - Chat */}
                <div className="h-full hidden lg:flex">
                    <LoungeChat roomId={roomId} />
                </div>

                {/* Center - Video */}
                <div className="h-full flex items-center justify-center w-full">
                    <div className="w-full h-full">
                        <VideoStage roomId={roomId} />
                    </div>
                </div>

                {/* Right - Requests & Summary */}
                <div className="hidden lg:flex flex-col gap-4 h-full">
                    <div className="flex-1">
                        <IncomingRequests roomId={roomId} />
                    </div>
                    <SummaryPanel roomId={roomId} />
                </div>
            </div>
        </div>
    );
};

export default CreatorBarLounge;
