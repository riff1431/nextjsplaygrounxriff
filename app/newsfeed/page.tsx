"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    ArrowLeft, Heart, Search, RefreshCw, TrendingUp, Flame, Sparkles,
    Image as ImageIcon, Video, FileText, Filter, ChevronDown, X, User,
    Crown, Star, MessageSquare, Bell, LogOut, Lock, MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import PostCard from "@/components/posts/PostCard";
import ProfileMenu from "@/components/navigation/ProfileMenu";
import BrandLogo from "@/components/common/BrandLogo";
import { NotificationIcon } from "@/components/common/NotificationIcon";
import { AnimatePresence, motion } from "framer-motion";

/* ─── Types ─────────────────────────────────────────────────── */
interface FeedPost {
    id: string;
    user_id: string;
    content_type: "text" | "image" | "video";
    caption: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
    created_at: string;
    is_paid?: boolean;
    price?: number;
    tags?: string[];
    profiles: {
        id?: string;
        username: string | null;
        avatar_url: string | null;
        full_name?: string | null;
        role?: string;
    } | null;
}

type ContentFilter = "all" | "image" | "video" | "text";
type SortOption = "latest" | "popular" | "trending";

/* ─── Helpers ───────────────────────────────────────────────── */
function cn(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

/* ─── Skeleton Loader ───────────────────────────────────────── */
function PostSkeleton() {
    return (
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden animate-pulse">
            <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1">
                    <div className="h-4 w-32 bg-white/10 rounded mb-1" />
                    <div className="h-3 w-24 bg-white/5 rounded" />
                </div>
            </div>
            <div className="px-4 pb-3">
                <div className="h-3 w-full bg-white/5 rounded mb-2" />
                <div className="h-3 w-3/4 bg-white/5 rounded" />
            </div>
            <div className="w-full h-64 bg-white/5" />
            <div className="p-4 flex gap-6">
                <div className="h-4 w-16 bg-white/10 rounded" />
                <div className="h-4 w-20 bg-white/10 rounded" />
            </div>
        </div>
    );
}

/* ─── Stories-style Creator Row (auto-scroll right → left) ───── */
function CreatorStoryRow({
    creators,
    onCreatorClick,
    activeCreatorId,
}: {
    creators: Array<{ id: string; username: string; avatar_url: string | null }>;
    onCreatorClick: (id: string | null) => void;
    activeCreatorId: string | null;
}) {
    return (
        <div className="flex gap-3 items-start">
            {/* All button – stays fixed */}
            <button
                onClick={() => onCreatorClick(null)}
                className={cn(
                    "shrink-0 flex flex-col items-center gap-1.5 group transition-all",
                    !activeCreatorId && "scale-105"
                )}
            >
                <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all",
                    !activeCreatorId
                        ? "border-pink-500 bg-pink-500/20 shadow-[0_0_20px_rgba(236,72,153,0.4)]"
                        : "border-white/20 bg-white/5 group-hover:border-white/40"
                )}>
                    <Sparkles className={cn("w-6 h-6", !activeCreatorId ? "text-pink-400" : "text-white/50")} />
                </div>
                <span className={cn("text-[10px] font-bold", !activeCreatorId ? "text-pink-300" : "text-white/40")}>All</span>
            </button>

            {/* Scrolling creator avatars */}
            <div className="creator-story-scroll-container flex-1 min-w-0">
                <style>{`
                    @keyframes scrollLeft {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .creator-story-scroll-container {
                        overflow: hidden;
                        position: relative;
                    }
                    .creator-story-scroll-container::before,
                    .creator-story-scroll-container::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        bottom: 0;
                        width: 24px;
                        z-index: 2;
                        pointer-events: none;
                    }
                    .creator-story-scroll-container::after {
                        right: 0;
                        background: linear-gradient(to left, rgba(0,0,0,0.7), transparent);
                    }
                    .creator-story-scroll-inner {
                        display: flex;
                        gap: 0.75rem;
                        width: max-content;
                        animation: scrollLeft 45s linear infinite;
                    }
                    .creator-story-scroll-container:hover .creator-story-scroll-inner {
                        animation-play-state: paused;
                    }
                `}</style>
                <div className="creator-story-scroll-inner">
                    {/* Duplicate the list for seamless loop */}
                    {[...creators, ...creators].map((c, idx) => (
                        <button
                            key={`${c.id}-${idx}`}
                            onClick={() => onCreatorClick(activeCreatorId === c.id ? null : c.id)}
                            className={cn(
                                "shrink-0 flex flex-col items-center gap-1.5 group transition-all",
                                activeCreatorId === c.id && "scale-105"
                            )}
                        >
                            <div className={cn(
                                "w-16 h-16 rounded-full border-2 overflow-hidden transition-all",
                                activeCreatorId === c.id
                                    ? "border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)]"
                                    : "border-white/20 group-hover:border-pink-500/50"
                            )}>
                                {c.avatar_url ? (
                                    <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-pink-500/20 flex items-center justify-center">
                                        <User className="w-6 h-6 text-pink-300" />
                                    </div>
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium truncate max-w-[64px]",
                                activeCreatorId === c.id ? "text-pink-300" : "text-white/40"
                            )}>
                                {c.username || "Creator"}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── Sidebar Navigation (matches home page pattern) ────────── */
function BarDrinkIcon({ className = "" }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M7 3h10l-1 7a4 4 0 0 1-4 3H12a4 4 0 0 1-4-3L7 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 13v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M9 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function NewsFeedPage() {
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const supabase = createClient();

    // State
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 15;

    // Filters
    const [contentFilter, setContentFilter] = useState<ContentFilter>("all");
    const [sortBy, setSortBy] = useState<SortOption>("latest");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [activeCreatorId, setActiveCreatorId] = useState<string | null>(null);

    // Creators for story row
    const [creators, setCreators] = useState<Array<{ id: string; username: string; avatar_url: string | null }>>([]);
    const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(new Set());

    // Profile
    const [currentProfile, setCurrentProfile] = useState<{ username: string | null; full_name: string | null; avatar_url: string | null } | null>(null);

    // Debounce
    const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
    const feedRef = useRef<HTMLDivElement>(null);

    // Redirect creators
    useEffect(() => {
        if (!authLoading && role === "creator") {
            router.push("/rooms/creator-studio");
        }
    }, [role, authLoading, router]);

    // Fetch user profile & subscriptions
    useEffect(() => {
        if (!user) return;
        const fetchUserData = async () => {
            const { data: profileData } = await supabase
                .from("profiles")
                .select("username, full_name, avatar_url")
                .eq("id", user.id)
                .single();
            if (profileData) setCurrentProfile(profileData);

            const { data: subData } = await supabase
                .from("subscriptions")
                .select("creator_id")
                .eq("user_id", user.id)
                .eq("status", "active")
                .gt("current_period_end", new Date().toISOString());
            if (subData) setSubscribedCreatorIds(new Set(subData.map((s) => s.creator_id)));
        };
        fetchUserData();
    }, [user]);

    // Fetch creators for story row
    useEffect(() => {
        const fetchCreators = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("id, username, avatar_url")
                .eq("role", "creator")
                .order("created_at", { ascending: false })
                .limit(20);
            if (data) setCreators(data as any);
        };
        fetchCreators();
    }, []);

    // Fetch posts
    const fetchPosts = useCallback(
        async (reset = true) => {
            if (reset) {
                setLoading(true);
                setPage(0);
            } else {
                setLoadingMore(true);
            }

            try {
                const currentPage = reset ? 0 : page;
                let query = supabase
                    .from("posts")
                    .select("*, profiles!user_id!inner(id, username, avatar_url, full_name, role)")
                    .eq("profiles.role", "creator")
                    .order("created_at", { ascending: false })
                    .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

                // Content type filter
                if (contentFilter !== "all") {
                    query = query.eq("content_type", contentFilter);
                }

                // Creator filter
                if (activeCreatorId) {
                    query = query.eq("user_id", activeCreatorId);
                }

                // Search filter
                if (searchQuery.trim()) {
                    query = query.ilike("caption", `%${searchQuery.trim()}%`);
                }

                const { data, error } = await query;

                if (error) {
                    console.error("Error fetching posts:", error);
                    return;
                }

                const newPosts = (data || []) as unknown as FeedPost[];

                if (reset) {
                    setPosts(newPosts);
                } else {
                    setPosts((prev) => [...prev, ...newPosts]);
                }

                setHasMore(newPosts.length === PAGE_SIZE);
                if (!reset) setPage((p) => p + 1);
                else setPage(1);
            } catch (err) {
                console.error("Error:", err);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [contentFilter, sortBy, searchQuery, activeCreatorId, page]
    );

    // Initial fetch + re-fetch on filter change
    useEffect(() => {
        fetchPosts(true);
    }, [contentFilter, sortBy, searchQuery, activeCreatorId]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel("newsfeed-realtime")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
                fetchPosts(true);
            })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Infinite scroll
    useEffect(() => {
        const handleScroll = () => {
            if (loadingMore || !hasMore) return;
            const scrollBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 800;
            if (scrollBottom) fetchPosts(false);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [loadingMore, hasMore, fetchPosts]);

    // Search debounce
    const handleSearchInput = (val: string) => {
        setSearchInput(val);
        if (debounceTimer) clearTimeout(debounceTimer);
        const t = setTimeout(() => setSearchQuery(val), 400);
        setDebounceTimer(t);
    };

    if (authLoading) return null;

    // Stats
    const imageCount = posts.filter((p) => p.content_type === "image").length;
    const videoCount = posts.filter((p) => p.content_type === "video").length;
    const textCount = posts.filter((p) => p.content_type === "text").length;

    const CONTENT_FILTERS: Array<{ key: ContentFilter; label: string; icon: React.ReactNode; count: number }> = [
        { key: "all", label: "All Posts", icon: <Sparkles className="w-3.5 h-3.5" />, count: posts.length },
        { key: "image", label: "Photos", icon: <ImageIcon className="w-3.5 h-3.5" />, count: imageCount },
        { key: "video", label: "Videos", icon: <Video className="w-3.5 h-3.5" />, count: videoCount },
        { key: "text", label: "Text", icon: <FileText className="w-3.5 h-3.5" />, count: textCount },
    ];

    const ROOM_LINKS = [
        { label: "Flash Drops", icon: <Sparkles className="w-4 h-4" />, route: "/rooms/flash-drop-sessions", color: "text-cyan-300", border: "border-cyan-300/90", glow: "shadow-[0_0_18px_rgba(0,230,255,0.85)]", hover: "hover:bg-cyan-500/8" },
        { label: "Confessions", icon: <Lock className="w-4 h-4" />, route: "/rooms/confessions-browse", color: "text-rose-400", border: "border-rose-400/90", glow: "shadow-[0_0_18px_rgba(255,55,95,0.85)]", hover: "hover:bg-rose-500/8" },
        { label: "X Chat", icon: <MessageCircle className="w-4 h-4" />, route: "/rooms/x-chat-sessions", color: "text-lime-300", border: "border-lime-300/90", glow: "shadow-[0_0_18px_rgba(200,255,0,0.85)]", hover: "hover:bg-lime-500/8" },
        { label: "Bar Lounge", icon: <BarDrinkIcon className="w-4 h-4" />, route: "/rooms/bar-lounge", color: "text-violet-400", border: "border-violet-400/90", glow: "shadow-[0_0_18px_rgba(170,80,255,0.85)]", hover: "hover:bg-violet-500/8" },
        { label: "Truth or Dare", icon: <MessageCircle className="w-4 h-4" />, route: "/rooms/truth-or-dare-sessions", color: "text-emerald-400", border: "border-emerald-400/90", glow: "shadow-[0_0_18px_rgba(0,255,170,0.85)]", hover: "hover:bg-emerald-500/8" },
        { label: "Suga 4 U", icon: <Crown className="w-4 h-4" />, route: "/rooms/suga4u-sessions", color: "text-pink-400", border: "border-pink-400/90", glow: "shadow-[0_0_18px_rgba(236,72,153,0.85)]", hover: "hover:bg-pink-500/8" },
    ];

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen bg-black text-white">
                {/* ── Neon Animations ── */}
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
                    .neon-flicker { animation: neonFlicker 7.5s infinite; }
                    .neon-deep { filter: saturate(1.65) contrast(1.08); }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(236,72,153,0.3); border-radius: 8px; }
                `}</style>

                {/* ── Top Header ── */}
                <header className="sticky top-0 z-40 px-6 py-3 border-b border-pink-500/20 bg-black/80 backdrop-blur-xl">
                    <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push("/home")}
                                className="flex items-center gap-2 select-none text-left"
                                title="Back to Home"
                            >
                                <BrandLogo showBadge={false} />
                            </button>
                            <div className="hidden sm:flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                                <span className="text-pink-300 font-bold neon-deep drop-shadow-[0_0_22px_rgba(236,72,153,1)]">NewsFeed</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Search bar */}
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300/50" />
                                <input
                                    value={searchInput}
                                    onChange={(e) => handleSearchInput(e.target.value)}
                                    className="pl-9 pr-8 py-2 w-56 bg-black/40 border border-pink-500/20 rounded-2xl text-sm placeholder-white/25 focus:outline-none focus:border-pink-500/50 transition"
                                    placeholder="Search posts…"
                                />
                                {searchInput && (
                                    <button
                                        onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => router.push("/account/messages")}
                                className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition"
                                title="Messages"
                            >
                                <MessageSquare className="w-5 h-5" />
                            </button>
                            <NotificationIcon role="fan" />
                            <ProfileMenu
                                user={user}
                                profile={currentProfile}
                                role={role}
                                router={router}
                                onSignOut={async () => { await supabase.auth.signOut(); router.push("/"); }}
                            />
                        </div>
                    </div>
                </header>

                {/* ── Main Layout ── */}
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col lg:flex-row gap-6">

                        {/* ── Left Sidebar ── */}
                        <aside className="w-full lg:w-56 shrink-0">
                            <div className="lg:sticky lg:top-20 space-y-4">
                                {/* Browse Room */}
                                <div className="rounded-2xl border border-pink-500/25 bg-black p-4 shadow-[0_0_24px_rgba(236,72,153,0.14),0_0_56px_rgba(59,130,246,0.08)]">
                                    <div className="pointer-events-none absolute inset-0 opacity-55">
                                        <div className="absolute -inset-12 blur-3xl bg-[radial-gradient(circle_at_25%_20%,rgba(255,0,200,0.30),transparent_55%),radial-gradient(circle_at_80%_35%,rgba(0,230,255,0.22),transparent_60%)]" />
                                    </div>
                                    <div className="relative">
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">Browse Room</div>
                                        <div className="space-y-2">
                                            {ROOM_LINKS.map((room) => (
                                                <button
                                                    key={room.label}
                                                    onClick={() => router.push(room.route)}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55",
                                                        room.border, room.glow, room.hover
                                                    )}
                                                >
                                                    <span className={cn("inline-flex items-center gap-2 neon-flicker", room.color)}>
                                                        {room.icon}
                                                        <span className="truncate neon-deep">{room.label}</span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Quick Links */}
                                        <div className="mt-6 space-y-2">
                                            <button className="w-full rounded-xl border border-cyan-300/90 bg-black px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10 inline-flex items-center gap-2 justify-start" onClick={() => router.push("/account/profile")}>
                                                <User className="w-4 h-4" /> My Profile
                                            </button>
                                            <button className="w-full rounded-xl border border-emerald-400/80 bg-black px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 inline-flex items-center gap-2 justify-start" onClick={() => router.push("/account/membership")}>
                                                <Star className="w-4 h-4" /> My Subscription
                                            </button>
                                            <button className="w-full rounded-xl border border-sky-400/80 bg-black px-3 py-2 text-sm text-sky-200 hover:bg-sky-500/10 inline-flex items-center gap-2 justify-start font-semibold ring-1 ring-sky-400/30" onClick={() => router.push("/newsfeed")}>
                                                <Bell className="w-4 h-4" /> NewsFeed
                                            </button>
                                            <button className="w-full rounded-xl border border-emerald-500/50 bg-black px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/suggestions")}>
                                                <MessageSquare className="w-4 h-4" /> Suggestions
                                            </button>
                                            <button className="w-full rounded-xl border border-pink-500/25 bg-black/40 hover:bg-white/5 px-3 py-2 text-sm text-pink-200 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/home")}>
                                                <ArrowLeft className="w-4 h-4" /> Back to Home
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* ── Center Feed ── */}
                        <main className="flex-1 min-w-0 max-w-2xl mx-auto w-full" ref={feedRef}>
                            {/* Creator Stories Row */}
                            <div className="mb-6 rounded-2xl border border-pink-500/15 bg-black/40 backdrop-blur-md p-4">
                                <CreatorStoryRow
                                    creators={creators}
                                    onCreatorClick={setActiveCreatorId}
                                    activeCreatorId={activeCreatorId}
                                />
                            </div>

                            {/* Content Type Filters */}
                            <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-scrollbar:none]">
                                {CONTENT_FILTERS.map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => setContentFilter(f.key)}
                                        className={cn(
                                            "shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-all",
                                            contentFilter === f.key
                                                ? "bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.3)] scale-105"
                                                : "bg-white/5 text-white/40 border-white/10 hover:text-white/70 hover:bg-white/8"
                                        )}
                                    >
                                        {f.icon}
                                        {f.label}
                                    </button>
                                ))}

                                <div className="ml-auto shrink-0">
                                    <button
                                        onClick={() => fetchPosts(true)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition border border-white/10"
                                        title="Refresh"
                                    >
                                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                                    </button>
                                </div>
                            </div>

                            {/* Mobile search */}
                            <div className="md:hidden mb-4">
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                    <input
                                        value={searchInput}
                                        onChange={(e) => handleSearchInput(e.target.value)}
                                        className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-pink-500/50 transition"
                                        placeholder="Search posts…"
                                    />
                                    {searchInput && (
                                        <button
                                            onClick={() => { setSearchInput(""); setSearchQuery(""); }}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Active filter indicator */}
                            {(activeCreatorId || searchQuery || contentFilter !== "all") && (
                                <div className="mb-4 flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Filters:</span>
                                    {activeCreatorId && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-300 text-[11px] font-bold border border-pink-500/25">
                                            <User className="w-3 h-3" />
                                            {creators.find((c) => c.id === activeCreatorId)?.username || "Creator"}
                                            <button onClick={() => setActiveCreatorId(null)} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                    {contentFilter !== "all" && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-bold border border-blue-500/25">
                                            {contentFilter}
                                            <button onClick={() => setContentFilter("all")} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                    {searchQuery && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-bold border border-emerald-500/25">
                                            "{searchQuery}"
                                            <button onClick={() => { setSearchInput(""); setSearchQuery(""); }} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                                        </span>
                                    )}
                                    <button
                                        onClick={() => { setActiveCreatorId(null); setContentFilter("all"); setSearchInput(""); setSearchQuery(""); }}
                                        className="text-[10px] text-rose-400 font-bold hover:text-rose-300 ml-auto"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            )}

                            {/* Feed Posts */}
                            {loading ? (
                                <div className="space-y-6">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <PostSkeleton key={i} />
                                    ))}
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="relative mb-6">
                                        <div className="w-20 h-20 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto">
                                            <Heart className="w-8 h-8 text-pink-400/40" />
                                        </div>
                                        <div className="absolute inset-0 rounded-full bg-pink-500/5 blur-2xl animate-pulse" />
                                    </div>
                                    <h2 className="text-white/60 text-lg font-bold mb-2">No Posts Found</h2>
                                    <p className="text-white/30 text-sm max-w-xs">
                                        {searchInput
                                            ? `No posts match "${searchInput}". Try a different search.`
                                            : "No published content yet. Follow your favorite creators to see their updates here!"}
                                    </p>
                                    {(searchInput || contentFilter !== "all" || activeCreatorId) && (
                                        <button
                                            onClick={() => { setSearchInput(""); setSearchQuery(""); setContentFilter("all"); setActiveCreatorId(null); }}
                                            className="mt-6 px-5 py-2.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-sm font-bold border border-pink-500/20 transition"
                                        >
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <AnimatePresence>
                                        {posts.map((post, index) => (
                                            <motion.div
                                                key={post.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: Math.min(index * 0.05, 0.3) }}
                                            >
                                                <PostCard
                                                    post={post as any}
                                                    user={post.profiles as any}
                                                    currentUserId={user?.id || null}
                                                    isSubscribed={post.user_id ? subscribedCreatorIds.has(post.user_id) : false}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* Load more indicator */}
                                    {loadingMore && (
                                        <div className="py-8 flex justify-center">
                                            <div className="flex items-center gap-3 text-pink-300/60 text-sm">
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Loading more posts…
                                            </div>
                                        </div>
                                    )}

                                    {!hasMore && posts.length > 0 && (
                                        <div className="py-10 text-center">
                                            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/30 text-xs font-medium">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                You've reached the end of the feed
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </main>

                        {/* ── Right Sidebar: Trending / Suggestions ── */}
                        <aside className="w-full lg:w-72 shrink-0 hidden xl:block">
                            <div className="lg:sticky lg:top-20 space-y-4">
                                {/* Quick Stats */}
                                <div className="rounded-2xl border border-blue-500/20 bg-black p-4">
                                    <h3 className="text-sm font-bold text-blue-200 flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-blue-400" />
                                        Feed Stats
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center p-2 rounded-xl bg-pink-500/10 border border-pink-500/15">
                                            <div className="text-lg font-black text-pink-300">{imageCount}</div>
                                            <div className="text-[9px] text-white/30 uppercase font-bold">Photos</div>
                                        </div>
                                        <div className="text-center p-2 rounded-xl bg-blue-500/10 border border-blue-500/15">
                                            <div className="text-lg font-black text-blue-300">{videoCount}</div>
                                            <div className="text-[9px] text-white/30 uppercase font-bold">Videos</div>
                                        </div>
                                        <div className="text-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
                                            <div className="text-lg font-black text-emerald-300">{textCount}</div>
                                            <div className="text-[9px] text-white/30 uppercase font-bold">Text</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Trending Creators - Auto-scroll bottom-to-top */}
                                <div className="rounded-2xl border border-pink-500/25 bg-black p-4 shadow-[0_0_24px_rgba(236,72,153,0.14)]">
                                    <style>{`
                                        @keyframes scrollUp {
                                            0% { transform: translateY(0); }
                                            100% { transform: translateY(-50%); }
                                        }
                                        .trending-scroll-container {
                                            overflow: hidden;
                                            /* Show 8 items: each item ~52px (py-2 + gap) */
                                            max-height: 416px;
                                            position: relative;
                                        }
                                        .trending-scroll-container::before,
                                        .trending-scroll-container::after {
                                            content: '';
                                            position: absolute;
                                            left: 0;
                                            right: 0;
                                            height: 20px;
                                            z-index: 2;
                                            pointer-events: none;
                                        }
                                        .trending-scroll-container::before {
                                            top: 0;
                                            background: linear-gradient(to bottom, black, transparent);
                                        }
                                        .trending-scroll-container::after {
                                            bottom: 0;
                                            background: linear-gradient(to top, black, transparent);
                                        }
                                        .trending-scroll-inner {
                                            animation: scrollUp 40s linear infinite;
                                        }
                                        .trending-scroll-container:hover .trending-scroll-inner {
                                            animation-play-state: paused;
                                        }
                                    `}</style>
                                    <h3 className="text-sm font-bold text-pink-200 flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-4 h-4 text-pink-500" />
                                        Trending Creators
                                    </h3>
                                    <div className="trending-scroll-container">
                                        <div className="trending-scroll-inner">
                                            {/* Render 10 creators, duplicated for seamless loop */}
                                            {[...creators.slice(0, 10), ...creators.slice(0, 10)].map((c, idx) => (
                                                <button
                                                    key={`${c.id}-${idx}`}
                                                    onClick={() => router.push(`/profile/${c.id}`)}
                                                    className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5 transition group"
                                                >
                                                    {c.avatar_url ? (
                                                        <img src={c.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                                                            <User className="w-4 h-4 text-pink-300" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 text-left min-w-0">
                                                        <div className="text-sm text-white/80 font-medium truncate group-hover:text-white transition">{c.username || "Creator"}</div>
                                                        <div className="text-[10px] text-white/30">Creator</div>
                                                    </div>
                                                    <Flame className="w-3.5 h-3.5 text-orange-400/50 group-hover:text-orange-400 transition" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
}
