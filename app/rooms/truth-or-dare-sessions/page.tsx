"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Play,
    Users,
    Lock,
    Globe,
    DollarSign,
    Clock,
    ArrowLeft,
    Zap,
    Loader2,
    CheckCircle2,
    XCircle,
    Send,
} from "lucide-react";
import { toast } from "sonner";

interface Session {
    id: string;
    title: string;
    description: string | null;
    session_type: string;
    is_private: boolean;
    price: number;
    status: string;
    started_at: string;
    creator_id: string;
    room_id: string;
    creator?: {
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
    };
    participant_count: number;
    user_request_status: string | null;
    user_joined: boolean;
}

export default function TruthOrDareSessionsBrowse() {
    const router = useRouter();
    const supabase = createClient();

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [joiningSessionId, setJoiningSessionId] = useState<string | null>(null);

    useEffect(() => {
        async function getUser() {
            const { data: { user: u } } = await supabase.auth.getUser();
            setUser(u);
        }
        getUser();
    }, []);

    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/v1/rooms/truth-dare-sessions/browse");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSessions(data.sessions || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Realtime updates for sessions
    useEffect(() => {
        const channel = supabase
            .channel("browse_sessions")
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "truth_dare_sessions",
            }, () => {
                fetchSessions();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchSessions]);

    async function handleJoin(session: Session) {
        if (!user) {
            toast.error("Please sign in to join a session.");
            router.push("/login");
            return;
        }

        if (session.user_joined) {
            // Already joined — go directly to the room
            router.push(`/rooms/truth-or-dare?roomId=${session.room_id}`);
            return;
        }

        setJoiningSessionId(session.id);
        try {
            const res = await fetch(`/api/v1/rooms/truth-dare-sessions/${session.id}/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.already_joined) {
                    router.push(`/rooms/truth-or-dare?roomId=${session.room_id}`);
                    return;
                }
                throw new Error(data.error);
            }

            if (data.status === "pending") {
                toast.success("Join request sent! Waiting for creator approval.");
                // Update local state
                setSessions(prev => prev.map(s =>
                    s.id === session.id ? { ...s, user_request_status: "pending" } : s
                ));
            } else if (data.status === "joined") {
                toast.success(data.message || "Joined successfully!");
                router.push(`/rooms/truth-or-dare?roomId=${session.room_id}`);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to join session.");
        } finally {
            setJoiningSessionId(null);
        }
    }

    function getStatusBadge(session: Session) {
        if (session.user_joined) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase">
                    <CheckCircle2 className="w-3 h-3" /> Joined
                </span>
            );
        }
        if (session.user_request_status === "pending") {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                    <Clock className="w-3 h-3" /> Pending
                </span>
            );
        }
        if (session.user_request_status === "rejected") {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase">
                    <XCircle className="w-3 h-3" /> Declined
                </span>
            );
        }
        return null;
    }

    function getActionButton(session: Session) {
        if (session.user_joined) {
            return (
                <button
                    onClick={() => handleJoin(session)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg transition flex items-center justify-center gap-2"
                >
                    <Play className="w-4 h-4 fill-current" /> Enter Session
                </button>
            );
        }

        if (session.user_request_status === "pending") {
            return (
                <button
                    disabled
                    className="w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Clock className="w-4 h-4" /> Awaiting Approval
                </button>
            );
        }

        if (session.user_request_status === "rejected") {
            return (
                <button
                    disabled
                    className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <XCircle className="w-4 h-4" /> Request Declined
                </button>
            );
        }

        const isPrivate = session.is_private;
        const price = Number(session.price) || 0;

        return (
            <button
                onClick={() => handleJoin(session)}
                disabled={joiningSessionId === session.id}
                className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50
                    ${isPrivate
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                        : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
                    }`}
            >
                {joiningSessionId === session.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : isPrivate ? (
                    <><Send className="w-4 h-4" /> Request to Join</>
                ) : price > 0 ? (
                    <><DollarSign className="w-4 h-4" /> Join — ${price}</>
                ) : (
                    <><Play className="w-4 h-4 fill-current" /> Join Free</>
                )}
            </button>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Truth & Dare Sessions</h1>
                        <p className="text-xs text-gray-500">Browse and join live sessions</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-6 sm:p-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        <p className="text-gray-500 text-sm">Loading sessions...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-24">
                        <p className="text-red-400 mb-2">Failed to load sessions</p>
                        <p className="text-gray-500 text-sm">{error}</p>
                        <button onClick={fetchSessions} className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20">
                            Try Again
                        </button>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-24">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                            <Zap className="w-10 h-10 text-gray-600" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">No Live Sessions</h2>
                        <p className="text-gray-500 text-sm">There are no active Truth or Dare sessions right now. Check back soon!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className="rounded-2xl border border-white/10 bg-gray-950 overflow-hidden hover:border-white/20 transition group"
                            >
                                {/* Card Header */}
                                <div className="p-5 pb-3">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${session.is_private
                                                ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                                                : "bg-green-500/10 border border-green-500/20 text-green-400"
                                            }`}>
                                            {session.is_private ? (
                                                <><Lock className="w-3 h-3" /> Private</>
                                            ) : (
                                                <><Globe className="w-3 h-3" /> Public</>
                                            )}
                                        </span>
                                        {getStatusBadge(session)}
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-green-400 transition">
                                        {session.title}
                                    </h3>
                                    {session.description && (
                                        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{session.description}</p>
                                    )}
                                </div>

                                {/* Creator Info */}
                                <div className="px-5 pb-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden border border-white/10">
                                        {session.creator?.avatar_url ? (
                                            <img src={session.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-white text-xs font-bold">
                                                {(session.creator?.full_name || session.creator?.username || "?")[0]?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">
                                            {session.creator?.full_name || session.creator?.username || "Creator"}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Bar */}
                                <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5" />
                                        {session.participant_count} joined
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        {Number(session.price) > 0 ? `$${session.price}` : "Free"}
                                    </span>
                                    <span className="flex items-center gap-1 text-green-400">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        LIVE
                                    </span>
                                </div>

                                {/* Action Button */}
                                <div className="px-5 pb-5 pt-2">
                                    {getActionButton(session)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
