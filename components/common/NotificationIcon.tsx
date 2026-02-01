"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export function NotificationIcon({ role = "fan" }: { role?: "creator" | "fan" }) {
    const { unreadCount, notifications, markAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOpen = () => setOpen(!open);

    // Unified Pink/Neon styles to match existing header buttons (Home & Dashboard)
    const buttonClasses = "p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition relative";
    const badgeColor = "bg-pink-600";
    const dropdownBorder = "border-pink-500/20";

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={toggleOpen}
                className={`${buttonClasses} ${open ? 'bg-pink-500/20 text-pink-300' : ''}`}
                title="Notifications"
            >
                <Bell className="w-5 h-5 transition-colors" />
                {unreadCount > 0 && (
                    <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${badgeColor} border border-black animate-pulse`} />
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border ${dropdownBorder} bg-black/95 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-white/5`}
                    >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-semibold text-white text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead();
                                    }}
                                    className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 transition"
                                >
                                    <Check className="w-3 h-3" /> Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No notifications yet.
                                </div>
                            ) : (
                                <div>
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => {
                                                if (!n.is_read) markAsRead(n.id);
                                                if (n.link) {
                                                    setOpen(false);
                                                    router.push(n.link);
                                                }
                                            }}
                                            className={`p-4 border-b border-white/5 hover:bg-white/5 transition cursor-pointer flex gap-3 ${!n.is_read ? 'bg-white/[0.02]' : ''}`}
                                        >
                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? 'bg-pink-500' : 'bg-transparent'}`} />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-medium text-gray-200 leading-snug">{n.title}</p>
                                                    <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-400 leading-relaxed">{n.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
