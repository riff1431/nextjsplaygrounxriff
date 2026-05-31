"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    Bell,
    Check,
    X,
    Heart,
    Star,
    Zap,
    UserPlus,
    MessageCircle,
    Gift,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

/* ── Static colour map — no Tailwind dynamic class purge ── */
const TYPE_STYLE: Record<
    string,
    { icon: React.ElementType; bg: string; icon_color: string; border: string; glow: string }
> = {
    follow:       { icon: UserPlus,      bg: "bg-blue-500/15",   icon_color: "text-blue-400",   border: "border-blue-500/25",   glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]" },
    like:         { icon: Heart,         bg: "bg-red-500/15",    icon_color: "text-red-400",    border: "border-red-500/25",    glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]" },
    unlock:       { icon: Star,          bg: "bg-purple-500/15", icon_color: "text-purple-400", border: "border-purple-500/25", glow: "shadow-[0_0_12px_rgba(168,85,247,0.3)]" },
    system:       { icon: Zap,           bg: "bg-yellow-500/15", icon_color: "text-yellow-400", border: "border-yellow-500/25", glow: "shadow-[0_0_12px_rgba(234,179,8,0.3)]" },
    gift:         { icon: Gift,          bg: "bg-green-500/15",  icon_color: "text-green-400",  border: "border-green-500/25",  glow: "shadow-[0_0_12px_rgba(34,197,94,0.3)]" },
    message:      { icon: MessageCircle, bg: "bg-sky-500/15",    icon_color: "text-sky-400",    border: "border-sky-500/25",    glow: "shadow-[0_0_12px_rgba(14,165,233,0.3)]" },
    default:      { icon: Bell,          bg: "bg-pink-500/15",   icon_color: "text-pink-400",   border: "border-pink-500/25",   glow: "shadow-[0_0_12px_rgba(236,72,153,0.3)]" },
};

function getTypeStyle(type: string) {
    const t = type?.toLowerCase() || "";
    if (t.includes("tip") || t.includes("gift")) return TYPE_STYLE.gift;
    if (t.includes("unlock") || t.includes("bid") || t.includes("star")) return TYPE_STYLE.unlock;
    if (t.includes("follow") || t.includes("user")) return TYPE_STYLE.follow;
    if (t.includes("like") || t.includes("heart")) return TYPE_STYLE.like;
    if (t.includes("message") || t.includes("comment") || t.includes("chat")) return TYPE_STYLE.message;
    if (t.includes("system") || t.includes("admin") || t.includes("approve") || t.includes("reject")) return TYPE_STYLE.system;
    return TYPE_STYLE.default;
}

