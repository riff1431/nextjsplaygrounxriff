"use client";

import React, { useEffect, useState } from "react";
import {
    Bell,
    Heart,
    Star,
    Zap,
    UserPlus,
    MessageCircle,
    Gift,
    ArrowLeft,
    Check,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ──────────────────────────────────────────────────────────
   Static colour map — prevents Tailwind purging dynamic class names
   ────────────────────────────────────────────────────────── */
const TYPE_STYLE: Record<
    string,
    { icon: React.ElementType; bg: string; icon_color: string; border: string; glow: string }
> = {
    follow:  { icon: UserPlus,      bg: "bg-blue-500/15",   icon_color: "text-blue-400",   border: "border-blue-500/25",   glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]" },
    like:    { icon: Heart,         bg: "bg-red-500/15",    icon_color: "text-red-400",    border: "border-red-500/25",    glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]" },
    unlock:  { icon: Star,          bg: "bg-purple-500/15", icon_color: "text-purple-400", border: "border-purple-500/25", glow: "shadow-[0_0_12px_rgba(168,85,247,0.3)]" },
    system:  { icon: Zap,           bg: "bg-yellow-500/15", icon_color: "text-yellow-400", border: "border-yellow-500/25", glow: "shadow-[0_0_12px_rgba(234,179,8,0.3)]" },
    gift:    { icon: Gift,          bg: "bg-green-500/15",  icon_color: "text-green-400",  border: "border-green-500/25",  glow: "shadow-[0_0_12px_rgba(34,197,94,0.3)]" },
    message: { icon: MessageCircle, bg: "bg-sky-500/15",    icon_color: "text-sky-400",    border: "border-sky-500/25",    glow: "shadow-[0_0_12px_rgba(14,165,233,0.3)]" },
    default: { icon: Bell,          bg: "bg-pink-500/15",   icon_color: "text-pink-400",   border: "border-pink-500/25",   glow: "shadow-[0_0_12px_rgba(236,72,153,0.3)]" },
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

/* ──────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────── */
type Notification = {
    id: string;
    type: string;
    title?: string;
    message: string;
    is_read: boolean;
    created_at: string;
    actor_id: string | null;
    link?: string;
    actor?: {
        username: string;
        avatar_url: string | null;
    } | null;
};

/* ──────────────────────────────────────────────────────────
   Skeleton loader card
   ────────────────────────────────────────────────────────── */
function SkeletonRow() {
    return (
        <div className="flex items-start gap-3 px-4 py-4 border-b border-white/[0.06] animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-2.5 bg-white/10 rounded-full w-1/4" />
                <div className="h-3 bg-white/10 rounded-full w-3/4" />
                <div className="h-3 bg-white/10 rounded-full w-1/2" />
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────
   Single notification card row
   ────────────────────────────────────────────────────────── */
function NotifCard({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
    const { icon: TypeIcon, bg, icon_color, border, glow } = getTypeStyle(n.type);
    const avatarUrl = n.actor?.avatar_url;
    const username  = n.actor?.username;
    const timeAgo   = formatDistanceToNow(new Date(n.created_at), { addSuffix: true });
    const hasTitle  = n.title && n.title.trim() !== "" && n.title !== n.message;

    // Clean up username prefix from message if redundant
    const cleanMessage = username
        ? n.message.replace(new RegExp(`^@?${username}\\s*`), "")
        : n.message;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => { if (!n.is_read) onRead(n.id); }}
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
                    <div className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-all duration-300 ${n.is_read ? "border-white/10" : "border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.2)]"}`}>
                        <Image
                            src={avatarUrl}
                            alt={username ?? "User"}
                            width={44}
                            height={44}
                            className="w-full h-full object-cover"
                            unoptimized
                        />
                    </div>
                ) : (
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 ${bg} ${border} ${!n.is_read ? glow : ""}`}>
                        <TypeIcon className={`w-5 h-5 ${icon_color}`} />
                    </div>
                )}
                {/* Type badge on avatar */}
                {avatarUrl && (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-black border ${bg} ${border}`}>
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
        </motion.div>
    );
}

/* ──────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────── */
export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/auth"); return; }

            const { data } = await supabase
                .from("notifications")
                .select(`
                    *,
                    actor:actor_id (
                        username,
                        avatar_url
                    )
                `)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (data) {
                setNotifications(data as any);

                // Mark unread as read in background
                const unreadIds = data
                    .filter((n: any) => !n.is_read)
                    .map((n: any) => n.id);
                if (unreadIds.length > 0) {
                    supabase
                        .from("notifications")
                        .update({ is_read: true })
                        .in("id", unreadIds)
                        .then(() => {});
                }
            }
            setLoading(false);
        };
        fetchNotifications();
    }, []);

    const handleMarkRead = async (id: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    };

    const handleMarkAllRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("user_id", user.id)
                .eq("is_read", false);
        }
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
        <div className="min-h-screen bg-black text-white">
            {/* ── Header ── */}
            <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 active:bg-white/20 transition"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="w-4 h-4 text-gray-300" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-pink-400" />
                            <h1 className="text-[16px] font-bold text-white tracking-tight">
                                Notifications
                            </h1>
                            {unreadCount > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-pink-600 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1.5 text-[12px] font-medium text-pink-400 hover:text-pink-300 px-3 py-1.5 rounded-lg hover:bg-pink-500/10 active:bg-pink-500/20 transition"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Mark all read
                        </button>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            <div className="max-w-2xl mx-auto px-0 sm:px-4 pb-28 sm:pb-10 pt-2">
                {loading ? (
                    <div className="rounded-2xl sm:border sm:border-white/10 sm:mt-4 overflow-hidden">
                        {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 px-6">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.08)]">
                            <Bell className="w-7 h-7 text-gray-600" />
                        </div>
                        <div className="text-center">
                            <p className="text-gray-300 font-semibold mb-1">No notifications yet</p>
                            <p className="text-sm text-gray-500">
                                Likes, follows, unlocks and messages will appear here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Unread section */}
                        {notifications.some((n) => !n.is_read) && (
                            <div className="mb-1">
                                <p className="text-[11px] font-semibold text-pink-400 uppercase tracking-widest px-4 pt-4 pb-2">
                                    New
                                </p>
                                <div className="sm:rounded-2xl sm:border sm:border-pink-500/15 overflow-hidden">
                                    <AnimatePresence initial={false}>
                                        {notifications
                                            .filter((n) => !n.is_read)
                                            .map((n) => (
                                                <NotifCard key={n.id} n={n} onRead={handleMarkRead} />
                                            ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}

                        {/* Earlier (read) section */}
                        {notifications.some((n) => n.is_read) && (
                            <div className="mt-3">
                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest px-4 pt-2 pb-2">
                                    Earlier
                                </p>
                                <div className="sm:rounded-2xl sm:border sm:border-white/10 overflow-hidden">
                                    <AnimatePresence initial={false}>
                                        {notifications
                                            .filter((n) => n.is_read)
                                            .map((n) => (
                                                <NotifCard key={n.id} n={n} onRead={handleMarkRead} />
                                            ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
