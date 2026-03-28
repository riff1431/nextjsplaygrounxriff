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
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import CreatePostModal from "@/components/posts/CreatePostModal";
import PostCard from "@/components/posts/PostCard";
import { AnimatePresence, motion } from "framer-motion";
import ProfileMenu from "@/components/navigation/ProfileMenu";
import BrandLogo from "@/components/common/BrandLogo";
import WorldTruthDareList from "@/components/rooms/WorldTruthDareList";
import { NotificationIcon } from "@/components/common/NotificationIcon";
import { activeCreators, CreatorCard } from "@/components/data/activeCreators";

// Local fallback icon so the preview never breaks due to a missing lucide icon export
function BarDrinkIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M7 3h10l-1 7a4 4 0 0 1-4 3H12a4 4 0 0 1-4-3L7 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
            />
            <path d="M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 13v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M9 6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                // toned-down outer neon glow (cleaner edges, less bleed)
                "shadow-[0_0_24px_rgba(236,72,153,0.14),0_0_56px_rgba(59,130,246,0.08)]",
                "hover:shadow-[0_0_38px_rgba(236,72,153,0.22),0_0_86px_rgba(59,130,246,0.14)] transition-shadow",
                className
            )}
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
                "aspect-square" // Instagram-style square tile
            )}
            title={creator.tags.includes("Suga 4 U") ? "Open Suga4U (preview)" : "Join Room"}
        >
            {/* Background Image (Cover) - fills the entire square */}
            {creator.cover_url ? (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity duration-700"
                    style={{ backgroundImage: `url(${creator.cover_url})` }}
                />
            ) : null}

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/15 to-black/85 pointer-events-none" />

            {/* Flex spacer to push body to bottom of the square */}
            <div className="flex-1" />

            {/* Body at the bottom */}
            <div className="relative p-3 flex flex-col z-10">
                {/* Row: Avatar + name + level */}
                <div className="flex items-center justify-between gap-2 min-h-[22px]">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {creator.avatar_url ? (
                            <img src={creator.avatar_url} alt="" className="w-10 h-10 rounded-full border-2 border-white/30 object-cover shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-pink-500/20 border-2 border-pink-500/40 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-pink-300" />
                            </div>
                        )}
                        <div className="text-sm text-fuchsia-300 font-semibold truncate drop-shadow-[0_0_42px_rgba(255,0,200,1)]">
                            {creator.name}
                        </div>
                    </div>

                    <span className="shrink-0 text-[10px] px-2 py-[2px] rounded-full border border-blue-500/25 text-blue-200 bg-black/50 backdrop-blur-sm">
                        {creator.level}
                    </span>
                </div>

                {/* Row: tags */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {tags.map((t, idx) =>
                        t ? (
                            <span
                                key={`${creator.id}-${t}`}
                                className="text-[10px] px-2 py-[2px] rounded-full border border-pink-500/20 text-pink-200 bg-black/40 backdrop-blur-sm"
                            >
                                {t}
                            </span>
                        ) : (
                            <span
                                key={`${creator.id}-pad-${idx}`}
                                className="text-[10px] px-2 py-[2px] rounded-full border border-transparent text-transparent select-none"
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

// ---- Home Screen -----------------------------------------------------------
function HomeScreen({
    onEnterSuga4U,
    query,
    setQuery,
    rooms, // Received from parent
    posts, // New prop
    userId,
    subscribedCreatorIds,
}: {
    onEnterSuga4U: () => void;
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    rooms: any[];
    posts: Post[];
    userId?: string;
    subscribedCreatorIds: Set<string>;
}) {
    const router = useRouter();
    const [activeCat, setActiveCat] = useState("all");
    const [tagFilter, setTagFilter] = useState("All");
    const [sortBy, setSortBy] = useState<"Recommended" | "Rookie→Elite" | "Elite→Rookie">("Recommended");
    const [levelFilter, setLevelFilter] = useState<"All" | "Rookie" | "Rising" | "Star" | "Elite">("All");

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

    const CATS: Array<{
        label: string;
        key: string;
        icon: React.ReactNode;
        tone: "pink" | "green" | "purple" | "red" | "blue" | "yellow";
        primary?: boolean;
        route: string;
        comingSoon?: boolean;
    }> = [
            { label: "Flash Drops", key: "drops", icon: <Sparkles className="w-4 h-4" />, tone: "blue", route: "/rooms/flash-drop-sessions" },
            { label: "Confessions", key: "conf", icon: <Lock className="w-4 h-4" />, tone: "red", route: "/rooms/confessions-browse" },
            { label: "X Chat", key: "xchat", icon: <MessageCircle className="w-4 h-4" />, tone: "yellow", route: "/rooms/x-chat-sessions" },
            { label: "Bar Lounge", key: "bar", icon: <BarDrinkIcon className="w-4 h-4" />, tone: "purple", route: "/rooms/bar-lounge" },
            { label: "Truth or Dare", key: "truth", icon: <MessageCircle className="w-4 h-4" />, tone: "green", route: "/rooms/truth-or-dare-sessions" },
            { label: "Suga 4 U", key: "suga4u", icon: <Crown className="w-4 h-4" />, tone: "pink", primary: true, route: "/rooms/suga4u-sessions" },
        ];

    return (
        <div className="w-full mx-auto px-6 py-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Left rail (always-expanded categories) */}
                <NeonCard className="w-full lg:w-48 shrink-0 relative overflow-hidden p-4 lg:sticky lg:top-6">
                    {/* ... (Keep existing Left Rail logic if desired, or simplify? I'll re-include the Navigation Logic safely) ... */}
                    {/* Pitch-black base; ambient smoke sits behind tiles */}
                    <div className="pointer-events-none absolute inset-0 opacity-55">
                        <div className="absolute -inset-12 blur-3xl bg-[radial-gradient(circle_at_25%_20%,rgba(255,0,200,0.30),transparent_55%),radial-gradient(circle_at_80%_35%,rgba(0,230,255,0.22),transparent_60%)]" />
                    </div>

                    <div className="relative">


                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 mt-3 px-1">Browse Room</div>
                            <div className="mt-1 space-y-2">
                                {CATS.map((cat) => {
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
                                                "w-full text-left px-3 py-2 rounded-xl border text-sm transition",
                                                "bg-black/55",
                                                t.border,
                                                t.glow,
                                                t.hover,
                                                isPrimary && "ring-1 ring-cyan-300/35",
                                                activeCat === cat.key && "neon-pulse"
                                            )}
                                        >
                                            <span
                                                className={cx(
                                                    "inline-flex items-center gap-2",
                                                    t.text,
                                                    "neon-flicker",
                                                    isPrimary && "animate-pulse"
                                                )}
                                            >
                                                <span className={t.icon}>{cat.icon}</span>
                                                <span className="truncate neon-deep">{cat.label}</span>
                                                {cat.comingSoon && (
                                                    <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded bg-gray-700/80 text-gray-300 font-medium uppercase tracking-wide">Soon</span>
                                                )}

                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>


                        <div className="mt-8 mb-4">
                            <button
                                onClick={() => router.push("/coming-soon")}
                                className={cx(
                                    "w-full text-left px-3 py-3 rounded-xl border text-sm transition relative overflow-hidden group flex items-center justify-between",
                                    "bg-black/80 border-yellow-500/90 hover:bg-yellow-500/10",
                                    "shadow-[0_0_18px_rgba(234,179,8,0.85),0_0_60px_rgba(234,179,8,0.45)] hover:shadow-[0_0_26px_rgba(234,179,8,0.95),0_0_90px_rgba(234,179,8,0.65)]"
                                )}
                            >
                                <span className="relative z-10 inline-flex items-center gap-2 text-yellow-300 font-semibold tracking-wide group-hover:text-yellow-200 transition-colors">
                                    <Trophy className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                                    Competition
                                </span>

                                {/* Subtle internal glow */}
                                <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors pointer-events-none" />
                            </button>
                        </div>


                        <div className="mt-2 space-y-3">
                            <div className="grid grid-cols-1 gap-2">
                                <button className="w-full rounded-xl border border-cyan-300/90 bg-black px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10 inline-flex items-center gap-2 justify-start" onClick={() => router.push("/account/profile")}>
                                    <User className="w-4 h-4" /> My Profile
                                </button>
                                <button className="w-full rounded-xl border border-emerald-400/80 bg-black px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 inline-flex items-center gap-2 justify-start" onClick={() => router.push("/account/subscription")}>
                                    <Star className="w-4 h-4" /> My Subscription
                                </button>
                                <button className="w-full rounded-xl border border-sky-400/80 bg-black px-3 py-2 text-sm text-sky-200 hover:bg-sky-500/10 inline-flex items-center gap-2 justify-start" onClick={() => router.push("/newsfeed")}>
                                    <Bell className="w-4 h-4" /> NewsFeed
                                </button>
                                <button className="w-full rounded-xl border border-fuchsia-500/90 bg-black px-3 py-2 text-sm text-fuchsia-200 hover:bg-fuchsia-500/10 inline-flex items-center gap-2 justify-start" onClick={() => router.push("/account/messages")}>
                                    <MessageCircle className="w-4 h-4" /> Messages
                                </button>
                                <button className="w-full rounded-xl border border-purple-500/90 bg-black px-3 py-2 text-sm text-purple-200 hover:bg-purple-500/10 inline-flex items-center gap-2 justify-start" onClick={() => router.push("/account/notifications")}>
                                    <Bell className="w-4 h-4" /> Notifications
                                </button>
                                <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start" onClick={() => router.push("/account/collections")}>
                                    <Star className="w-4 h-4" /> Collections
                                </button>
                                <NeonButton variant="ghost" className="w-full justify-start flex items-center gap-2" title="Log Out" onClick={() => router.push("/")}>
                                    <LogOut className="w-4 h-4" /> Log Out
                                </NeonButton>
                            </div>
                        </div>
                    </div>
                </NeonCard>

                {/* Main grid */}
                <div className="flex-1 min-w-0">

                    <div className="flex flex-col gap-3 mb-4">
                        {/* Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400 mb-1">Creator Level</div>
                                <select
                                    value={levelFilter}
                                    onChange={(e) => setLevelFilter(e.target.value as any)}
                                    className="w-full bg-black/40 border border-pink-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="All">All</option>
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
                                    className="w-full bg-black/40 border border-blue-500/25 rounded-xl px-3 py-2 text-sm"
                                >
                                    <option value="All">All</option>
                                    <option value="Flash Drops">Flash Drops</option>
                                    <option value="Confessions">Confessions</option>
                                    <option value="Bar Lounge">Bar Lounge</option>
                                    <option value="Truth or Dare">Truth or Dare</option>
                                    <option value="Suga 4 U">Suga 4 U</option>
                                    <option value="X Chat">X Chat</option>
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                <NeonCard className="w-full lg:w-96 shrink-0 p-4 lg:sticky lg:top-6">
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
                                    max-height: 78vh;
                                    position: relative;
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
    const { role, isLoading: authLoading, user } = useAuth();
    const [rooms, setRooms] = useState<any[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);

    const [currentProfile, setCurrentProfile] = useState<{ username: string | null, full_name: string | null, avatar_url: string | null, fan_membership_id?: string | null } | null>(null);
    const [userAccountType, setUserAccountType] = useState<{ display_name: string, badge_icon: string, badge_color: string } | null>(null);
    const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(new Set());
    const supabase = createClient();

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
                // Profile with account type
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('username, full_name, avatar_url, fan_membership_id, account_types(display_name, badge_icon, badge_color)')
                    .eq('id', user.id)
                    .single();

                if (profileData) {
                    setCurrentProfile(profileData);

                    // Set account type if exists
                    if (profileData.account_types) {
                        // Cast to handle potential array or object return although single is expected for many-to-one
                        const at = Array.isArray(profileData.account_types) ? profileData.account_types[0] : profileData.account_types;
                        setUserAccountType(at as any);
                    }

                    // Fetch membership tier if exists
                    if (profileData.fan_membership_id) {
                        const { data: planData } = await supabase
                            .from('fan_membership_plans')
                            .select('name')
                            .eq('id', profileData.fan_membership_id)
                            .single();

                        if (planData?.name) {
                            // Convert DB plan name (e.g. "gold") to BadgeTier (e.g. "Gold")
                            const tierName = planData.name.charAt(0).toUpperCase() + planData.name.slice(1).toLowerCase();
                            setFanTier(tierName as BadgeTier);
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

    const [homeQuery, setHomeQuery] = useState("");
    const [levelFilter, setLevelFilter] = useState<string | "All">("All");
    const [tagFilter, setTagFilter] = useState<string | "All">("All"); // Renamed for clarity in UI

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
      `}</style>

            <div className="px-6 py-4 border-b border-pink-500/20 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Logo onClick={() => router.push("/")} />

                    {/* Animated neon handwriting welcome (reveals on load) */}
                    <div className={cx("flex items-center gap-3", revealWelcome ? "" : "opacity-0")}
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

                        {showTierBadge && (
                            <span
                                className={cx(
                                    "inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] border",
                                    fanTierClasses(fanTier),
                                    fanTierBg(fanTier),
                                    "vip-glow"
                                )}
                                title="Membership tier"
                            >
                                <Crown className="w-3 h-3" />
                                {tierLabel}
                            </span>
                        )}

                        {/* Account Type Badge */}
                        {userAccountType && (
                            <span
                                className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] border font-medium"
                                style={{
                                    backgroundColor: `${userAccountType.badge_color || '#ec4899'}20`,
                                    color: userAccountType.badge_color || '#ec4899',
                                    borderColor: `${userAccountType.badge_color || '#ec4899'}40`,
                                    boxShadow: `0 0 10px ${userAccountType.badge_color || '#ec4899'}30`
                                }}
                                title="Account Type"
                            >
                                <span>{userAccountType.badge_icon || '✨'}</span>
                                {userAccountType.display_name}
                            </span>
                        )}
                    </div>
                </div>

                {/* Top-right: Search + My Profile only */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-pink-500/20 bg-black/35 px-3 py-2">
                        <Search className="w-4 h-4 text-pink-300" />
                        <input
                            value={homeQuery}
                            onChange={(e) => setHomeQuery(e.target.value)}
                            className="bg-transparent outline-none text-sm w-44"
                            placeholder="Search creators…"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/account/messages')}
                            className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition"
                            title="Messages"
                        >
                            <MessageSquare className="w-5 h-5" />
                        </button>
                        <NotificationIcon role="fan" />
                        <button
                            onClick={() => router.push('/account/subscription')}
                            className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 transition"
                            title="Subscription"
                        >
                            <Crown className="w-5 h-5" />
                        </button>
                        <ProfileMenu
                            user={user}
                            profile={currentProfile}
                            role={role}
                            router={router}
                            onSignOut={async () => { await supabase.auth.signOut(); router.push("/"); }}
                        />
                    </div>
                </div>
            </div>

            <HomeScreen
                onEnterSuga4U={() => setLevelFilter("Elite")}
                query={homeQuery}
                setQuery={setHomeQuery}
                rooms={rooms}
                posts={posts}
                userId={user?.id}
                subscribedCreatorIds={subscribedCreatorIds}
            />
        </div>
    );
}
