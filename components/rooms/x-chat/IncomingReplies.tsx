"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Inbox, X, Bell } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import { VoiceNotePlayer } from "@/components/common/VoiceNotePlayer";
import { motion, AnimatePresence } from "framer-motion";

interface XChatRequest {
    id: string;
    room_id: string;
    fan_id: string;
    fan_name: string;
    message: string;
    avatar_url?: string;
    status: "pending" | "accepted" | "declined";
    creator_reply?: string;
    updated_at: string;
}

const getToastDescription = (reply: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|\/api\/[^\s]+)/gi;
    const formatted = reply.replace(urlRegex, (url) => {
        const cleanUrl = url.trim();
        if (cleanUrl.match(/\.(webm|mp3|wav|m4a)(\?|$)/i)) return "🎤 [Voice Note]";
        if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/i)) return "🖼️ [Image]";
        if (cleanUrl.match(/\.(mp4|ogg)(\?|$)/i)) return "🎥 [Video]";
        return "📎 [Attachment]";
    });
    const joined = formatted.replace(/\s+/g, ' ').trim();
    return joined.substring(0, 50) + (joined.length > 50 ? "..." : "");
};

export default function IncomingReplies({ roomId, sessionId }: { roomId: string; sessionId?: string | null }) {
    const { user } = useAuth();
    const supabase = createClient();
    const [replies, setReplies] = useState<XChatRequest[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedReply, setSelectedReply] = useState<XChatRequest | null>(null);
    const [isMobileSize, setIsMobileSize] = useState(false);

    useEffect(() => {
        const checkSize = () => {
            setIsMobileSize(window.innerWidth < 640);
        };
        checkSize();
        window.addEventListener("resize", checkSize);
        return () => window.removeEventListener("resize", checkSize);
    }, []);
    const [lastOpenedAt, setLastOpenedAt] = useState<number>(() => {
        if (typeof window !== "undefined") {
            return parseInt(localStorage.getItem(`xchat_incoming_last_opened_${roomId}`) || "0");
        }
        return 0;
    });

    const unreadCount = React.useMemo(() => {
        if (isOpen) return 0;
        return replies.filter(r => new Date(r.updated_at).getTime() > lastOpenedAt).length;
    }, [replies, isOpen, lastOpenedAt]);

    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user || !roomId) return;

        // Reset for fresh session
        setReplies([]);

        const fetchInitial = async () => {
            let query = supabase
                .from("x_chat_requests")
                .select("*")
                .eq("room_id", roomId)
                .eq("fan_id", user.id)
                .eq("status", "accepted")
                .not("creator_reply", "is", null)
                .order("updated_at", { ascending: false });
            if (sessionId) query = query.eq("session_id", sessionId);

            const { data } = await query;
            if (data) setReplies(data);
        };

        fetchInitial();

        const channel = supabase
            .channel(`incoming-replies-${roomId}-${user.id}-${sessionId || 'all'}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "x_chat_requests",
                    filter: `fan_id=eq.${user.id}`,
                },
                (payload) => {
                    const updated = payload.new as XChatRequest;
                    // Only process if belongs to current session
                    if (sessionId && (updated as any).session_id !== sessionId) return;
                    if (updated.room_id === roomId && updated.status === "accepted" && updated.creator_reply) {
                        setReplies((prev) => {
                            if (prev.some(r => r.id === updated.id)) {
                                return prev.map(r => r.id === updated.id ? updated : r);
                            }
                            return [updated, ...prev];
                        });

                        toast.success("New reply from Creator!", {
                            description: getToastDescription(updated.creator_reply),
                            icon: <Bell className="text-gold" size={16} />,
                        });
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, roomId, sessionId]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
        setIsOpen(prev => {
            const next = !prev;
            if (next) {
                const now = Date.now();
                setLastOpenedAt(now);
                if (typeof window !== "undefined") {
                    localStorage.setItem(`xchat_incoming_last_opened_${roomId}`, now.toString());
                }
            }
            return next;
        });
    };

    const renderReplyContent = (content: string) =>
        content.split('\n').map((line, idx) => {
            const isLink = line.startsWith('http') || line.startsWith('/api/');
            if (isLink) {
                if (line.match(/\.(webm|mp3|wav|m4a)$/i)) return <VoiceNotePlayer key={idx} src={line} />;
                if (line.match(/\.(jpeg|jpg|gif|png|webp)$/i)) return <img key={idx} src={line} alt="reply media" className="max-w-full max-h-32 object-contain rounded mt-2 border border-white/10" />;
                if (line.match(/\.(mp4|ogg)$/i)) return <video key={idx} src={line} controls className="max-w-full max-h-32 object-contain rounded mt-2 border border-white/10" />;
                return <a key={idx} href={line} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 mt-1 block truncate text-xs">{line}</a>;
            }
            return <p key={idx} className="text-sm text-white/90 leading-relaxed mt-1">{line}</p>;
        });

    const renderModalReplyContent = (content: string) =>
        content.split('\n').map((line, idx) => {
            const isLink = line.startsWith('http') || line.startsWith('/api/');
            if (isLink) {
                if (line.match(/\.(webm|mp3|wav|m4a)$/i)) {
                    return (
                        <div key={idx} className="w-full flex justify-center py-4 bg-black/20 rounded-2xl border border-white/5 my-3">
                            <VoiceNotePlayer src={line} />
                        </div>
                    );
                }
                if (line.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
                    return (
                        <div key={idx} className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(255,215,0,0.15)] mt-4 bg-black/20 flex justify-center">
                            <img
                                src={line}
                                alt="reply media"
                                className="w-full max-h-[400px] object-contain rounded-2xl transition-all duration-500 group-hover:scale-[1.02]"
                            />
                        </div>
                    );
                }
                if (line.match(/\.(mp4|ogg)$/i)) {
                    return (
                        <div key={idx} className="relative rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_30px_rgba(255,215,0,0.15)] mt-4 bg-black flex justify-center">
                            <video
                                src={line}
                                controls
                                className="w-full max-h-[400px] object-contain rounded-2xl"
                            />
                        </div>
                    );
                }
                return (
                    <a
                        key={idx}
                        href={line}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-gold hover:text-gold/80 mt-2 block truncate text-sm transition-colors duration-200"
                    >
                        {line}
                    </a>
                );
            }
            return <p key={idx} className="text-base md:text-lg text-white/90 leading-relaxed font-light mt-2 whitespace-pre-wrap">{line}</p>;
        });

    return (
        <div className="relative">
            {/* Trigger button */}
            <button
                ref={buttonRef}
                onClick={toggleDropdown}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isOpen
                        ? "bg-gold/20 border-gold/50 text-gold shadow-[0_0_15px_rgba(255,215,0,0.2)] border"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white border"
                }`}
            >
                <Inbox size={18} className={unreadCount > 0 ? "animate-bounce" : ""} />
                <span>Incoming</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#1a1a2e]">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/*
             * Portal: render the dropdown at document.body level.
             * This escapes the overflow:hidden on xchat-shell / xchat-page
             * so the popup always appears in front of everything.
             */}
            {typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        isMobileSize ? (
                            <div 
                                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                                onClick={(e) => {
                                    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                                        setIsOpen(false);
                                    }
                                }}
                            >
                                <motion.div
                                    ref={dropdownRef}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                    transition={{ duration: 0.18 }}
                                    style={{
                                        width: "100%",
                                        maxWidth: "360px",
                                        maxHeight: "80vh",
                                    }}
                                    className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a2e]/97 backdrop-blur-xl shadow-2xl flex flex-col"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-white/5 flex-shrink-0">
                                        <h3 className="text-sm font-bold text-gold">Incoming Replies</h3>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="text-white/40 hover:text-white transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* List */}
                                    <div className="overflow-y-auto p-3 space-y-2 scrollbar-thin flex-1 min-h-0">
                                        {replies.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                                    <Inbox size={20} className="text-white/20" />
                                                </div>
                                                <p className="text-sm text-white/40 italic">
                                                    No replies yet. Send a request to the creator!
                                                </p>
                                            </div>
                                        ) : (
                                            replies.map((r) => (
                                                <div
                                                    key={r.id}
                                                    onClick={() => {
                                                        setSelectedReply(r);
                                                        setIsOpen(false);
                                                    }}
                                                    className="group p-3 rounded-xl bg-white/5 border border-white/5 hover:border-gold/30 hover:bg-gold/5 active:scale-[0.98] cursor-pointer transition-all duration-300"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold/60">
                                                            Reply to: {r.message}
                                                        </span>
                                                        <span className="text-[9px] text-white/30">
                                                            {new Date(r.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                    </div>
                                                    <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
                                                        {r.creator_reply && renderReplyContent(r.creator_reply)}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        ) : (
                            <motion.div
                                ref={dropdownRef}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.18 }}
                                style={{
                                    position: "fixed",
                                    top: dropdownPos.top,
                                    right: dropdownPos.right,
                                    zIndex: 99999,
                                    width: "320px",
                                    maxHeight: "450px",
                                }}
                                className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a2e]/97 backdrop-blur-xl shadow-2xl flex flex-col"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-white/5 flex-shrink-0">
                                    <h3 className="text-sm font-bold text-gold">Incoming Replies</h3>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-white/40 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* List */}
                                <div className="overflow-y-auto max-h-[380px] p-2 space-y-2 scrollbar-thin flex-1 min-h-0">
                                    {replies.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                                <Inbox size={20} className="text-white/20" />
                                            </div>
                                            <p className="text-sm text-white/40 italic">
                                                No replies yet. Send a request to the creator!
                                            </p>
                                        </div>
                                    ) : (
                                        replies.map((r) => (
                                            <div
                                                key={r.id}
                                                onClick={() => {
                                                    setSelectedReply(r);
                                                    setIsOpen(false);
                                                }}
                                                className="group p-3 rounded-xl bg-white/5 border border-white/5 hover:border-gold/30 hover:bg-gold/5 active:scale-[0.98] cursor-pointer transition-all duration-300"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold/60">
                                                        Reply to: {r.message}
                                                    </span>
                                                    <span className="text-[9px] text-white/30">
                                                        {new Date(r.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                                <div className="bg-black/20 rounded-lg p-2.5 border border-white/5">
                                                    {r.creator_reply && renderReplyContent(r.creator_reply)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Premium Glassmorphic Detailed Modal */}
            {typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {selectedReply && (
                        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                                className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-b from-[#1a1a2e] to-[#0c0c16] shadow-[0_0_50px_rgba(255,215,0,0.15)] flex flex-col max-h-[90vh]"
                            >
                                {/* Decorative top glowing line */}
                                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-gold to-transparent" />

                                {/* Modal Header */}
                                <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">💛</span>
                                        <h3 className="text-lg font-black tracking-wider text-gold uppercase" style={{ textShadow: "0 0 10px rgba(255,215,0,0.3)" }}>
                                            Reply from Creator
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedReply(null)}
                                        className="rounded-full w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/15 border border-white/10 hover:border-gold/40 text-white/60 hover:text-white transition-all duration-300"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Modal Scrollable Body */}
                                <div className="overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
                                    {/* Original Request Info Box */}
                                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4 flex flex-col gap-1.5 bg-gradient-to-r from-white/5 to-transparent">
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gold/60">
                                            Original Request
                                        </span>
                                        <p className="text-sm md:text-base text-white/70 italic font-light">
                                            "{selectedReply.message}"
                                        </p>
                                        <span className="text-[9px] text-white/30 self-end mt-1">
                                            {new Date(selectedReply.updated_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                        </span>
                                    </div>

                                    {/* Main Creator Reply Area */}
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gold">
                                            Creator Response
                                        </span>
                                        <div className="bg-black/40 rounded-2xl p-6 border border-gold/10 backdrop-blur-md shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)]">
                                            {selectedReply.creator_reply && renderModalReplyContent(selectedReply.creator_reply)}
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="flex items-center justify-end border-t border-white/5 px-6 py-4 bg-white/5">
                                    <button
                                        onClick={() => setSelectedReply(null)}
                                        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#E3A813] text-black font-bold tracking-widest uppercase hover:brightness-110 active:scale-95 transition-all text-xs shadow-[0_4px_20px_rgba(255,215,0,0.25)]"
                                    >
                                        Close Reply
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
