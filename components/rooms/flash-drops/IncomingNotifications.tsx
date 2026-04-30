"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Inbox, X, Bell } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface FlashDropRequest {
    id: string;
    room_id: string;
    fan_id: string;
    fan_name: string;
    content: string;
    amount: number;
    status: "pending" | "accepted" | "declined";
    media_url?: string | null;
    created_at: string;
}

export default function IncomingNotifications({ roomId }: { roomId: string | null }) {
    const { user } = useAuth();
    const supabase = createClient();
    const [notifications, setNotifications] = useState<FlashDropRequest[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const [viewingNotification, setViewingNotification] = useState<FlashDropRequest | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user || !roomId) return;

        const fetchInitial = async () => {
            const { data } = await supabase
                .from("flash_drop_requests")
                .select("*")
                .eq("room_id", roomId)
                .eq("fan_id", user.id)
                .eq("status", "accepted")
                .order("created_at", { ascending: false });

            if (data) setNotifications(data);
        };

        fetchInitial();

        const channel = supabase
            .channel(`incoming-flashdrops-${roomId}-${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "flash_drop_requests",
                    filter: `fan_id=eq.${user.id}`,
                },
                (payload) => {
                    const updated = payload.new as FlashDropRequest;
                    if (updated.room_id === roomId && updated.status === "accepted") {
                        setNotifications((prev) => {
                            if (prev.some(r => r.id === updated.id)) {
                                return prev.map(r => r.id === updated.id ? updated : r);
                            }
                            return [updated, ...prev];
                        });

                        if (!isOpen) {
                            setUnreadCount((prev) => prev + 1);
                        }

                        toast.success("New accepted request from Creator!", {
                            description: updated.content.substring(0, 50) + (updated.content.length > 50 ? "..." : ""),
                            icon: <Bell className="text-primary" size={16} />,
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
                top: rect.top,
                left: rect.right + 12,
            });
        }
        setIsOpen(prev => !prev);
        if (!isOpen) setUnreadCount(0);
    };

    const renderMediaThumbnail = (mediaUrl: string) => {
        const isVideo = mediaUrl.match(/\.(mp4|ogg|webm)$/i);
        if (isVideo) {
            return (
                <div className="relative w-full h-20 rounded-lg overflow-hidden border border-primary/20 bg-black/60 mt-2">
                    <video src={mediaUrl} className="w-full h-full object-cover opacity-60 pointer-events-none" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center text-white text-[10px] shadow-[0_0_10px_hsl(330_100%_55%/0.5)]">
                            ▶
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <img src={mediaUrl} alt="Drop Media" className="w-full h-20 rounded-lg mt-2 border border-primary/20 object-cover bg-black/40" />
        );
    };

    const renderFullMedia = (mediaUrl: string) => {
        const isVideo = mediaUrl.match(/\.(mp4|ogg|webm)$/i);
        if (isVideo) {
            return (
                <video src={mediaUrl} controls autoPlay className="w-full max-h-[60vh] rounded-xl border border-primary/40 object-contain bg-black/60 shadow-[0_0_30px_hsl(330_100%_55%/0.2)]" />
            );
        }
        return (
            <img src={mediaUrl} alt="Drop Media" className="w-full max-h-[60vh] rounded-xl border border-primary/40 object-contain bg-black/60 shadow-[0_0_30px_hsl(330_100%_55%/0.2)]" />
        );
    };

    if (!roomId) return null;

    return (
        <div className="relative">
            {/* Trigger button */}
            <button
                ref={buttonRef}
                onClick={toggleDropdown}
                title="Incoming Notifications"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isOpen
                        ? "border border-primary/80 bg-primary/25 text-primary shadow-[0_0_15px_hsl(330_100%_55%/0.4)]"
                        : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/25 hover:border-primary/80"
                }`}
            >
                <div className="relative">
                    <Inbox size={16} className={unreadCount > 0 ? "animate-bounce" : ""} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-black">
                            {unreadCount}
                        </span>
                    )}
                </div>
            </button>

            {/* Portal for dropdown */}
            {typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, x: -10, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -10, scale: 0.95 }}
                            transition={{ duration: 0.18 }}
                            style={{
                                position: "fixed",
                                top: dropdownPos.top,
                                left: dropdownPos.left,
                                zIndex: 99999,
                                width: "320px",
                                maxHeight: "80vh",
                            }}
                            className="overflow-hidden rounded-2xl border border-primary/30 bg-black/80 backdrop-blur-2xl shadow-[0_0_40px_hsl(330_100%_55%/0.2)] flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3 bg-black/40 shrink-0">
                                <h3 className="text-sm font-black text-white fd-font-tech tracking-widest uppercase flex items-center gap-2">
                                    <Inbox size={14} className="text-primary" /> Incoming
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white/40 hover:text-white transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* List */}
                            <div className="overflow-y-auto flex-1 p-3 space-y-3 themed-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                        <div className="w-12 h-12 rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center mb-3">
                                            <Inbox size={20} className="text-primary/50" />
                                        </div>
                                        <p className="text-[11px] text-white/50 font-medium">
                                            No incoming drops yet. Send a request to the creator!
                                        </p>
                                    </div>
                                ) : (
                                    notifications.map((n) => {
                                        const parts = n.content.split(' |__MEDIA__|');
                                        const textContent = parts[0];
                                        const resolvedMediaUrl = parts[1] || n.media_url;

                                        return (
                                        <div
                                            key={n.id}
                                            onClick={() => {
                                                setViewingNotification(n);
                                                setIsOpen(false);
                                            }}
                                            className="group p-3 rounded-xl bg-white/5 border border-primary/20 hover:border-primary hover:bg-primary/10 transition-all duration-300 flex flex-col cursor-pointer hover:shadow-[0_0_15px_hsl(330_100%_55%/0.3)]"
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-primary group-hover:text-white transition-colors">
                                                    Custom Drop: €{n.amount}
                                                </span>
                                                <span className="text-[9px] text-white/40">
                                                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/90 leading-snug mb-1 line-clamp-2">
                                                "{textContent}"
                                            </p>
                                            
                                            {resolvedMediaUrl ? (
                                                <div className="mt-1">
                                                    <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest block">
                                                        Media Attached
                                                    </span>
                                                    {renderMediaThumbnail(resolvedMediaUrl)}
                                                </div>
                                            ) : (
                                                <div className="mt-2 p-1.5 rounded bg-black/40 border border-white/10 flex items-center justify-center">
                                                    <span className="text-[9px] text-white/50 italic uppercase tracking-widest">
                                                        No Media
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )})
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Modal for full view */}
            {typeof window !== "undefined" && createPortal(
                <AnimatePresence>
                    {viewingNotification && (() => {
                        const parts = viewingNotification.content.split(' |__MEDIA__|');
                        const textContent = parts[0];
                        const resolvedMediaUrl = parts[1] || viewingNotification.media_url;

                        return (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
                                onClick={() => setViewingNotification(null)}
                            >
                                <motion.div
                                    initial={{ scale: 0.95, y: 20 }}
                                    animate={{ scale: 1, y: 0 }}
                                    exit={{ scale: 0.95, y: 20 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-black/90 border border-primary/40 rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-[0_0_50px_hsl(330_100%_55%/0.2)] flex flex-col max-h-[90vh]"
                                >
                                    <div className="flex items-center justify-between mb-4 shrink-0 border-b border-white/10 pb-4">
                                        <div className="flex flex-col">
                                            <h2 className="text-xl font-black text-primary fd-font-tech tracking-widest uppercase">
                                                Accepted Request
                                            </h2>
                                            <p className="text-sm text-white/50 font-medium">
                                                {new Date(viewingNotification.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setViewingNotification(null)}
                                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-all border border-white/10"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="overflow-y-auto flex-1 themed-scrollbar pr-2">
                                        <div className="mb-6 bg-primary/10 border border-primary/20 rounded-xl p-4">
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Original Request • €{viewingNotification.amount}</p>
                                            <p className="text-base text-white/90 leading-relaxed italic font-medium">
                                                "{textContent}"
                                            </p>
                                        </div>

                                        {resolvedMediaUrl ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[11px] font-bold text-green-400 uppercase tracking-widest mb-3 self-start">Delivery Attached</span>
                                                {renderFullMedia(resolvedMediaUrl)}
                                            </div>
                                        ) : (
                                            <div className="py-12 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                                    <Inbox size={24} className="text-white/20" />
                                                </div>
                                                <p className="text-sm font-bold text-white/40 uppercase tracking-widest">No Media Attached</p>
                                                <p className="text-xs text-white/30 mt-1">This request was fulfilled without an attachment.</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
