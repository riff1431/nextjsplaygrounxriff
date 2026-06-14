"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Crown,
    MessageSquare,
    MessageCircle,
    Heart,
    Star,
    Lock,
    Mic,
    Image as ImageIcon,
    Timer,
    Sparkles,
    Flame,
    Gift,
    ChevronDown,
    Search,
    Users,
    Settings,
    CreditCard,
    LogOut,
    User,
    Bell,
    Video,
    Trophy,
    Upload,
    ArrowLeft,
    Menu,
    X,
    Share2,
    Compass,
    Bookmark,
    Award,
    Unlock,
    MoreHorizontal,
    Flag,
    Home as HomeIcon,
    Dices,
    HelpCircle,
    Radio,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { createClient } from "@/utils/supabase/client";
import { DynamicIcon } from "@/components/admin/settings/IframeMenuManager";
import CreatePostModal from "@/components/posts/CreatePostModal";
import PostCard from "@/components/posts/PostCard";
import { AnimatePresence, motion } from "framer-motion";
import ProfileMenu from "@/components/navigation/ProfileMenu";
import BrandLogo from "@/components/common/BrandLogo";
import LaunchTimer from "@/components/common/LaunchTimer";
import WelcomePopup from "@/components/common/WelcomePopup";
import WorldTruthDareList from "@/components/rooms/WorldTruthDareList";
import { NotificationIcon } from "@/components/common/NotificationIcon";
import { activeCreators, CreatorCard } from "@/components/data/activeCreators";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";
import { toast } from "sonner";
import { cs } from "@/utils/currency";
import CommentsModal from "@/components/posts/CommentsModal";
import UnlockPostModal from "@/components/posts/UnlockPostModal";
import ReportModal from "@/components/common/ReportModal";
import { formatDistanceToNow } from "date-fns";
import { useGuidedTour } from "@/components/guided-tour/GuidedTourProvider";

// Local fallback icon so the preview never breaks due to a missing lucide icon export
function BarDrinkIcon({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) {
    return (
        <svg
            className={className}
            style={style}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M7 3h10l-1 7a4 4 0 0 1-4 3H12a4 4 0 0 1-4-3L7 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path d="M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M12 13v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M9 6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

// ---- Shared helpers --------------------------------------------------------
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

// ---- Types -----------------------------------------------------------------
type BadgeTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "VIP";


type Post = {
    id: string;
    content_type: 'text' | 'image' | 'video';
    caption: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
    created_at: string;
    user_id: string;
    tags?: string[];
    profiles: {
        username: string | null;
        avatar_url: string | null;
        role?: string;
    } | null;
    is_paid?: boolean;
    price?: number;
    likes?: { count: number }[];
    comments?: { count: number }[];
};

// ---- Mock content ----------------------------------------------------------
const CREATORS: CreatorCard[] = activeCreators;

// ---- Branding --------------------------------------------------------------
function Logo({ onClick }: { onClick?: () => void }) {
    return (
        <button onClick={onClick} className="flex items-center gap-2 select-none text-left" title="Back to Home">
            <BrandLogo showBadge={false} />
        </button>
    );
}

function NeonCard({ children, className = "", ...rest }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                // toned-down outer neon glow (cleaner edges, less bleed)
                "shadow-[0_0_24px_rgba(236,72,153,0.14),0_0_56px_rgba(59,130,246,0.08)]",
                "hover:shadow-[0_0_38px_rgba(236,72,153,0.22),0_0_86px_rgba(59,130,246,0.14)] transition-shadow",
                className
            )}
            {...rest}
        >
            {children}
        </div>
    );
}

function NeonButton({
    children,
    onClick,
    className = "",
    variant = "pink",
    disabled,
    title,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    variant?: "pink" | "blue" | "ghost";
    disabled?: boolean;
    title?: string;
}) {
    const base =
        "px-3 py-2 rounded-xl text-sm transition border disabled:opacity-50 disabled:cursor-not-allowed";
    const styles =
        variant === "pink"
            ? "bg-pink-600 hover:bg-pink-700 border-pink-500/30"
            : variant === "blue"
                ? "bg-blue-600 hover:bg-blue-700 border-blue-500/30"
                : "bg-black/40 hover:bg-white/5 border-pink-500/25";

    return (
        <button title={title} disabled={disabled} onClick={onClick} className={cx(base, styles, className)}>
            {children}
        </button>
    );
}

