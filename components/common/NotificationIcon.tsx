"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, X, Bell as BellOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export function NotificationIcon({ role = "fan" }: { role?: "creator" | "fan" }) {
    const { unreadCount, notifications, markAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile (< 640px)
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // Close on click outside — desktop only
    useEffect(() => {
        if (isMobile) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMobile]);

    // Lock body scroll while mobile sheet is open
    useEffect(() => {
        document.body.style.overflow = isMobile && open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isMobile, open]);

    /* ── Notification row ── */
    const NotifRow = ({ n }: { n: any }) => {
        const hasTitle = n.title && n.title.trim() !== "";
        const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });

        return (
            <div
                onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                    if (n.link) { setOpen(false); router.push(n.link); }
                }}
                className={`
                    relative px-4 py-3.5 border-b border-white/5 last:border-0
                    cursor-pointer active:bg-white/10 transition-colors
                    ${!n.is_read ? "bg-pink-500/[0.04] hover:bg-pink-500/[0.07]" : "hover:bg-white/[0.04]"}
                `}
            >
                {/* Unread accent bar on left */}
                {!n.is_read && (
                    <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-pink-500" />
                )}

                <div className="flex items-start gap-3 pl-1">
                    {/* Dot */}
                    <div className={`mt-[6px] w-2 h-2 rounded-full shrink-0 ${!n.is_read ? "bg-pink-500 shadow-[0_0_6px_hsl(330,90%,60%)]" : "bg-white/10"}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Timestamp row */}
                        <p className="text-[10px] text-gray-500 mb-0.5">{timeAgo}</p>

                        {/* Title (if present and different from message) */}
                        {hasTitle && n.title !== n.message && (
                            <p className="text-[13px] font-semibold text-gray-100 leading-snug mb-0.5">
                                {n.title}
                            </p>
                        )}

                        {/* Message body */}
                        {n.message && (
                            <p className={`text-[13px] leading-snug ${hasTitle && n.title !== n.message ? "text-gray-400" : "text-gray-200 font-medium"}`}>
                                {n.message}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    /* ── Shared panel content ── */
    const PanelContent = () => (
        <div className="flex flex-col" style={{ maxHeight: isMobile ? "78vh" : "480px" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-[15px]">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-600 text-[10px] font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(); }}
                            className="flex items-center gap-1 text-[11px] font-medium text-pink-400 hover:text-pink-300 px-2 py-1 rounded-lg hover:bg-pink-500/10 transition"
                        >
                            <Check className="w-3 h-3" />
                            Mark all read
                        </button>
                    )}
                    {isMobile && (
                        <button
                            onClick={() => setOpen(false)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-gray-400 hover:text-white transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-500">No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((n: any) => <NotifRow key={n.id} n={n} />)
                )}
            </div>
        </div>
    );

    return (
        <div className="relative z-50" ref={dropdownRef}>
            {/* Bell button */}
            <button
                onClick={() => setOpen(!open)}
                className={`relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border transition-all duration-300 ${
                    open
                        ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                        : "bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20 hover:text-pink-300"
                }`}
                title="Notifications"
            >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-pink-600 border border-black animate-pulse" />
                )}
            </button>

            <AnimatePresence>
                {open && (
                    isMobile ? (
                        /* ── MOBILE: bottom-sheet ── */
                        <>
                            <motion.div
                                key="nb"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[3px]"
                                onClick={() => setOpen(false)}
                            />
                            <motion.div
                                key="ns"
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", stiffness: 340, damping: 32 }}
                                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-[#0d0d14] border-t border-l border-r border-pink-500/20 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
                            >
                                {/* Drag handle */}
                                <div className="flex justify-center pt-2.5 pb-1">
                                    <div className="w-9 h-1 rounded-full bg-white/15" />
                                </div>
                                <PanelContent />
                                {/* Safe-area bottom spacer */}
                                <div className="h-safe-bottom pb-2" />
                            </motion.div>
                        </>
                    ) : (
                        /* ── DESKTOP: dropdown ── */
                        <motion.div
                            key="nd"
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="absolute right-0 mt-2 w-[340px] rounded-2xl border border-pink-500/20 bg-[#0d0d14]/98 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] ring-1 ring-white/5 overflow-hidden"
                        >
                            <PanelContent />
                        </motion.div>
                    )
                )}
            </AnimatePresence>
        </div>
    );
}