/* ── Single notification row ── */
function NotifRow({
    n,
    onMarkRead,
    onNavigate,
}: {
    n: any;
    onMarkRead: (id: string) => void;
    onNavigate: (link?: string) => void;
}) {
    const hasTitle = n.title && n.title.trim() !== "" && n.title !== n.message;
    const timeAgo = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });
    const { icon: TypeIcon, bg, icon_color, border, glow } = getTypeStyle(n.type);
    const avatarUrl = n.actor?.avatar_url;
    const username = n.actor?.username;

    // Clean up username prefix from message if redundant
    const cleanMessage = username
        ? n.message.replace(new RegExp(`^@?${username}\\s*`), "")
        : n.message;

    return (
        <div
            onClick={() => {
                if (!n.is_read) onMarkRead(n.id);
                onNavigate(n.link);
            }}
            className={`
                relative flex items-start gap-3.5 px-4 py-3.5
                border-b border-white/[0.04] last:border-0
                cursor-pointer transition-all duration-200 select-none
                ${!n.is_read
                    ? "bg-gradient-to-r from-pink-500/[0.06] via-pink-500/[0.02] to-transparent"
                    : "hover:bg-white/[0.02] active:bg-white/[0.04]"
                }
            `}
        >
            {/* Unread accent glow bar */}
            {!n.is_read && (
                <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-pink-500 to-purple-500 shadow-[0_0_12px_rgba(236,72,153,0.8)]" />
            )}

            {/* Avatar / icon */}
            <div className="relative shrink-0 mt-0.5">
                {avatarUrl ? (
                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-300 ${n.is_read ? "border-white/10" : "border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.2)]"}`}>
                        <Image
                            src={avatarUrl}
                            alt={username ?? "User"}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                            unoptimized
                        />
                    </div>
                ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${bg} ${border} ${!n.is_read ? glow : ""}`}>
                        <TypeIcon className={`w-4 h-4 ${icon_color}`} />
                    </div>
                )}
                {/* Type badge on avatar */}
                {avatarUrl && (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center bg-black border ${bg} ${border}`}>
                        <TypeIcon className={`w-2.5 h-2.5 ${icon_color}`} />
                    </span>
                )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <div className="text-[13px] sm:text-[13.5px] leading-snug break-words">
                    {username && (
                        <span className="font-bold text-pink-300 hover:text-pink-200 transition-colors mr-1">
                            @{username}
                        </span>
                    )}
                    <span className={n.is_read ? "text-gray-300" : "text-white font-medium"}>
                        {hasTitle ? n.title : cleanMessage}
                    </span>
                    <span className="inline-block text-[11px] text-gray-500 ml-2 font-normal whitespace-nowrap">
                        • {timeAgo}
                    </span>
                </div>

                {/* Glassmorphic nested body details if there is a separate title and message */}
                {hasTitle && n.message && (
                    <div className="mt-2 text-[12px] text-gray-300 leading-relaxed bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.05] rounded-xl p-2.5 shadow-inner transition-colors">
                        {cleanMessage}
                    </div>
                )}
            </div>

            {/* Unread dot indicator */}
            {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(236,72,153,0.9)] animate-pulse" />
            )}
        </div>
    );
}

/* ── Main component ── */
export function NotificationIcon({ role = "fan" }: { role?: "creator" | "fan" }) {
    const { unreadCount, notifications, markAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    /* Detect mobile and set mounted */
    useEffect(() => {
        setMounted(true);
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener("resize", check);
        return () => {
            window.removeEventListener("resize", check);
            setMounted(false);
        };
    }, []);

    /* Close dropdown on outside click (desktop only) */
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

    /* Lock body scroll when mobile sheet is open */
    useEffect(() => {
        document.body.style.overflow = isMobile && open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isMobile, open]);

    const handleMarkRead = (id: string) => markAsRead(id);
    const handleNavigate = (link?: string) => {
        if (link) { setOpen(false); router.push(link); }
    };

    /* ── Shared panel content ── */
    const PanelContent = () => (
        <div className="flex flex-col" style={{ maxHeight: isMobile ? "82vh" : "500px" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-[15px] tracking-tight">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-600 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(); }}
                            className="flex items-center gap-1 text-[11px] font-medium text-pink-400 hover:text-pink-300 px-2.5 py-1.5 rounded-lg hover:bg-pink-500/10 active:bg-pink-500/20 transition"
                        >
                            <Check className="w-3 h-3" />
                            Mark all read
                        </button>
                    )}
                    {isMobile && (
                        <button
                            onClick={() => setOpen(false)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 active:bg-white/20 text-gray-400 hover:text-white transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Notification list — flex-1 + min-h-0 enables proper scroll inside flex */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Bell className="w-6 h-6 text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-500">No notifications yet</p>
                        <p className="text-xs text-gray-600 text-center px-8">
                            You'll see likes, follows, unlocks, and messages here.
                        </p>
                    </div>
                ) : (
                    notifications.map((n: any) => (
                        <NotifRow
                            key={n.id}
                            n={n}
                            onMarkRead={handleMarkRead}
                            onNavigate={handleNavigate}
                        />
                    ))
                )}
            </div>

            {/* Footer — View all link */}
            <div className="shrink-0 px-4 py-2.5 border-t border-white/10">
                <button
                    onClick={() => { setOpen(false); router.push("/account/notifications"); }}
                    className="w-full text-center text-[12px] text-pink-400 hover:text-pink-300 font-medium py-1 rounded-lg hover:bg-pink-500/10 active:bg-pink-500/20 transition"
                >
                    View all notifications →
                </button>
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
                        ? "bg-pink-500/20 border-pink-500/40 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                        : "bg-pink-500/10 border-pink-500/20 text-pink-400 hover:bg-pink-500/20 hover:text-pink-300"
                }`}
                title="Notifications"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-pink-600 border-2 border-black animate-pulse shadow-[0_0_6px_rgba(236,72,153,0.8)]" />
                )}
            </button>

            {mounted && isMobile && typeof document !== "undefined" ? (
                createPortal(
                    <AnimatePresence>
                        {open && (
                            <>
                                {/* Backdrop */}
                                <motion.div
                                    key="nb"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-[4px]"
                                    onClick={() => setOpen(false)}
                                />

                                {/* Sheet */}
                                <motion.div
                                    key="ns"
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", stiffness: 350, damping: 34 }}
                                    className="fixed bottom-0 left-0 right-0 z-[101] rounded-t-[28px] bg-[#0d0d14] border-t border-l border-r border-pink-500/20 shadow-[0_-24px_64px_rgba(0,0,0,0.85)] max-h-[85vh] flex flex-col overflow-hidden"
                                >
                                    {/* Drag handle */}
                                    <div className="flex justify-center pt-2.5 pb-0.5 shrink-0">
                                        <div className="w-10 h-[4px] rounded-full bg-white/15" />
                                    </div>
                                    <PanelContent />
                                    {/* iOS safe-area bottom spacer */}
                                    <div className="h-[env(safe-area-inset-bottom,8px)] shrink-0" />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            ) : (
                <AnimatePresence>
                    {open && (
                        /* ── DESKTOP: dropdown ── */
                        <motion.div
                            key="nd"
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="absolute right-0 mt-2 w-[360px] rounded-2xl border border-pink-500/20 bg-[#0d0d14]/98 backdrop-blur-xl shadow-[0_20px_64px_rgba(0,0,0,0.75)] ring-1 ring-white/5 overflow-hidden"
                        >
                            <PanelContent />
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}