function Dropdown({
    label,
    items,
    tone = "pink",
}: {
    label: React.ReactNode;
    items: Array<{ icon?: React.ReactNode; text: string; onClick?: () => void }>;
    tone?: "pink" | "blue";
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="w-full">
            <button
                onClick={() => setOpen((o) => !o)}
                className={cx(
                    "w-full flex items-center justify-between gap-2 rounded-2xl px-4 py-3",
                    "border bg-black/40 transition",
                    tone === "pink"
                        ? "border-pink-500/35 text-pink-200 hover:bg-pink-600/10"
                        : "border-blue-500/35 text-blue-200 hover:bg-blue-600/10"
                )}
            >
                <span className="inline-flex items-center gap-2">{label}</span>
                <ChevronDown className={cx("w-4 h-4 transition", open && "rotate-180")} />
            </button>

            {open && (
                <div
                    className={cx(
                        "mt-2 w-full rounded-2xl border bg-black/70",
                        tone === "pink" ? "border-pink-500/25" : "border-blue-500/25"
                    )}
                >
                    <div className="py-2 flex flex-col items-center text-center">
                        {items.map((it, idx) => (
                            <button
                                key={`${it.text}-${idx}`}
                                onClick={() => {
                                    setOpen(false);
                                    it.onClick?.();
                                }}
                                className="w-full px-4 py-2 text-sm flex items-center justify-center gap-2 hover:bg-white/5"
                            >
                                <span className="opacity-90">{it.icon}</span>
                                <span>{it.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function fanTierClasses(tier: BadgeTier) {
    switch (tier) {
        case "Bronze":
            return "border-yellow-700/70 text-yellow-500";
        case "Silver":
            return "border-gray-400/70 text-gray-200";
        case "Gold":
            return "border-yellow-400/70 text-yellow-300";
        case "Platinum":
            return "border-indigo-300/70 text-indigo-200";
        case "VIP":
            return "border-yellow-400/80 text-yellow-300";
        default:
            return "border-gray-600 text-gray-200";
    }
}

function fanTierBg(tier: BadgeTier) {
    switch (tier) {
        case "Bronze":
            return "bg-yellow-900/15";
        case "Silver":
            return "bg-gray-500/10";
        case "Gold":
            return "bg-yellow-500/10";
        case "Platinum":
            return "bg-indigo-500/10";
        case "VIP":
            return "bg-yellow-500/15";
        default:
            return "bg-white/5";
    }
}



// ---- Neon palette helpers --------------------------------------------------
function toneClasses(tone: "pink" | "green" | "purple" | "red" | "blue" | "yellow") {
    // Deep nightclub neon palette (strong core, controlled outer glow)
    switch (tone) {
        case "green":
            return {
                text: "text-emerald-400 drop-shadow-[0_0_22px_rgba(0,255,170,1)] neon-deep",
                icon: "text-emerald-400 drop-shadow-[0_0_26px_rgba(0,255,170,1)]",
                border: "border-emerald-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(0,255,170,0.85),0_0_60px_rgba(0,255,170,0.45)] hover:shadow-[0_0_26px_rgba(0,255,170,0.95),0_0_90px_rgba(0,255,170,0.65)]",
                hover: "hover:bg-emerald-500/8",
            };
        case "purple":
            return {
                text: "text-violet-400 drop-shadow-[0_0_22px_rgba(170,80,255,1)] neon-deep",
                icon: "text-violet-400 drop-shadow-[0_0_26px_rgba(170,80,255,1)]",
                border: "border-violet-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(170,80,255,0.85),0_0_60px_rgba(170,80,255,0.45)] hover:shadow-[0_0_26px_rgba(170,80,255,0.95),0_0_90px_rgba(170,80,255,0.65)]",
                hover: "hover:bg-violet-500/8",
            };
        case "red":
            return {
                text: "text-rose-400 drop-shadow-[0_0_22px_rgba(255,55,95,1)] neon-deep",
                icon: "text-rose-400 drop-shadow-[0_0_26px_rgba(255,55,95,1)]",
                border: "border-rose-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(255,55,95,0.85),0_0_60px_rgba(255,55,95,0.45)] hover:shadow-[0_0_26px_rgba(255,55,95,0.95),0_0_90px_rgba(255,55,95,0.65)]",
                hover: "hover:bg-rose-500/8",
            };
        case "blue":
            return {
                text: "text-cyan-300 drop-shadow-[0_0_22px_rgba(0,230,255,1)] neon-deep",
                icon: "text-cyan-300 drop-shadow-[0_0_26px_rgba(0,230,255,1)]",
                border: "border-cyan-300/90",
                glow:
                    "shadow-[0_0_18px_rgba(0,230,255,0.85),0_0_60px_rgba(0,230,255,0.45)] hover:shadow-[0_0_26px_rgba(0,230,255,0.95),0_0_90px_rgba(0,230,255,0.65)]",
                hover: "hover:bg-cyan-500/8",
            };
        case "yellow":
            return {
                text: "text-lime-300 drop-shadow-[0_0_22px_rgba(200,255,0,1)] neon-deep",
                icon: "text-lime-300 drop-shadow-[0_0_26px_rgba(200,255,0,1)]",
                border: "border-lime-300/90",
                glow:
                    "shadow-[0_0_18px_rgba(200,255,0,0.85),0_0_60px_rgba(200,255,0,0.45)] hover:shadow-[0_0_26px_rgba(200,255,0,0.95),0_0_90px_rgba(200,255,0,0.65)]",
                hover: "hover:bg-lime-500/8",
            };
        case "pink":
            return {
                text: "text-pink-400 drop-shadow-[0_0_22px_rgba(236,72,153,1)] neon-deep",
                icon: "text-pink-400 drop-shadow-[0_0_26px_rgba(236,72,153,1)]",
                border: "border-pink-400/90",
                glow:
                    "shadow-[0_0_18px_rgba(236,72,153,0.85),0_0_60px_rgba(236,72,153,0.45)] hover:shadow-[0_0_26px_rgba(236,72,153,0.95),0_0_90px_rgba(236,72,153,0.65)]",
                hover: "hover:bg-pink-500/8",
            };
        default:
            return {
                hover: "hover:bg-fuchsia-500/8",
            };
    }
}



function CreatorTile({ creator, onOpen }: { creator: CreatorCard; onOpen: () => void }) {
    const tags = creator.tags.slice(0, 2);
    // Pad to preserve consistent tag area height
    while (tags.length < 2) tags.push("");

    return (
        <button
            onClick={onOpen}
            className={cx(
                "group relative rounded-2xl border border-pink-500/25 bg-black/40 overflow-hidden",
                "hover:border-pink-500/45 transition",
                "flex flex-col text-left",
                "aspect-[3/4] sm:aspect-square" // Optimized for mobile viewports
            )}
            title={creator.tags.includes("Suga 4 U") ? "Open Suga4U (preview)" : "Join Room"}
        >
            {/* Background Image (Cover) - fills the entire tile */}
            {creator.cover_url ? (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity duration-700"
                    style={{ backgroundImage: `url(${creator.cover_url})` }}
                />
            ) : null}

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/15 to-black/85 pointer-events-none" />

            {/* Flex spacer to push body to bottom */}
            <div className="flex-1" />

            {/* Body at the bottom */}
            <div className="relative p-2.5 sm:p-3 flex flex-col z-10">
                {/* Row: Avatar + name + level */}
                <div className="flex items-center gap-2 sm:gap-2.5 w-full min-h-[38px] sm:min-h-[44px]">
                    {creator.avatar_url ? (
                        <img src={creator.avatar_url} alt="" className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-white/30 object-cover shrink-0" />
                    ) : (
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-pink-500/20 border-2 border-pink-500/40 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 sm:w-5 h-5 text-pink-300" />
                        </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="text-xs sm:text-sm text-fuchsia-300 font-semibold truncate drop-shadow-[0_0_42px_rgba(255,0,200,1)]">
                            {creator.name}
                        </div>

                        <div className="flex items-center gap-1 mt-0.5 flex-wrap min-h-[14px] sm:min-h-[16px]">
                            <span className="shrink-0 text-[7.5px] sm:text-[9px] px-1.5 py-[1px] rounded-full border border-blue-500/25 text-blue-200 bg-black/50 backdrop-blur-sm">
                                {creator.level}
                            </span>
                            {creator.userId && <UserBadgeDisplay userId={creator.userId} />}
                        </div>
                    </div>
                </div>

                {/* Row: tags */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {tags.map((t, idx) =>
                        t ? (
                            <span
                                key={`${creator.id}-${t}`}
                                className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-[1.5px] sm:py-[2px] rounded-full border border-pink-500/20 text-pink-200 bg-black/40 backdrop-blur-sm"
                            >
                                {t}
                            </span>
                        ) : (
                            <span
                                key={`${creator.id}-pad-${idx}`}
                                className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-[1.5px] sm:py-[2px] rounded-full border border-transparent text-transparent select-none"
                            >
                                pad
                            </span>
                        )
                    )}
                </div>
            </div>
        </button>
    );
}

// ---- Home Screen Categories ------------------------------------------------
const CATS: Array<{
    label: string;
    key: string;
    icon: React.ReactNode | string;
    tone: "pink" | "green" | "purple" | "red" | "blue" | "yellow";
    primary?: boolean;
    route: string;
    comingSoon?: boolean;
    roomType: string;
    dataTour?: string;
}> = [
        { label: "Flash Drops", key: "drops", icon: "/rooms/icons/flash-drops.png", tone: "blue", route: "/rooms/flash-drop-sessions", roomType: "flash-drop" },
        { label: "Confessions", key: "conf", icon: "/rooms/icons/confessions.png", tone: "red", route: "/rooms/confessions-browse", roomType: "confessions" },
        { label: "X Chat", key: "xchat", icon: "/rooms/icons/x-chat.png", tone: "yellow", route: "/rooms/x-chat-sessions", roomType: "x-chat" },
        { label: "Bar Lounge", key: "bar", icon: "/rooms/icons/bar-lounge.png", tone: "purple", route: "/rooms/bar-lounge", roomType: "bar-lounge" },
        { label: "Truth or Dare", key: "truth", icon: "/rooms/icons/truth-or-dare.png", tone: "green", route: "/rooms/truth-or-dare-sessions", roomType: "truth-or-dare" },
        { label: "Suga 4 U", key: "suga4u", icon: "/rooms/icons/suga4u.png", tone: "pink", primary: true, route: "/rooms/suga4u-sessions", roomType: "suga-4-u", dataTour: "role-selection" },
        { label: "All Live Rooms", key: "alllive", icon: <Radio className="w-4 h-4" />, tone: "blue", route: "/rooms/all-live", roomType: "all-live" },
        { label: "Casino", key: "casino", icon: "/rooms/icons/casino.png", tone: "yellow", route: "/rooms/casino", roomType: "casino" },
    ];

// ---- Mobile Compact Post Card Component -----------------------------------
function MobilePostCard({
    post: initialPost,
    user,
    currentUserId,
    isSubscribed
}: {
    post: Post;
    user: any;
    currentUserId: string | null;
    isSubscribed?: boolean;
}) {
    const [post, setPost] = useState<Post>(initialPost);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [bookmarked, setBookmarked] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(isSubscribed || false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        setPost(initialPost);
    }, [initialPost]);

    useEffect(() => {
        if (isSubscribed) setIsUnlocked(true);
    }, [isSubscribed]);

    useEffect(() => {
        if (post.likes && post.likes[0]) setLikeCount(post.likes[0].count);
        if (post.comments && post.comments[0]) setCommentCount(post.comments[0].count);

        const checkStatus = async () => {
            if (!currentUserId) return;

            // Check if liked
            const { data: likeData } = await supabase
                .from('post_likes')
                .select('user_id')
                .eq('post_id', post.id)
                .eq('user_id', currentUserId)
                .single();
            if (likeData) setLiked(true);

            // Check if bookmarked
            const { data: bookmarkData } = await supabase
                .from('post_bookmarks')
                .select('id')
                .eq('post_id', post.id)
                .eq('user_id', currentUserId)
                .single();
            if (bookmarkData) setBookmarked(true);

            if (isSubscribed) return;

            // Check if unlocked (if paid)
            if (post.is_paid) {
                const { data: unlockData } = await supabase
                    .from('post_unlocks')
                    .select('id')
                    .eq('post_id', post.id)
                    .eq('user_id', currentUserId)
                    .single();
                if (unlockData) setIsUnlocked(true);
            }

            // Check subscription
            if (post.is_paid && !isUnlocked && !isSubscribed) {
                const { data: subData } = await supabase
                    .from('subscriptions')
                    .select('id')
                    .eq('user_id', currentUserId)
                    .eq('creator_id', post.user_id)
                    .eq('status', 'active')
                    .gt('current_period_end', new Date().toISOString())
                    .single();
                if (subData) setIsUnlocked(true);
            }
        };

        const fetchCounts = async () => {
            const { count: lCount } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
            if (lCount !== null) setLikeCount(lCount);

            const { count: cCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
            if (cCount !== null) setCommentCount(cCount);
        };

        checkStatus();
        fetchCounts();
    }, [post.id, currentUserId, post.is_paid, isSubscribed]);

    const handleLike = async () => {
        if (!currentUserId) {
            toast.error("Please log in to like posts");
            return;
        }
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

        try {
            if (newLiked) {
                await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId });
            } else {
                await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
            }
        } catch (error) {
            setLiked(!newLiked);
            setLikeCount(prev => !newLiked ? prev + 1 : Math.max(0, prev - 1));
            toast.error("Failed to update like");
        }
    };

    const handleBookmark = async () => {
        if (!currentUserId) {
            toast.error("Please log in to save posts");
            return;
        }
        const newBookmarked = !bookmarked;
        setBookmarked(newBookmarked);
        try {
            if (newBookmarked) {
                const { error } = await supabase.from('post_bookmarks').insert({ post_id: post.id, user_id: currentUserId });
                if (error) throw error;
                toast.success("Saved to collections");
            } else {
                const { error } = await supabase.from('post_bookmarks').delete().eq('post_id', post.id).eq('user_id', currentUserId);
                if (error) throw error;
            }
        } catch (err) {
            setBookmarked(!newBookmarked);
            toast.error("Failed to update bookmark");
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/post/${post.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleUnlock = () => {
        if (!currentUserId) {
            toast.error("Please login to unlock content");
            return;
        }
        setShowUnlockModal(true);
    };

    const isOwner = currentUserId === post.user_id;
    const canView = !post.is_paid || isOwner || isUnlocked;
    const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

    return (
        <div className="bg-[#0b0b12]/90 border border-white/[0.04] rounded-2xl p-4 flex flex-col gap-3 relative shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            <UnlockPostModal
                isOpen={showUnlockModal}
                onClose={() => setShowUnlockModal(false)}
                post={post}
                currentUserId={currentUserId}
                onUnlockSuccess={() => setIsUnlocked(true)}
            />
            <ReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                targetId={post.id}
                targetType="post"
            />
            
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href={`/profile/${user.id || post.user_id}`} className="flex items-center gap-3 active:opacity-75 transition-opacity">
                    <img 
                        src={user.avatar_url || "/creators/creator-1.jpg"} 
                        alt={user.username || "avatar"} 
                        className="w-9 h-9 rounded-full border border-white/20 object-cover shrink-0" 
                    />
                    <div className="min-w-0">
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5 flex-wrap">
                            <span>{user.full_name || user.username}</span>
                            {user.id && <UserBadgeDisplay userId={user.id} />}
                            {post.is_paid && (
                                <span className="bg-[#a259ff] text-white text-[7.5px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(162,89,255,0.4)]">
                                    PREMIUM
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">@{user.username} • {timeAgo}</div>
                    </div>
                </Link>
                
                <button 
                    onClick={() => setIsReportModalOpen(true)}
                    className="text-zinc-500 hover:text-white p-1"
                    title="Report post"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            {/* Content Container */}
            <div className="relative">
                {!canView ? (
                    // Locked premium post
                    <div className="flex flex-col gap-3">
                        {post.caption && (
                            <p className="text-zinc-300 text-xs leading-relaxed">{post.caption}</p>
                        )}
                        <div className="w-full relative aspect-[16/9] bg-gradient-to-b from-zinc-900/60 to-black/80 rounded-xl overflow-hidden border border-white/[0.05] flex flex-col items-center justify-center p-4 text-center">
                            <div className="absolute inset-0 opacity-15 bg-cover bg-center filter blur-md" style={{ backgroundImage: post.media_url ? `url(${post.media_url})` : undefined }} />
                            <div className="relative z-10 w-11 h-11 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                                <Lock className="w-5 h-5 text-pink-400" />
                            </div>
                            <span className="relative z-10 text-xs font-bold text-white mb-0.5">Premium Content</span>
                            <span className="relative z-10 text-[9px] text-zinc-400 mb-3">Unlock this post from @{user.username}</span>
                            <button
                                onClick={handleUnlock}
                                className="relative z-10 bg-gradient-to-r from-pink-500 to-purple-600 active:scale-95 transition-transform text-[10px] font-bold text-white px-5 py-2 rounded-full shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                            >
                                Unlock for {cs()}{post.price}
                            </button>
                        </div>
                    </div>
                ) : (
                    // Unlocked or standard post
                    <div className="flex gap-3 items-start justify-between">
                        {/* Caption text */}
                        <div className="flex-1 min-w-0 py-0.5">
                            {post.caption && (
                                <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                            )}
                        </div>

                        {/* Thumbnail image on the right */}
                        {post.media_url && post.content_type === 'image' && (
                            <div className="w-24 h-16 rounded-xl overflow-hidden border border-white/[0.08] shrink-0 shadow-md">
                                <img src={post.media_url} alt="content" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {post.media_url && post.content_type === 'video' && (
                            <div className="w-24 h-16 rounded-xl overflow-hidden border border-white/[0.08] shrink-0 bg-black relative flex items-center justify-center">
                                <video src={post.media_url} className="w-full h-full object-cover opacity-80" muted playsInline />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-5 pt-1 border-t border-white/[0.03]">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 transition-colors ${liked ? "text-pink-500" : "text-zinc-400 active:text-pink-500"}`}
                >
                    <Heart className={`w-4 h-4 ${liked ? "fill-current scale-110" : ""}`} />
                    <span className="text-[10px] font-medium">{likeCount}</span>
                </button>

                <CommentsModal
                    postId={post.id}
                    currentUserId={currentUserId}
                    onOpenChange={() => {}}
                    trigger={
                        <button className="flex items-center gap-1.5 text-zinc-400 active:text-blue-400">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-[10px] font-medium">{commentCount}</span>
                        </button>
                    }
                />

                <button onClick={handleShare} className="text-zinc-400 active:text-white">
                    <Share2 className="w-4 h-4" />
                </button>

                <button
                    onClick={handleBookmark}
                    className={`ml-auto ${bookmarked ? "text-yellow-400" : "text-zinc-400 active:text-yellow-400"}`}
                >
                    <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
                </button>
            </div>
        </div>
    );
}

// ---- Home Screen -----------------------------------------------------------
function HomeScreen({
    onEnterSuga4U,
    query,
    setQuery,
    rooms, // Received from parent
    posts, // New prop
    userId,
    subscribedCreatorIds,
    activeStatuses,
    levelFilter,
    setLevelFilter,
    tagFilter,
    setTagFilter,
    sortBy,
    setSortBy,
    iframeMenus = [],
    isMobileView,
}: {
    onEnterSuga4U: () => void;
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    rooms: any[];
    posts: Post[];
    userId?: string;
    subscribedCreatorIds: Set<string>;
    activeStatuses: Record<string, boolean>;
    levelFilter: "All" | "Rookie" | "Rising" | "Star" | "Elite";
    setLevelFilter: React.Dispatch<React.SetStateAction<"All" | "Rookie" | "Rising" | "Star" | "Elite">>;
    tagFilter: string;
    setTagFilter: React.Dispatch<React.SetStateAction<string>>;
    sortBy: "Recommended" | "Rookie→Elite" | "Elite→Rookie";
    setSortBy: React.Dispatch<React.SetStateAction<"Recommended" | "Rookie→Elite" | "Elite→Rookie">>;
    iframeMenus?: any[];
    isMobileView: boolean;
}) {
    const router = useRouter();
    const { logout } = useAuth();
    const [activeCat, setActiveCat] = useState("all");
    const casinoMenu = useMemo(() => iframeMenus.find(m => m.name.toLowerCase().includes("casino")), [iframeMenus]);
    const otherIframeMenus = useMemo(() => iframeMenus.filter(m => !m.name.toLowerCase().includes("casino")), [iframeMenus]);


    // Use fetched rooms (which include active creators seeded in DB)
    const dataSource: CreatorCard[] = rooms;

    // Filter logic
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        let rows = dataSource.filter((c) => {
            // Tag/Room filter
            if (tagFilter !== "All" && !c.tags.some(t => t.includes(tagFilter))) return false;
            // Level filter
            if (levelFilter !== "All" && c.level !== levelFilter) return false;
            // Search query
            if (q && ![c.name, c.level, ...c.tags].some((t) => t.toLowerCase().includes(q))) return false;
            return true;
        });

        // Sorting (mock logic mostly, preserved)
        const rank: Record<CreatorCard["level"], number> = { Rookie: 1, Rising: 2, Star: 3, Elite: 4 };
        // if (sortBy === ...)
        if (sortBy === "Rookie→Elite") {
            rows.sort((a, b) => rank[a.level] - rank[b.level]);
        } else if (sortBy === "Elite→Rookie") {
            rows.sort((a, b) => rank[b.level] - rank[a.level]);
        }
        // For "Recommended", we'd need actual recommendation logic, so it's left as is.

        return rows;
    }, [query, levelFilter, tagFilter, sortBy, rooms]);

    return (
        <div className="w-full mx-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Left rail (always-expanded categories) */}
                <NeonCard className="hidden lg:flex lg:w-48 shrink-0 relative overflow-hidden p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-112px)] lg:flex-col">
                    {/* ... (Keep existing Left Rail logic if desired, or simplify? I'll re-include the Navigation Logic safely) ... */}
                    {/* Pitch-black base; ambient smoke sits behind tiles */}
                    <div className="pointer-events-none absolute inset-0 opacity-55">
                        <div className="absolute -inset-12 blur-3xl bg-[radial-gradient(circle_at_25%_20%,rgba(255,0,200,0.30),transparent_55%),radial-gradient(circle_at_80%_35%,rgba(0,230,255,0.22),transparent_60%)]" />
                    </div>

                    <div className="relative space-y-6 lg:space-y-0 lg:flex lg:flex-col lg:justify-between lg:flex-1">
                        <div className="space-y-6">
                            <div data-tour={!isMobileView ? "rooms-menu" : undefined}>
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 mt-3 px-1">Browse Room</div>
                                <div className="mt-1 space-y-2">
                                    {CATS.filter((cat) => activeStatuses[cat.roomType] !== false).map((cat) => {
                                        const t = toneClasses(cat.tone);
                                        const isPrimary = !!cat.primary;
                                        return (
                                            <button
                                                key={cat.key}
                                                onClick={() => {
                                                    setActiveCat(cat.key);
                                                    router.push(cat.route);
                                                }}
                                                className={cx(
                                                    "w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55",
                                                    t.border,
                                                    t.glow,
                                                    t.hover,
                                                    isPrimary && "ring-1 ring-cyan-300/35",
                                                    activeCat === cat.key && "neon-pulse"
                                                )}
                                                {...(cat.dataTour ? { 'data-tour': cat.dataTour } : {})}
                                            >
                                                <span
                                                    className={cx(
                                                        "inline-flex items-center gap-2 w-full justify-between",
                                                        t.text + " neon-flicker",
                                                        isPrimary && "animate-pulse"
                                                    )}
                                                >
                                                    <span className="inline-flex items-center gap-2">
                                                        <span className={t.icon}>
                                                            {typeof cat.icon === 'string' ? (
                                                                <img src={cat.icon} alt="" className="w-4 h-4 object-contain shrink-0" />
                                                            ) : (
                                                                cat.icon
                                                            )}
                                                        </span>
                                                        <span className="truncate neon-deep">{cat.label}</span>
                                                    </span>
                                                    {cat.comingSoon && (
                                                        <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded bg-gray-700/80 text-gray-300 font-medium uppercase tracking-wide">Soon</span>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {/* Separated Featured Apps Section */}
                                    {otherIframeMenus.length > 0 && (
                                        <div className="pt-2 mt-2 border-t border-white/5 space-y-2">
                                            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1 flex items-center gap-1.5">
                                                Featured Apps
                                            </div>
                                            {otherIframeMenus.map((menu) => {
                                                const t = toneClasses(menu.color);
                                                return (
                                                    <button
                                                        key={menu.id}
                                                        onClick={() => {
                                                            setActiveCat(menu.id);
                                                            router.push(`/iframe/${menu.id}`);
                                                        }}
                                                        className={cx(
                                                            "w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55 cursor-pointer",
                                                            t.border,
                                                            t.glow,
                                                            t.hover,
                                                            activeCat === menu.id && "neon-pulse animate-pulse"
                                                        )}
                                                    >
                                                        <span
                                                            className={cx(
                                                                "inline-flex items-center gap-2 w-full justify-between",
                                                                t.text + " neon-flicker"
                                                            )}
                                                        >
                                                            <span className="inline-flex items-center gap-2">
                                                                <span className={t.icon}>
                                                                    <DynamicIcon name={menu.icon} className="w-4 h-4" />
                                                                </span>
                                                                <span className="truncate neon-deep">{menu.name}</span>
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Standalone Casino Button in the middle */}
                                    {casinoMenu && (
                                        <div className="py-3 my-2 border-t border-b border-white/5">
                                            <button
                                                onClick={() => {
                                                    setActiveCat(casinoMenu.id);
                                                    router.push(`/iframe/${casinoMenu.id}`);
                                                }}
                                                className={cx(
                                                    "w-full text-left px-4 py-3 rounded-2xl border text-base transition duration-300 relative overflow-hidden group cursor-pointer",
                                                    activeCat === casinoMenu.id
                                                        ? "bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border-yellow-400 shadow-[0_0_22px_rgba(234,179,8,0.65)]"
                                                        : "bg-black/75 border-yellow-600/30 hover:border-yellow-400 hover:shadow-[0_0_18px_rgba(234,179,8,0.45)] hover:bg-yellow-950/10"
                                                )}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                <span className="relative z-10 flex items-center gap-3 w-full justify-between">
                                                    <span className="flex items-center gap-3 font-bold text-yellow-300 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">
                                                        <span className="p-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-400/20">
                                                            <Dices className="w-4 h-4" />
                                                        </span>
                                                        <span className="tracking-wide text-yellow-200 group-hover:text-yellow-100 transition-colors uppercase font-black text-sm">
                                                            {casinoMenu.name}
                                                        </span>
                                                    </span>
                                                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 font-bold uppercase tracking-wider animate-pulse">
                                                        VIP
                                                    </span>
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {activeStatuses["competition"] !== false && (
                                <div className="mt-2 mb-4">
                                    <button
                                        onClick={() => router.push("/coming-soon")}
                                        className={cx(
                                            "w-full text-left px-3 py-3 rounded-xl border text-sm transition relative overflow-hidden group flex items-center justify-between",
                                            "bg-black/80 border-yellow-500/90 hover:bg-yellow-500/10 shadow-[0_0_18px_rgba(234,179,8,0.85),0_0_60px_rgba(234,179,8,0.45)] hover:shadow-[0_0_26px_rgba(234,179,8,0.95),0_0_90px_rgba(234,179,8,0.65)]"
                                        )}
                                    >
                                        <span className="relative z-10 inline-flex items-center gap-2 font-semibold tracking-wide text-yellow-300 group-hover:text-yellow-200 transition-colors">
                                            <Trophy className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                                            Competition
                                        </span>
                                        <span className="relative z-10 text-[8px] px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/40 text-yellow-300 font-bold uppercase tracking-wider animate-pulse">
                                            Coming Soon
                                        </span>

                                        {/* Subtle internal glow */}
                                        <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors pointer-events-none" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Bottom Section: Account Quick Menu */}
                        <div className="pt-4 border-t border-white/10 lg:mt-auto">
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">My Account</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-1 gap-2">
                                <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/collections")} data-tour={!isMobileView ? "collections-button" : undefined}>
                                    <Star className="w-4 h-4" /> Collections
                                </button>
                                <button className="w-full rounded-xl border border-emerald-500/50 bg-black px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/suggestions")} data-tour={!isMobileView ? "suggestions-button" : undefined}>
                                    <MessageSquare className="w-4 h-4" /> Suggestions
                                </button>
                                <button className="w-full rounded-xl border border-blue-500/50 bg-black px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/subscription")} data-tour={!isMobileView ? "subscriptions-button" : undefined}>
                                    <Users className="w-4 h-4" /> Subscriptions
                                </button>
                                <button className="w-full rounded-xl border border-pink-500/50 bg-black px-3 py-2 text-sm text-pink-200 hover:bg-pink-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/newsfeed")} data-tour={!isMobileView ? "newsfeed-button" : undefined}>
                                    <Flame className="w-4 h-4 text-pink-400" /> NewsFeed
                                </button>
                                <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition" title="Log Out" onClick={logout}>
                                    <LogOut className="w-4 h-4" /> Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </NeonCard>

                {/* Main grid */}
                <div className="flex-1 min-w-0">

                    {/* Mobile Horizontal Rooms Swipe List Removed */}

                    <div className="hidden md:flex flex-col gap-3 mb-4">
                        {/* Mobile Search Input */}
                        <div className="md:hidden w-full">
                            <div className="flex items-center gap-2 rounded-2xl border border-pink-500/20 bg-black/35 px-4 py-3">
                                <Search className="w-4 h-4 text-pink-300" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="bg-transparent outline-none text-sm w-full text-white placeholder-gray-500"
                                    placeholder="Search creators…"
                                />
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Creator Level</div>
                                <select
                                    value={levelFilter}
                                    onChange={(e) => setLevelFilter(e.target.value as any)}
                                    className="w-full bg-black/40 border border-pink-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="All">All Tiers</option>
                                    <option value="Rookie">Rookie</option>
                                    <option value="Rising">Rising</option>
                                    <option value="Star">Star</option>
                                    <option value="Elite">Elite</option>
                                </select>
                            </div>

                            <div className="rounded-2xl border border-blue-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Room / Category</div>
                                <select
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    className="w-full bg-black/40 border border-blue-500/25 rounded-xl px-3 py-2 text-sm text-gray-200"
                                >
                                    <option value="All">All Types</option>
                                    {activeStatuses["flash-drop"] !== false && <option value="Flash Drops">Flash Drops</option>}
                                    {activeStatuses["confessions"] !== false && <option value="Confessions">Confessions</option>}
                                    {activeStatuses["bar-lounge"] !== false && <option value="Bar Lounge">Bar Lounge</option>}
                                    {activeStatuses["truth-or-dare"] !== false && <option value="Truth or Dare">Truth or Dare</option>}
                                    {activeStatuses["suga-4-u"] !== false && <option value="Suga 4 U">Suga 4 U</option>}
                                    {activeStatuses["x-chat"] !== false && <option value="X Chat">X Chat</option>}
                                </select>
                            </div>

                            <div className="rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Sort</div>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="w-full bg-black/40 border border-pink-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="Recommended">Recommended</option>
                                    <option value="Rookie→Elite">Rookie → Elite</option>
                                    <option value="Elite→Rookie">Elite → Rookie</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Creator tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {filtered.map((c) => (
                            <CreatorTile
                                key={c.id}
                                creator={c}
                                onOpen={() => {
                                    // Use userId if available for profile redirect
                                    if (c.userId) {
                                        router.push("/profile/" + c.userId);
                                    } else if (c.tags.includes("Suga 4 U")) {
                                        onEnterSuga4U();
                                    } else {
                                        router.push("/room/" + c.id);
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>
                {/* Right rail (Cleaned) – Auto-scrolling Creator Feed */}
                <NeonCard className="w-full lg:w-96 shrink-0 p-4 lg:sticky lg:top-6" data-tour={!isMobileView ? "creator-feed" : undefined}>
                    <div className="text-pink-200 text-sm mb-3 font-semibold flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500 fill-pink-500/20" /> Featured Creators
                    </div>

                    {posts.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 text-sm">
                            No recent updates.
                        </div>
                    ) : (
                        <>
                            <style>{`
                                @keyframes creatorFeedScroll {
                                    0% { transform: translateY(0); }
                                    100% { transform: translateY(-50%); }
                                }
                                .creator-feed-scroll-viewport {
                                    overflow: hidden;
                                    max-height: 380px; /* Limit height on mobile */
                                    position: relative;
                                }
                                @media (min-width: 1024px) {
                                    .creator-feed-scroll-viewport {
                                        max-height: 78vh; /* Revert to full tall height on desktop */
                                    }
                                }
                                .creator-feed-scroll-viewport::before,
                                .creator-feed-scroll-viewport::after {
                                    content: '';
                                    position: absolute;
                                    left: 0;
                                    right: 0;
                                    height: 28px;
                                    z-index: 2;
                                    pointer-events: none;
                                }
                                .creator-feed-scroll-viewport::before {
                                    top: 0;
                                    background: linear-gradient(to bottom, black, transparent);
                                }
                                .creator-feed-scroll-viewport::after {
                                    bottom: 0;
                                    background: linear-gradient(to top, black, transparent);
                                }
                                .creator-feed-scroll-track {
                                    display: flex;
                                    flex-direction: column;
                                    gap: 1rem;
                                    animation: creatorFeedScroll 60s linear infinite;
                                }
                                .creator-feed-scroll-viewport:hover .creator-feed-scroll-track {
                                    animation-play-state: paused;
                                }
                            `}</style>
                            <div className="creator-feed-scroll-viewport">
                                <div className="creator-feed-scroll-track">
                                    {/* Render posts twice for seamless infinite loop */}
                                    {[...posts, ...posts].map((post, idx) => (
                                        <PostCard
                                            key={`${post.id}-feed-${idx}`}
                                            post={post as any}
                                            user={post.profiles as any}
                                            currentUserId={userId || null}
                                            isSubscribed={post.user_id ? subscribedCreatorIds.has(post.user_id) : false}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </NeonCard>
            </div>
        </div >
    );
}

// ---- App shell -------------------------------------------------------------
export default function Home() {
    const router = useRouter();
    const { role, isLoading: authLoading, user, logout } = useAuth();
    const { startTour } = useGuidedTour();
    const [rooms, setRooms] = useState<any[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [iframeMenus, setIframeMenus] = useState<any[]>([]);
    const casinoMenu = useMemo(() => iframeMenus.find(m => m.name.toLowerCase().includes("casino")), [iframeMenus]);
    const otherIframeMenus = useMemo(() => iframeMenus.filter(m => !m.name.toLowerCase().includes("casino")), [iframeMenus]);

    const [currentProfile, setCurrentProfile] = useState<{ username: string | null, full_name: string | null, avatar_url: string | null, fan_membership_id?: string | null } | null>(null);
    const [userAccountType, setUserAccountType] = useState<{ display_name: string, badge_icon: string, badge_color: string, badge_icon_url?: string | null } | null>(null);
    const [membershipPlan, setMembershipPlan] = useState<{ display_name: string, badge_color: string, name: string, badge_icon_url?: string | null } | null>(null);
    const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(new Set());
    const supabase = createClient();
    const [isMobileView, setIsMobileView] = useState(false);

    // Detect screen size for tour alignment
    useEffect(() => {
        const check = () => setIsMobileView(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // Redirect creators to dashboard
    useEffect(() => {
        if (!authLoading && role === "creator") {
            router.push("/rooms/creator-studio");
        }
    }, [role, authLoading, router]);

    // Fetch active rooms and posts
    useEffect(() => {
        const fetchContent = async () => {
            try {
                // Fetch rooms joined with host profile
                // Explicitly specifying !host_id to avoid ambiguous relationship errors
                // Fetch ALL creators (not just live rooms)
                // 1. Fetch creators with stats (RPC)
                // This single query returns profile, post count, and latest media
                const { data: creatorsData, error: creatorsError } = await supabase
                    .rpc('get_creators_with_stats');

                if (creatorsError) {
                    if (creatorsError.message?.includes('AbortError') || (creatorsError as any).name === 'AbortError') {
                        // ignore
                    } else {
                        console.error("Error fetching creators:", creatorsError);
                    }
                    // fallback to activeCreators if DB fails
                    setRooms(activeCreators);
                } else if (creatorsData && creatorsData.length > 0) {
                    const calculateLevel = (count: number): "Rookie" | "Rising" | "Star" | "Elite" => {
                        if (count >= 20) return "Elite";
                        if (count >= 10) return "Star";
                        if (count >= 3) return "Rising";
                        return "Rookie";
                    };

                    const mapped: CreatorCard[] = (creatorsData as any[]).map((c) => {
                        return {
                            id: c.id,
                            userId: c.id,
                            name: c.username || "Unknown Creator",
                            level: calculateLevel(c.post_count || 0),
                            // Use tags from DB if available, else fallback
                            tags: (c.tags && c.tags.length > 0) ? c.tags : ["General"],
                            avatar_url: c.avatar_url,
                            cover_url: c.cover_url || c.latest_media_url || c.latest_thumbnail_url || null,
                            bio: c.bio || ""
                        };
                    });

                    // We now have the real data which includes the active creators we seeded.
                    // No need to merge static data unless we want to guarantee they are there 
                    // even if the seed failed (which it didn't).
                    // However, to be safe and avoid duplicates if seeded data exists,
                    // we should just use the fetched data.
                    setRooms(mapped);

                } else {
                    // DB empty? Fallback.
                    setRooms(activeCreators);
                }

                // 2. Fetch Posts (Creator Feed)
                // 2. Fetch Posts (Creator Feed)
                // Filter to ONLY show posts from users with 'creator' role using !inner join
                // AND only show posts with visual content (media_url is not null)
                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*, profiles!user_id!inner(id, username, avatar_url, role)')
                    .eq('profiles.role', 'creator')
                    .not('media_url', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (postsError) {
                    if (postsError.message?.includes('AbortError') || (postsError as any).name === 'AbortError') {
                        // ignore
                    } else {
                        console.error("Error fetching posts:", postsError);
                    }
                } else {
                    setPosts(postsData as unknown as Post[]);
                }

            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                console.error("Error fetching content:", err);
            } finally {
                setLoadingRooms(false);
            }
        };

        fetchContent();

        // Realtime subscription
        const channel = supabase
            .channel('public:content')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchContent())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchContent())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Fetch current user profile and subscriptions
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                // Fetch profile data (without account_types join to avoid PGRST201 ambiguous FK error)
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('username, full_name, avatar_url, fan_membership_id, account_type_id, is_creator')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    console.error("[Home] Profile fetch error:", profileError);
                }

                if (profileData) {
                    setCurrentProfile(profileData);

                    // Fetch account type separately using account_type_id
                    if ((profileData as any).account_type_id) {
                        const { data: atData, error: atError } = await supabase
                            .from('account_types')
                            .select('display_name, badge_icon, badge_color, badge_icon_url')
                            .eq('id', (profileData as any).account_type_id)
                            .single();
                        if (atError) {
                            console.error("[Home] Account type fetch error:", atError);
                        }
                        if (atData && atData.display_name) {
                            setUserAccountType(atData as any);
                        }
                    }

                    // Fetch membership tier if exists
                    if (profileData.fan_membership_id) {
                        const { data: planData, error: planError } = await supabase
                            .from('fan_membership_plans')
                            .select('name, display_name, badge_color, badge_icon_url')
                            .eq('id', profileData.fan_membership_id)
                            .single();

                        if (planError) {
                            console.error("[Home] Membership plan fetch error:", planError);
                        }

                        if (planData?.name) {
                            const tierName = planData.name.charAt(0).toUpperCase() + planData.name.slice(1).toLowerCase();
                            setFanTier(tierName as BadgeTier);
                            setMembershipPlan(planData as any);
                        }
                    }
                }

                // Subscriptions
                const { data: subData } = await supabase
                    .from('subscriptions')
                    .select('creator_id')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .gt('current_period_end', new Date().toISOString());

                if (subData) {
                    setSubscribedCreatorIds(new Set(subData.map(s => s.creator_id)));
                }
            } catch (err: any) {
                if (err?.name === 'AbortError') return;
                console.error("Error fetching user data:", err);
            }
        };
        fetchUserData();
    }, [user]);

    useEffect(() => {
        const fetchIframeMenus = async () => {
            const { data, error } = await supabase
                .from("iframe_menus")
                .select("*")
                .order("created_at", { ascending: true });
            if (!error && data) {
                setIframeMenus(data.filter(m => m.target_role === "fan" || m.target_role === "both"));
            }
        };
        fetchIframeMenus();

        const channel = supabase
            .channel("realtime-home-iframe-menus")
            .on("postgres_changes", { event: "*", schema: "public", table: "iframe_menus" }, () => {
                fetchIframeMenus();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const [homeQuery, setHomeQuery] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [levelFilter, setLevelFilter] = useState<"All" | "Rookie" | "Rising" | "Star" | "Elite">("All");
    const [tagFilter, setTagFilter] = useState<string>("All"); // Renamed for clarity in UI
    const [sortBy, setSortBy] = useState<"Recommended" | "Rookie→Elite" | "Elite→Rookie">("Recommended");
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const { roomSettings: activeStatuses } = useTheme();

    // NOTE: no fan-tier selector on Home per requirements; retained for Suga4U preview behavior.
    const [fanTier, setFanTier] = useState<BadgeTier>("Bronze");

    // Filter logic removed (moved to HomeScreen)


    // Greeting / top-bar personalization (preview)
    const firstName = role === "creator"
        ? "Creator"
        : (currentProfile?.full_name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || currentProfile?.username || user?.user_metadata?.username || "Fan");
    const [revealWelcome, setRevealWelcome] = useState(false);
    useEffect(() => {
        const t = window.setTimeout(() => setRevealWelcome(true), 120);
        return () => window.clearTimeout(t);
    }, []);

    const showTierBadge = role !== "creator";
    const tierLabel = fanTier === "VIP" ? "VIP" : fanTier;

    if (authLoading) return null; // Or a loading spinner

    // ---- Creator Dashboard View --------------------------------------------
    if (role === "creator") {
        return null; // Redirecting...
    }



    return (
        <div className="min-h-screen bg-black text-white">
            <style>{`
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; filter: saturate(1.55) contrast(1.06); }
          42% { opacity: 0.95; }
          43% { opacity: 0.78; }
          44% { opacity: 1; }
          68% { opacity: 0.93; }
          69% { opacity: 0.72; }
          70% { opacity: 0.99; }
        }
        @keyframes neonPulse {
          0%, 100% { transform: translateZ(0) scale(1); }
          50% { transform: translateZ(0) scale(1.02); }
        }
        @keyframes smokeDrift {
          0% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .20; }
          50% { transform: translate3d(4%, 3%, 0) scale(1.10); opacity: .34; }
          100% { transform: translate3d(-6%, -2%, 0) scale(1); opacity: .20; }
        }

        /* Neon handwriting reveal */
        @keyframes writeReveal {
          0% { clip-path: inset(0 100% 0 0); opacity: 0.2; }
          15% { opacity: 1; }
          100% { clip-path: inset(0 0 0 0); opacity: 1; }
        }
        @keyframes writeCaret {
          0%, 45% { opacity: 1; }
          46%, 100% { opacity: 0; }
        }

        .neon-flicker { animation: neonFlicker 7.5s infinite; }
        .neon-pulse { animation: neonPulse 2.2s ease-in-out infinite; }
        .neon-deep { filter: saturate(1.65) contrast(1.08); }

        .neon-write {
          position: relative;
          display: inline-block;
          clip-path: inset(0 100% 0 0);
          animation: writeReveal 1.1s ease-out forwards;
        }
        .neon-write::after {
          content: "";
          position: absolute;
          right: -8px;
          top: 50%;
          width: 10px;
          height: 10px;
          transform: translateY(-50%);
          border-radius: 999px;
          background: rgba(255, 0, 200, 0.95);
          box-shadow: 0 0 18px rgba(255,0,200,1), 0 0 54px rgba(255,0,200,0.55);
          animation: writeCaret 1.1s ease-out forwards;
        }
        .neon-write-stroke {
          color: rgba(255, 0, 200, 0.92);
          text-shadow:
            0 0 10px rgba(255,0,200,0.95),
            0 0 26px rgba(255,0,200,0.75),
            0 0 62px rgba(0,230,255,0.25);
          filter: saturate(1.7) contrast(1.15);
        }
        .vip-glow {
          box-shadow:
            0 0 16px rgba(255, 215, 0, 0.55),
            0 0 44px rgba(255, 215, 0, 0.28),
            0 0 22px rgba(255, 0, 200, 0.22);
        }
        .neon-smoke {
          pointer-events: none;
          position: absolute;
          inset: -46px;
          filter: blur(18px);
          background:
            radial-gradient(circle at 18% 20%, rgba(255,0,200,.26), transparent 55%),
            radial-gradient(circle at 74% 38%, rgba(0,230,255,.22), transparent 60%),
            radial-gradient(circle at 35% 82%, rgba(0,255,170,.14), transparent 58%),
            radial-gradient(circle at 85% 85%, rgba(170,80,255,.18), transparent 58%),
            radial-gradient(circle at 58% 62%, rgba(200,255,0,.10), transparent 56%);
          mix-blend-mode: screen;
          animation: smokeDrift 9s ease-in-out infinite;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Mobile specific logo styles */
        .logo-playground-font {
          font-family: 'Pacifico', 'Brush Script MT', 'Apple Chancery', 'Segoe UI', cursive;
          font-style: italic;
          color: #ec4899;
          text-shadow: 0 0 10px rgba(236, 72, 153, 0.75), 0 0 22px rgba(236, 72, 153, 0.35);
        }
        .logo-x-font {
          font-family: var(--font-outfit), sans-serif;
          font-weight: 900;
          color: #06b6d4;
          text-shadow: 0 0 10px rgba(6, 182, 212, 0.75), 0 0 22px rgba(6, 182, 212, 0.35);
        }
      `}</style>

            {/* Dynamic Welcome Popup for Fans */}
            <WelcomePopup role="fan" />

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.7 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                        {/* Drawer body */}
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-64 bg-zinc-950/95 border-r border-pink-500/25 z-50 p-5 flex flex-col justify-between overflow-y-auto"
                        >
                            <div className="space-y-6">
                                {/* Header of Drawer */}
                                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                    <Logo onClick={() => { setIsSidebarOpen(false); router.push("/"); }} />
                                    <button
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Room Categories list */}
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">Browse Room</div>
                                    <div className="space-y-2">
                                        {CATS.filter((cat) => activeStatuses[cat.roomType] !== false).map((cat) => {
                                            const t = toneClasses(cat.tone);
                                            const isPrimary = !!cat.primary;
                                            return (
                                                <button
                                                    key={`drawer-${cat.key}`}
                                                    onClick={() => {
                                                        setIsSidebarOpen(false);
                                                        router.push(cat.route);
                                                    }}
                                                    className={cx(
                                                        "w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55",
                                                        t.border,
                                                        t.glow,
                                                        t.hover,
                                                        isPrimary && "ring-1 ring-cyan-300/35"
                                                    )}
                                                >
                                                    <span
                                                        className={cx(
                                                            "inline-flex items-center gap-2 w-full justify-between",
                                                            t.text + " neon-flicker",
                                                            isPrimary && "animate-pulse"
                                                        )}
                                                    >
                                                        <span className="inline-flex items-center gap-2">
                                                            <span className={t.icon}>
                                                                {typeof cat.icon === 'string' ? (
                                                                    <img src={cat.icon} alt="" className="w-4 h-4 object-contain shrink-0" />
                                                                ) : (
                                                                    cat.icon
                                                                )}
                                                            </span>
                                                            <span className="truncate neon-deep">{cat.label}</span>
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {/* Separated Featured Apps Section */}
                                        {otherIframeMenus.length > 0 && (
                                            <div className="pt-2 mt-2 border-t border-white/5 space-y-2">
                                                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
                                                    Featured Apps
                                                </div>
                                                {otherIframeMenus.map((menu) => {
                                                    const t = toneClasses(menu.color);
                                                    return (
                                                        <button
                                                            key={`drawer-${menu.id}`}
                                                            onClick={() => {
                                                                setIsSidebarOpen(false);
                                                                router.push(`/iframe/${menu.id}`);
                                                            }}
                                                            className={cx(
                                                                "w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55 cursor-pointer",
                                                                t.border,
                                                                t.glow,
                                                                t.hover
                                                            )}
                                                        >
                                                            <span className={cx("inline-flex items-center gap-2 w-full justify-between neon-flicker", t.text)}>
                                                                <span className="inline-flex items-center gap-2">
                                                                    <DynamicIcon name={menu.icon} className="w-4 h-4" />
                                                                    <span className="truncate neon-deep">{menu.name}</span>
                                                                </span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Standalone Casino Button in the middle */}
                                        {casinoMenu && (
                                            <div className="py-3 my-2 border-t border-b border-white/5">
                                                <button
                                                    onClick={() => {
                                                        setIsSidebarOpen(false);
                                                        router.push(`/iframe/${casinoMenu.id}`);
                                                    }}
                                                    className={cx(
                                                        "w-full text-left px-4 py-3 rounded-2xl border text-base transition duration-300 relative overflow-hidden group cursor-pointer border-yellow-600/30 shadow-[0_0_12px_rgba(234,179,8,0.2)]"
                                                    )}
                                                >
                                                    <span className="relative z-10 flex items-center gap-3 w-full justify-between">
                                                        <span className="flex items-center gap-3 font-bold text-yellow-300">
                                                            <Dices className="w-4 h-4 text-yellow-400" />
                                                            <span className="tracking-wide text-yellow-200 uppercase font-black text-sm">
                                                                {casinoMenu.name}
                                                            </span>
                                                        </span>
                                                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 font-bold uppercase tracking-wider animate-pulse">
                                                            VIP
                                                        </span>
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Account section in Drawer */}
                            <div className="pt-4 border-t border-white/10 mt-auto">
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">My Account</div>
                                <div className="space-y-2">
                                    <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition" onClick={() => { setIsSidebarOpen(false); router.push("/account/collections"); }}>
                                        <Star className="w-4 h-4" /> Collections
                                    </button>
                                    <button className="w-full rounded-xl border border-emerald-500/50 bg-black px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => { setIsSidebarOpen(false); router.push("/account/suggestions"); }}>
                                        <MessageSquare className="w-4 h-4" /> Suggestions
                                    </button>
                                    <button className="w-full rounded-xl border border-blue-500/50 bg-black px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => { setIsSidebarOpen(false); router.push("/account/subscription"); }}>
                                        <Users className="w-4 h-4" /> Subscriptions
                                    </button>
                                    <button className="w-full rounded-xl border border-pink-500/50 bg-black px-3 py-2 text-sm text-pink-200 hover:bg-pink-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => { setIsSidebarOpen(false); router.push("/newsfeed"); }}>
                                        <Flame className="w-4 h-4 text-pink-400" /> NewsFeed
                                    </button>
                                    <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition" onClick={() => { setIsSidebarOpen(false); logout(); }}>
                                        <LogOut className="w-4 h-4" /> Log Out
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* 1. DESKTOP/LAPTOP LAYOUT */}
            <div className="hidden md:block">

                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-pink-500/20 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-6">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition"
                            title="Open menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <Logo onClick={() => router.push("/")} />

                        {/* Animated neon handwriting welcome (reveals on load) */}
                        <div
                            className={cx("hidden md:flex items-center gap-3", revealWelcome ? "" : "opacity-0")}
                            data-tour={!isMobileView ? "membership-badge" : undefined}
                        >
                            <div
                                className={cx(
                                    "text-sm",
                                    "neon-write",
                                    "drop-shadow-[0_0_44px_rgba(255,0,200,0.95)]"
                                )}
                                aria-label={`Welcome ${firstName}`}
                            >
                                <span className="neon-write-stroke">Welcome</span>
                                <span className="mx-2" />
                                <span className="font-semibold neon-write-stroke">{firstName}</span>
                            </div>

                            {/* Membership Plan Badge - Icon Only */}
                            {showTierBadge && (
                                <button
                                    onClick={() => router.push('/account/membership')}
                                    className={cx(
                                        "inline-flex items-center justify-center w-8 h-8 rounded-full border cursor-pointer",
                                        "transition-all duration-300 hover:scale-110 overflow-hidden",
                                        membershipPlan
                                            ? ""
                                            : cx(fanTierClasses(fanTier), fanTierBg(fanTier)),
                                        "vip-glow"
                                    )}
                                    style={membershipPlan ? {
                                        backgroundColor: `${membershipPlan.badge_color}20`,
                                        color: membershipPlan.badge_color,
                                        borderColor: `${membershipPlan.badge_color}50`,
                                        boxShadow: `0 0 14px ${membershipPlan.badge_color}40, 0 0 40px ${membershipPlan.badge_color}15`
                                    } : undefined}
                                    title={`Membership: ${membershipPlan?.display_name || tierLabel}`}
                                >
                                    {membershipPlan?.badge_icon_url ? (
                                        <img src={membershipPlan.badge_icon_url} alt={membershipPlan.display_name} className="w-5 h-5 object-contain" />
                                    ) : membershipPlan ? (
                                        <span className="text-sm">{({ bronze: "🥉", silver: "🥈", gold: "🥇" } as any)[membershipPlan.name] || "⭐"}</span>
                                    ) : (
                                        <Crown className="w-4 h-4" />
                                    )}
                                </button>
                            )}

                            {/* Account Type Badge - Icon Only */}
                            {userAccountType && (
                                <button
                                    onClick={() => router.push('/account/membership')}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border cursor-pointer transition-all duration-300 hover:scale-110 overflow-hidden"
                                    style={{
                                        backgroundColor: `${userAccountType.badge_color || '#ec4899'}20`,
                                        borderColor: `${userAccountType.badge_color || '#ec4899'}50`,
                                        boxShadow: `0 0 14px ${userAccountType.badge_color || '#ec4899'}40, 0 0 40px ${userAccountType.badge_color || '#ec4899'}15`
                                    }}
                                    title={`Account Type: ${userAccountType.display_name}`}
                                >
                                    {userAccountType.badge_icon_url ? (
                                        <img src={userAccountType.badge_icon_url} alt={userAccountType.display_name} className="w-5 h-5 object-contain" />
                                    ) : (
                                        <span className="text-sm">{userAccountType.badge_icon || '✨'}</span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Launch Timer Countdown in top middle */}
                    <div className="order-3 md:order-2 w-full md:w-auto flex justify-center">
                        <LaunchTimer />
                    </div>

                    {/* Top-right: Search + My Profile only */}
                    <div className="order-2 md:order-3 flex items-center gap-1.5 sm:gap-3">
                        <div className="hidden md:flex items-center gap-2 rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2" data-tour={!isMobileView ? "search-creators" : undefined}>
                            <Search className="w-4 h-4 text-pink-300" />
                            <input
                                value={homeQuery}
                                onChange={(e) => setHomeQuery(e.target.value)}
                                className="bg-transparent outline-none text-sm w-44"
                                placeholder="Search creators…"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-3">
                            {/* Mobile Search/Filter Toggle */}
                            <button
                                onClick={() => setIsMobileFiltersOpen(prev => !prev)}
                                className={cx(
                                    "md:hidden p-2 rounded-lg transition-all duration-200 flex items-center justify-center relative",
                                    isMobileFiltersOpen
                                        ? "bg-pink-500 text-white border border-pink-400"
                                        : "bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20"
                                )}
                                title="Search & Filters"
                            >
                                <Search className="w-5 h-5" />
                                {!isMobileFiltersOpen && (homeQuery || levelFilter !== "All" || tagFilter !== "All" || sortBy !== "Recommended") && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-black animate-pulse" />
                                )}
                            </button>
                            <button
                                onClick={() => startTour('fan')}
                                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition"
                                title="Restart Fan Tour"
                                data-tour={!isMobileView ? "tour-button" : undefined}
                            >
                                <HelpCircle className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => router.push('/account/messages')}
                                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition"
                                title="Messages"
                                data-tour={!isMobileView ? "private-chat" : undefined}
                            >
                                <MessageSquare className="w-5 h-5" />
                            </button>
                            <NotificationIcon role="fan" />
                            <button
                                onClick={() => router.push('/account/subscription')}
                                className="hidden md:flex p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 transition"
                                title="Subscription"
                                data-tour={!isMobileView ? "subscription-section" : undefined}
                            >
                                <Crown className="w-5 h-5" />
                            </button>
                            <ProfileMenu
                                user={user}
                                profile={currentProfile}
                                role={role}
                                router={router}
                                onSignOut={logout}
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile Search & Filter Panel */}
                <AnimatePresence>
                    {isMobileFiltersOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="md:hidden w-full border-b border-pink-500/20 bg-zinc-950/95 backdrop-blur-md px-4 py-3.5 space-y-3 overflow-hidden"
                        >
                            {/* Search Bar */}
                            <div className="relative flex items-center w-full rounded-xl border border-pink-500/20 bg-black/45 px-3 py-2">
                                <Search className="w-4 h-4 text-pink-400 shrink-0 mr-2" />
                                <input
                                    value={homeQuery}
                                    onChange={(e) => setHomeQuery(e.target.value)}
                                    className="bg-transparent outline-none text-sm w-full text-white placeholder-zinc-500"
                                    placeholder="Search creators…"
                                />
                                {homeQuery && (
                                    <button
                                        onClick={() => setHomeQuery("")}
                                        className="p-1 text-zinc-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Filters Grid */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider pl-1">Level</span>
                                    <select
                                        value={levelFilter}
                                        onChange={(e) => setLevelFilter(e.target.value as any)}
                                        className="w-full bg-black/50 border border-pink-500/20 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-pink-500/40"
                                    >
                                        <option value="All">All Tiers</option>
                                        <option value="Rookie">Rookie</option>
                                        <option value="Rising">Rising</option>
                                        <option value="Star">Star</option>
                                        <option value="Elite">Elite</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider pl-1">Type</span>
                                    <select
                                        value={tagFilter}
                                        onChange={(e) => setTagFilter(e.target.value)}
                                        className="w-full bg-black/50 border border-blue-500/20 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500/40"
                                    >
                                        <option value="All">All Types</option>
                                        {activeStatuses["flash-drop"] !== false && <option value="Flash Drops">Flash Drops</option>}
                                        {activeStatuses["confessions"] !== false && <option value="Confessions">Confessions</option>}
                                        {activeStatuses["bar-lounge"] !== false && <option value="Bar Lounge">Bar Lounge</option>}
                                        {activeStatuses["truth-or-dare"] !== false && <option value="Truth or Dare">Truth or Dare</option>}
                                        {activeStatuses["suga-4-u"] !== false && <option value="Suga 4 U">Suga 4 U</option>}
                                        {activeStatuses["x-chat"] !== false && <option value="X Chat">X Chat</option>}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider pl-1">Sort</span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="w-full bg-black/50 border border-pink-500/20 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-pink-500/40"
                                    >
                                        <option value="Recommended">Recommended</option>
                                        <option value="Rookie→Elite">Rookie → Elite</option>
                                        <option value="Elite→Rookie">Elite → Rookie</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <HomeScreen
                    onEnterSuga4U={() => setLevelFilter("Elite")}
                    query={homeQuery}
                    setQuery={setHomeQuery}
                    rooms={rooms}
                    posts={posts}
                    userId={user?.id}
                    subscribedCreatorIds={subscribedCreatorIds}
                    activeStatuses={activeStatuses}
                    levelFilter={levelFilter}
                    setLevelFilter={setLevelFilter}
                    tagFilter={tagFilter}
                    setTagFilter={setTagFilter}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    iframeMenus={iframeMenus}
                    isMobileView={isMobileView}
                />
            </div>

            {/* 2. REDESIGNED MOBILE EXPERIENCE */}
            <div className="block md:hidden min-h-screen bg-[#06060a] pb-24 relative overflow-x-hidden">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-[#07070c]/90 backdrop-blur-md border-b border-white/[0.04] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 hover:text-pink-300 transition shrink-0"
                            title="Open menu"
                        >
                            <Menu className="w-4.5 h-4.5" />
                        </button>
                        <Logo onClick={() => router.push("/home")} />
                        <span
                            className="text-[#ff007f] font-semibold text-[10px] ml-2 mt-1 shrink-0 truncate max-w-[80px] hidden min-[450px]:inline-block"
                            data-tour={isMobileView ? "membership-badge" : undefined}
                        >
                            Welcome {firstName}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Tour/Guide button */}
                        <button
                            onClick={() => startTour('fan')}
                            data-tour={isMobileView ? "tour-button" : undefined}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition shrink-0"
                            title="Restart Fan Tour"
                        >
                            <HelpCircle className="w-4 h-4" />
                        </button>

                        {/* Messages button */}
                        <button 
                            onClick={() => router.push('/account/messages')}
                            data-tour={isMobileView ? "private-chat" : undefined}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 hover:text-pink-300 transition shrink-0"
                            title="Messages"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* NotificationIcon */}
                        <NotificationIcon role="fan" />
                        
                        {/* ProfileMenu */}
                        <ProfileMenu
                            user={user}
                            profile={currentProfile}
                            role={role}
                            router={router}
                            onSignOut={logout}
                        />
                    </div>
                </div>

                {/* Search & Filter Toggle Row */}
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex-1 flex items-center gap-2 bg-[#121218] border border-white/[0.05] rounded-full px-4 py-2 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.6)]" data-tour={isMobileView ? "search-creators" : undefined}>
                        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                        <input
                            value={homeQuery}
                            onChange={(e) => setHomeQuery(e.target.value)}
                            className="bg-transparent outline-none text-xs w-full text-white placeholder-zinc-500 font-sans"
                            placeholder="Search creators..."
                        />
                        {homeQuery && (
                            <button onClick={() => setHomeQuery("")} className="text-zinc-500 shrink-0">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    
                    <button
                        onClick={() => setIsMobileFiltersOpen(prev => !prev)}
                        className={cx(
                            "p-2.5 rounded-2xl bg-black border flex items-center justify-center ml-2 cursor-pointer transition-all duration-200 shrink-0",
                            isMobileFiltersOpen
                                ? "border-pink-500 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.3)] bg-pink-500/10"
                                : "border-white/10 text-zinc-400 hover:border-pink-500/30"
                        )}
                        title="Filters"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-pink-400">
                            <line x1="4" y1="21" x2="4" y2="14"></line>
                            <line x1="4" y1="10" x2="4" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12" y2="3"></line>
                            <line x1="20" y1="21" x2="20" y2="16"></line>
                            <line x1="20" y1="12" x2="20" y2="3"></line>
                            <line x1="2" y1="14" x2="6" y2="14"></line>
                            <line x1="10" y1="8" x2="14" y2="8"></line>
                            <line x1="18" y1="16" x2="22" y2="16"></line>
                        </svg>
                    </button>
                </div>

                {/* Mobile Filter Expandable Drawer Panel */}
                <AnimatePresence>
                    {isMobileFiltersOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full bg-[#121217] border-b border-white/[0.04] px-4 py-3 flex gap-2 overflow-hidden"
                        >
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[8.5px] text-zinc-500 font-semibold uppercase tracking-wider pl-1">Level</span>
                                <select
                                    value={levelFilter}
                                    onChange={(e) => setLevelFilter(e.target.value as any)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-pink-500/40"
                                >
                                    <option value="All">All Tiers</option>
                                    <option value="Rookie">Rookie</option>
                                    <option value="Rising">Rising</option>
                                    <option value="Star">Star</option>
                                    <option value="Elite">Elite</option>
                                </select>
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[8.5px] text-zinc-500 font-semibold uppercase tracking-wider pl-1">Type</span>
                                <select
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-blue-500/40"
                                >
                                    <option value="All">All Types</option>
                                    {activeStatuses["flash-drop"] !== false && <option value="Flash Drops">Flash Drops</option>}
                                    {activeStatuses["confessions"] !== false && <option value="Confessions">Confessions</option>}
                                    {activeStatuses["bar-lounge"] !== false && <option value="Bar Lounge">Bar Lounge</option>}
                                    {activeStatuses["truth-or-dare"] !== false && <option value="Truth or Dare">Truth or Dare</option>}
                                    {activeStatuses["suga-4-u"] !== false && <option value="Suga 4 U">Suga 4 U</option>}
                                    {activeStatuses["x-chat"] !== false && <option value="X Chat">X Chat</option>}
                                </select>
                            </div>
                            <div className="flex-1 flex flex-col gap-1">
                                <span className="text-[8.5px] text-zinc-500 font-semibold uppercase tracking-wider pl-1">Sort</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-pink-500/40"
                                >
                                    <option value="Recommended">Recommended</option>
                                    <option value="Rookie→Elite">Rookie → Elite</option>
                                    <option value="Elite→Rookie">Elite → Rookie</option>
                                </select>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Browse Room Category Grid */}
                <div className="px-4 mt-2">
                    <h3 className="text-[13px] font-bold text-zinc-200 tracking-wide mb-3 pl-0.5 font-sans" data-tour={isMobileView ? "rooms-menu" : undefined}>Browse Room</h3>
                    <div className="grid grid-cols-3 gap-2.5">
                        {CATS.map((cat) => {
                            const tColorMap = {
                                blue: {
                                    radialBg: "radial-gradient(circle at center, rgba(6, 182, 212, 0.16) 0%, rgba(9, 9, 14, 0.98) 75%)",
                                    border: "border-cyan-500/30",
                                    glow: "shadow-[0_0_15px_rgba(6,182,212,0.15),inset_0_1px_1.5px_rgba(255,255,255,0.05)] active:shadow-[0_0_22px_rgba(6,182,212,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)]",
                                    text: "text-cyan-400",
                                    iconStyle: { filter: "drop-shadow(0 0 2px rgba(6, 182, 212, 0.95)) drop-shadow(0 0 8px rgba(6, 182, 212, 0.5)) drop-shadow(0 0 16px rgba(6, 182, 212, 0.2))" }
                                },
                                red: {
                                    radialBg: "radial-gradient(circle at center, rgba(236, 72, 153, 0.16) 0%, rgba(9, 9, 14, 0.98) 75%)",
                                    border: "border-pink-500/30",
                                    glow: "shadow-[0_0_15px_rgba(236,72,153,0.15),inset_0_1px_1.5px_rgba(255,255,255,0.05)] active:shadow-[0_0_22px_rgba(236,72,153,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)]",
                                    text: "text-pink-400",
                                    iconStyle: { filter: "drop-shadow(0 0 2px rgba(236, 72, 153, 0.95)) drop-shadow(0 0 8px rgba(236, 72, 153, 0.5)) drop-shadow(0 0 16px rgba(236, 72, 153, 0.2))" }
                                },
                                yellow: {
                                    radialBg: "radial-gradient(circle at center, rgba(234, 179, 8, 0.16) 0%, rgba(9, 9, 14, 0.98) 75%)",
                                    border: "border-yellow-500/30",
                                    glow: "shadow-[0_0_15px_rgba(234,179,8,0.15),inset_0_1px_1.5px_rgba(255,255,255,0.05)] active:shadow-[0_0_22px_rgba(234,179,8,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)]",
                                    text: "text-yellow-400",
                                    iconStyle: { filter: "drop-shadow(0 0 2px rgba(234, 179, 8, 0.95)) drop-shadow(0 0 8px rgba(234, 179, 8, 0.5)) drop-shadow(0 0 16px rgba(234, 179, 8, 0.2))" }
                                },
                                purple: {
                                    radialBg: "radial-gradient(circle at center, rgba(168, 85, 247, 0.16) 0%, rgba(9, 9, 14, 0.98) 75%)",
                                    border: "border-purple-500/30",
                                    glow: "shadow-[0_0_15px_rgba(168,85,247,0.15),inset_0_1px_1.5px_rgba(255,255,255,0.05)] active:shadow-[0_0_22px_rgba(168,85,247,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)]",
                                    text: "text-purple-400",
                                    iconStyle: { filter: "drop-shadow(0 0 2px rgba(168, 85, 247, 0.95)) drop-shadow(0 0 8px rgba(168, 85, 247, 0.5)) drop-shadow(0 0 16px rgba(168, 85, 247, 0.2))" }
                                },
                                green: {
                                    radialBg: "radial-gradient(circle at center, rgba(16, 185, 129, 0.16) 0%, rgba(9, 9, 14, 0.98) 75%)",
                                    border: "border-emerald-500/30",
                                    glow: "shadow-[0_0_15px_rgba(16,185,129,0.15),inset_0_1px_1.5px_rgba(255,255,255,0.05)] active:shadow-[0_0_22px_rgba(16,185,129,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)]",
                                    text: "text-emerald-400",
                                    iconStyle: { filter: "drop-shadow(0 0 2px rgba(16, 185, 129, 0.95)) drop-shadow(0 0 8px rgba(16, 185, 129, 0.5)) drop-shadow(0 0 16px rgba(16, 185, 129, 0.2))" }
                                },
                                pink: {
                                    radialBg: "radial-gradient(circle at center, rgba(236, 72, 153, 0.16) 0%, rgba(9, 9, 14, 0.98) 75%)",
                                    border: "border-pink-500/30",
                                    glow: "shadow-[0_0_15px_rgba(236,72,153,0.15),inset_0_1px_1.5px_rgba(255,255,255,0.05)] active:shadow-[0_0_22px_rgba(236,72,153,0.3),inset_0_1px_2px_rgba(255,255,255,0.15)]",
                                    text: "text-pink-400",
                                    iconStyle: { filter: "drop-shadow(0 0 2px rgba(236, 72, 153, 0.95)) drop-shadow(0 0 8px rgba(236, 72, 153, 0.5)) drop-shadow(0 0 16px rgba(236, 72, 153, 0.2))" }
                                }
                            }[cat.tone] || {
                                radialBg: "none",
                                border: "border-zinc-800",
                                glow: "",
                                text: "text-white",
                                iconStyle: {}
                            };

                            const getCustomIcon = (c: typeof CATS[number]) => {
                                const size90Keys = ["drops", "conf", "xchat", "truth", "suga4u", "casino"];
                                const is90 = size90Keys.includes(c.key);
                                const sizeClass = is90 ? "w-[90px] h-[90px]" : "w-[80px] h-[80px]";

                                if (typeof c.icon === 'string') {
                                    return (
                                        <img 
                                            src={c.icon} 
                                            alt="" 
                                            className={`${sizeClass} object-contain shrink-0`} 
                                            style={tColorMap.iconStyle} 
                                        />
                                    );
                                }
                                if (c.key === "alllive") {
                                    return <Radio className={`${sizeClass} ${tColorMap.text}`} strokeWidth={1.8} style={tColorMap.iconStyle} />;
                                }
                                return c.icon;
                            };

                            return (
                                <button
                                    key={`mobile-room-${cat.key}`}
                                    onClick={() => router.push(cat.route)}
                                    className={cx(
                                        "min-h-[120px] rounded-2xl border flex flex-col items-center justify-center gap-1.5 p-2 active:scale-95 group transition-all duration-300",
                                        tColorMap.border,
                                        tColorMap.glow
                                    )}
                                    style={{
                                        background: tColorMap.radialBg
                                    }}
                                >
                                    <div className="flex-1 flex items-center justify-center transition-transform duration-300 group-active:scale-110">
                                        {getCustomIcon(cat)}
                                    </div>
                                    <span className="text-[10px] font-semibold text-zinc-300 group-active:text-white tracking-tight leading-none text-center pb-1 transition-colors duration-200">
                                        {cat.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Featured Creators Horizontal Slider */}
                <div className="mt-6" data-tour={isMobileView ? "creator-feed" : undefined}>
                    <div className="px-4 flex items-center justify-between mb-3">
                        <h3 className="text-[13px] font-bold text-zinc-200 tracking-wide pl-0.5">Featured Creators</h3>
                        <button 
                            onClick={() => {
                                setLevelFilter("All");
                                setTagFilter("All");
                            }}
                            className="text-pink-500 text-xs font-semibold active:opacity-75 transition-opacity"
                        >
                            View All
                        </button>
                    </div>

                    <div className="flex overflow-x-auto gap-3.5 px-4 pb-3 scrollbar-none">
                        {rooms.slice(0, 8).map((creator, idx) => {
                            const isLive = idx === 0 || idx === 3 || idx === 5; // Simulates active live state
                            const levelColors = creator.level === "Elite" 
                                ? "border-purple-500/40 text-purple-300 bg-purple-950/40"
                                : creator.level === "Star"
                                ? "border-amber-500/40 text-amber-300 bg-amber-950/40"
                                : "border-blue-500/40 text-blue-300 bg-blue-950/40";

                            return (
                                <div
                                    key={`mobile-featured-${creator.id}-${idx}`}
                                    onClick={() => {
                                        if (creator.userId) router.push("/profile/" + creator.userId);
                                        else router.push("/room/" + creator.id);
                                    }}
                                    className="w-[140px] aspect-[2.7/4] flex-shrink-0 relative rounded-2xl overflow-hidden border border-white/[0.04] bg-zinc-950 shadow-[0_4px_16px_rgba(0,0,0,0.5)] active:scale-98 transition-transform"
                                >
                                    {/* Cover Image background */}
                                    <div 
                                        className="absolute inset-0 bg-cover bg-center opacity-85" 
                                        style={{ backgroundImage: `url(${creator.cover_url || `/creators/creator-${(idx % 5) + 1}.jpg`})` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#040407] via-[#040407]/40 to-transparent pointer-events-none" />

                                    {/* LIVE badge (top-left) */}
                                    {isLive && (
                                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#ff0055] text-[7.5px] font-black px-1.5 py-0.5 rounded-full text-white tracking-widest animate-pulse shadow-[0_0_8px_rgba(255,0,85,0.4)]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                            LIVE
                                        </div>
                                    )}

                                    {/* Like button shortcut (top-right) */}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toast.success(`Subscribed to @${creator.name}'s room updates!`);
                                        }}
                                        className="absolute top-2.5 right-2.5 p-1 rounded-full bg-black/45 backdrop-blur-sm border border-white/[0.08] text-white hover:text-pink-500"
                                    >
                                        <Heart className="w-3 h-3" />
                                    </button>

                                    {/* Bottom Info Details */}
                                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <img 
                                                src={creator.avatar_url || `/creators/creator-${(idx % 5) + 1}.jpg`} 
                                                alt={creator.name} 
                                                className="w-5.5 h-5.5 rounded-full border border-white/20 object-cover shrink-0" 
                                            />
                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                <span className="text-[9.5px] font-bold text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-tight">
                                                    {creator.name}
                                                </span>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className={`text-[6.5px] font-bold px-1 py-[0.5px] rounded border uppercase tracking-wider ${levelColors}`}>
                                                        {creator.level}
                                                    </span>
                                                    {creator.userId && <UserBadgeDisplay userId={creator.userId} />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Creator tag badges */}
                                        <div className="flex flex-wrap gap-0.5">
                                            {creator.tags.slice(0, 2).map((tag, tIdx) => (
                                                <span 
                                                    key={`${creator.id}-mtag-${tIdx}`}
                                                    className="text-[6.5px] bg-black/55 border border-white/[0.08] px-1 py-0.5 rounded text-zinc-300 leading-none shrink-0"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Posts Feed */}
                <div className="mt-5">
                    <div className="px-4 flex items-center justify-between mb-3">
                        <h3 className="text-[13px] font-bold text-zinc-200 tracking-wide pl-0.5">Recent Posts</h3>
                        <button 
                            onClick={() => router.push("/newsfeed")}
                            className="text-pink-500 text-xs font-semibold active:opacity-75 transition-opacity"
                        >
                            View All
                        </button>
                    </div>

                    <div className="px-4 flex flex-col gap-3.5">
                        {posts.length === 0 ? (
                            <div className="text-center py-8 text-zinc-600 text-xs bg-zinc-950/40 rounded-2xl border border-white/[0.02]">
                                No recent updates.
                            </div>
                        ) : (
                            posts.slice(0, 5).map((post) => (
                                <MobilePostCard
                                    key={post.id}
                                    post={post}
                                    user={post.profiles}
                                    currentUserId={user?.id || null}
                                    isSubscribed={subscribedCreatorIds.has(post.user_id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Bottom Sticky Tab Bar Navigation */}
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#07070c]/95 backdrop-blur-lg border-t border-white/[0.08] flex items-center justify-around py-2 shadow-[0_-4px_24px_rgba(0,0,0,0.8)]">
                    <button 
                        onClick={() => router.push('/home')}
                        className="flex flex-col items-center justify-center gap-0.5 text-[#ff007f] cursor-pointer"
                    >
                        <HomeIcon className="w-5 h-5 fill-[#ff007f]/10" />
                        <span className="text-[9px] font-semibold font-sans">Home</span>
                    </button>
                    <button 
                        onClick={() => router.push('/newsfeed')}
                        className="flex flex-col items-center justify-center gap-0.5 text-zinc-400 cursor-pointer"
                    >
                        <Compass className="w-5 h-5" />
                        <span className="text-[9px] font-medium font-sans">Browse</span>
                    </button>
                    <button 
                        onClick={() => router.push('/account/messages')}
                        data-tour={isMobileView ? "private-chat" : undefined}
                        className="flex flex-col items-center justify-center gap-0.5 text-zinc-400 cursor-pointer"
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-[9px] font-medium font-sans">Messages</span>
                    </button>
                    <button 
                        onClick={() => router.push('/account/collections')}
                        data-tour={isMobileView ? "collections-button" : undefined}
                        className="flex flex-col items-center justify-center gap-0.5 text-zinc-400 cursor-pointer"
                    >
                        <Heart className="w-5 h-5" />
                        <span className="text-[9px] font-medium font-sans">Favorites</span>
                    </button>
                    <button 
                        onClick={() => router.push('/account/profile')}
                        className="flex flex-col items-center justify-center gap-0.5 text-zinc-400 cursor-pointer"
                    >
                        <User className="w-5 h-5" />
                        <span className="text-[9px] font-medium font-sans">Profile</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
