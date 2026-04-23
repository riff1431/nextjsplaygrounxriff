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

export default function IncomingReplies({ roomId }: { roomId: string }) {
    const { user } = useAuth();
    const supabase = createClient();
    const [replies, setReplies] = useState<XChatRequest[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user || !roomId) return;

        const fetchInitial = async () => {
            const { data } = await supabase
                .from("x_chat_requests")
                .select("*")
                .eq("room_id", roomId)
                .eq("fan_id", user.id)
                .eq("status", "accepted")
                .not("creator_reply", "is", null)
                .order("updated_at", { ascending: false });

            if (data) setReplies(data);
        };

        fetchInitial();

        const channel = supabase
            .channel(`incoming-replies-${roomId}-${user.id}`)
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
                    if (updated.room_id === roomId && updated.status === "accepted" && updated.creator_reply) {
                        setReplies((prev) => {
                            if (prev.some(r => r.id === updated.id)) {
                                return prev.map(r => r.id === updated.id ? updated : r);
                            }
                            return [updated, ...prev];
                        });

                        if (!isOpen) {
                            setUnreadCount((prev) => prev + 1);
                        }

                        toast.success("New reply from Creator!", {
                            description: updated.creator_reply.substring(0, 50) + (updated.creator_reply.length > 50 ? "..." : ""),
                            icon: <Bell className="text-gold" size={16} />,
                        });
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user, roomId, isOpen]);

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
        setIsOpen(prev => !prev);
        if (!isOpen) setUnreadCount(0);
    };

    const renderReplyContent = (content: string) =>
        content.split('\n').map((line, idx) => {
            const isLink = line.startsWith('http') || line.startsWith('/api/');
            if (isLink) {
                if (line.match(/\.(webm|mp3|wav|m4a)$/i)) return <VoiceNotePlayer key={idx} src={line} />;
                if (line.match(/\.(jpeg|jpg|gif|png)$/i)) return <img key={idx} src={line} alt="reply media" className="max-h-32 rounded mt-2 border border-white/10" />;
                if (line.match(/\.(mp4|ogg)$/i)) return <video key={idx} src={line} controls className="max-h-32 rounded mt-2 border border-white/10" />;
                return <a key={idx} href={line} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 mt-1 block truncate text-xs">{line}</a>;
            }
            return <p key={idx} className="text-sm text-white/90 leading-relaxed mt-1">{line}</p>;
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
                            className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a2e]/97 backdrop-blur-xl shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 bg-white/5">
                                <h3 className="text-sm font-bold text-gold">Incoming Replies</h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* List */}
                            <div className="overflow-y-auto max-h-[380px] p-2 space-y-2 scrollbar-thin">
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
                                            className="group p-3 rounded-xl bg-white/5 border border-white/5 hover:border-gold/30 hover:bg-gold/5 transition-all duration-300"
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
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
