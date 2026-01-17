"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Crown,
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
import { useAuth } from "../context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import CreatePostModal from "@/components/posts/CreatePostModal";

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

type CreatorCard = {
    id: string;
    userId: string;
    name: string;
    level: "Rookie" | "Rising" | "Star" | "Elite";
    tags: string[];
    avatar_url?: string | null;
    cover_url?: string | null;
};

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
const CREATORS: CreatorCard[] = [
    { id: "c1", userId: "u1", name: "NeonNyla", level: "Elite", tags: ["Suga 4 U", "Flash Drops"] },
    { id: "c2", userId: "u2", name: "PinkVibe", level: "Star", tags: ["Truth or Dare", "Bar Lounge"] },
    { id: "c3", userId: "u3", name: "BlueMuse", level: "Rising", tags: ["X Chat", "Confessions"] },
    { id: "c4", userId: "u4", name: "LunaLux", level: "Elite", tags: ["Suga 4 U", "Confessions"] },
    { id: "c5", userId: "u5", name: "NovaHeat", level: "Star", tags: ["Flash Drops", "Bar Lounge"] },
    { id: "c6", userId: "u6", name: "RoxyRave", level: "Rookie", tags: ["Truth or Dare", "X Chat"] },
    { id: "c7", userId: "u7", name: "VelvetX", level: "Rising", tags: ["Bar Lounge", "Confessions"] },
    { id: "c8", userId: "u8", name: "Sapphire", level: "Star", tags: ["Suga 4 U", "Truth or Dare"] },
];

// ---- Branding --------------------------------------------------------------
function Logo({ onClick }: { onClick?: () => void }) {
    return (
        <button onClick={onClick} className="flex items-center gap-2 select-none text-left" title="Back to Home">
            <img
                src="/logo.png"
                alt="PlayGroundX"
                className="h-8 w-auto drop-shadow-[0_0_35px_rgba(255,0,200,0.9)]"
            />
            <span className="ml-2 text-[10px] px-2 py-[2px] rounded-full border border-pink-500/40 text-pink-300 neon-deep">
                Preview
            </span>
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

function isHighTier(tier: BadgeTier) {
    return tier === "Gold" || tier === "Platinum" || tier === "VIP";
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
                "group relative h-full rounded-2xl border border-pink-500/25 bg-black/40 overflow-hidden",
                "hover:border-pink-500/45 transition",
                "flex flex-col text-left"
            )}
            title={creator.tags.includes("Suga 4 U") ? "Open Suga4U (preview)" : "Join Room"}
        >
            {/* Background Image (Cover) */}
            {creator.cover_url ? (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-80 transition-opacity duration-700"
                    style={{ backgroundImage: `url(${creator.cover_url})` }}
                />
            ) : (
                // Fallback gradient logic if no cover (or keep as overlay?)
                // keeping overlay div below to Ensure text readability regardless of image
                null
            )}

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90 pointer-events-none" />


            {/* Media area (aspect ratio spacer if needed, or just allow flex-grow) 
                Actually, the original design had a fixed top area. 
                With bg image, we might want the whole tile to be the image.
                Let's stick to the visual structure but use the image as the full tile bg.
            */}
            <div className="h-32 w-full" /> {/* Spacer to push content down roughly as before */}


            {/* Body (fixed rhythm) */}
            <div className="relative p-3 flex-1 flex flex-col z-10">
                {/* Row: Avatar + name + level */}
                <div className="flex items-center justify-between gap-2 min-h-[22px]">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {/* Avatar */}
                        {creator.avatar_url ? (
                            <img src={creator.avatar_url} alt="" className="w-6 h-6 rounded-full border border-white/20 object-cover shrink-0" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center shrink-0">
                                <User className="w-3 h-3 text-pink-300" />
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

                {/* Row: tags (consistent height) */}
                <div className="mt-2 flex flex-wrap gap-1 min-h-[28px]">
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

                {/* Spacer to keep tiles identical even when tags vary */}
                <div className="flex-1" />
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
}: {
    onEnterSuga4U: () => void;
    query: string;
    setQuery: React.Dispatch<React.SetStateAction<string>>;
    rooms: any[];
    posts: Post[];
    userId?: string;
}) {
    const router = useRouter();
    const [activeCat, setActiveCat] = useState("all");
    const [tagFilter, setTagFilter] = useState("All");
    const [sortBy, setSortBy] = useState<"Recommended" | "Rookie→Elite" | "Elite→Rookie">("Recommended");
    const [levelFilter, setLevelFilter] = useState<"All" | "Rookie" | "Rising" | "Star" | "Elite">("All");

    // Use fetched rooms if available, otherwise fallback to mock for preview
    const dataSource: CreatorCard[] = rooms.length > 0 ? rooms : CREATORS; // Assuming CREATORS is defined elsewhere

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
    }> = [
            { label: "Flash Drops", key: "drops", icon: <Sparkles className="w-4 h-4" />, tone: "blue", route: "/rooms/flash-drop" },
            { label: "Confessions", key: "conf", icon: <Lock className="w-4 h-4" />, tone: "red", route: "/rooms/confessions" },
            { label: "X Chat", key: "xchat", icon: <MessageCircle className="w-4 h-4" />, tone: "yellow", route: "/rooms/x-chat" },
            { label: "Bar Lounge", key: "bar", icon: <BarDrinkIcon className="w-4 h-4" />, tone: "purple", route: "/rooms/bar-lounge" },
            { label: "Truth or Dare", key: "truth", icon: <MessageCircle className="w-4 h-4" />, tone: "green", route: "/rooms/truth-or-dare" },
            { label: "Competitions", key: "comp", icon: <Trophy className="w-4 h-4" />, tone: "yellow", route: "/competition" },
            { label: "Suga 4 U", key: "suga4u", icon: <Crown className="w-4 h-4" />, tone: "pink", primary: true, route: "/rooms/suga-4-u" },
        ];

    return (
        <div className="w-full mx-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left rail (always-expanded categories) */}
                <NeonCard className="relative overflow-hidden p-4 lg:col-span-2">
                    {/* Pitch-black base; ambient smoke sits behind tiles */}
                    <div className="pointer-events-none absolute inset-0 opacity-55">
                        <div className="absolute -inset-12 blur-3xl bg-[radial-gradient(circle_at_25%_20%,rgba(255,0,200,0.30),transparent_55%),radial-gradient(circle_at_80%_35%,rgba(0,230,255,0.22),transparent_60%)]" />
                    </div>

                    <div className="relative">
                        <div className="neon-smoke" aria-hidden="true" />
                        <div className="text-fuchsia-300 text-sm mb-3 neon-flicker drop-shadow-[0_0_58px_rgba(255,0,200,1)]">
                            Browse
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-fuchsia-300 inline-flex items-center gap-2 drop-shadow-[0_0_58px_rgba(255,0,200,1)]">
                                    <Search className="w-4 h-4 text-fuchsia-300 drop-shadow-[0_0_62px_rgba(255,0,200,1)]" />
                                    Categories
                                </div>
                            </div>

                            <div className="mt-3 space-y-2">
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
                                            title={isPrimary ? "Enter Suga4U" : "Coming next"}
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
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-6 text-fuchsia-200 text-sm drop-shadow-[0_0_44px_rgba(255,0,200,0.75)]">Account</div>
                        <div className="mt-2 space-y-3">
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    className="w-full rounded-xl border border-cyan-300/90 bg-black px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_28px_rgba(0,230,255,0.98),0_0_160px_rgba(0,230,255,0.78)] hover:shadow-[0_0_54px_rgba(0,230,255,1),0_0_220px_rgba(0,230,255,0.95)] drop-shadow-[0_0_54px_rgba(0,230,255,1)]"
                                    title="My Profile"
                                    onClick={() => router.push("/account/profile")}
                                >
                                    <User className="w-4 h-4" /> My Profile
                                </button>
                                <button
                                    className="w-full rounded-xl border border-cyan-300/90 bg-black px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_28px_rgba(0,230,255,0.98),0_0_160px_rgba(0,230,255,0.78)] hover:shadow-[0_0_54px_rgba(0,230,255,1),0_0_220px_rgba(0,230,255,0.95)] drop-shadow-[0_0_54px_rgba(0,230,255,1)]"
                                    title="Messages"
                                    onClick={() => router.push("/account/messages")}
                                >
                                    <MessageCircle className="w-4 h-4" /> Messages
                                </button>
                                <button
                                    className="w-full rounded-xl border border-fuchsia-300/90 bg-black px-3 py-2 text-sm text-fuchsia-300 hover:bg-fuchsia-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_30px_rgba(255,0,200,0.98),0_0_180px_rgba(255,0,200,0.82)] hover:shadow-[0_0_58px_rgba(255,0,200,1),0_0_240px_rgba(255,0,200,0.96)] drop-shadow-[0_0_58px_rgba(255,0,200,1)]"
                                    title="Notifications"
                                    onClick={() => router.push("/account/notifications")}
                                >
                                    <Bell className="w-4 h-4" /> Notifications
                                </button>
                                <button
                                    className="w-full rounded-xl border border-violet-300/90 bg-black px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/10 inline-flex items-center gap-2 justify-center shadow-[0_0_26px_rgba(170,80,255,0.98),0_0_150px_rgba(170,80,255,0.82)] hover:shadow-[0_0_46px_rgba(170,80,255,1),0_0_220px_rgba(170,80,255,0.95)] drop-shadow-[0_0_54px_rgba(170,80,255,1)]"
                                    title="Collections"
                                    onClick={() => router.push("/account/collections")}
                                >
                                    <Star className="w-4 h-4" /> Collections
                                </button>
                            </div>

                            <div className="border-t border-pink-500/15 pt-3" />
                            <NeonButton variant="ghost" className="w-full justify-start flex items-center gap-2" title="Log Out" onClick={() => router.push("/")}>
                                <LogOut className="w-4 h-4" /> Log Out
                            </NeonButton>
                        </div>
                    </div>
                </NeonCard>

                {/* Main grid */}
                <div className="lg:col-span-6">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-fr">
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

                {/* Right rail (feed) */}
                <NeonCard className="p-4 lg:col-span-4">
                    <div className="text-pink-200 text-sm mb-3">Creator Feed</div>
                    <div className="space-y-4">
                        {posts.map((post) => {
                            const isVideo = post.content_type === 'video';
                            const authorName = post.profiles?.username || "Unknown Creator";
                            const isFlashDrop = post.tags?.includes("Flash Drop") || false;
                            const isSuga4U = post.tags?.includes("Suga 4 U") || false;

                            return (
                                <div key={post.id} className="rounded-2xl border border-pink-500/15 bg-black/40 p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-300">@{authorName}</div>
                                        <span
                                            className={cx(
                                                "text-[10px] px-2 py-[2px] rounded-full border",
                                                isVideo ? "border-blue-500/25 text-blue-200" : "border-pink-500/20 text-pink-200"
                                            )}
                                        >
                                            {isVideo ? "Video" : "Photo"}
                                        </span>
                                    </div>

                                    <div className="mt-1 text-sm text-gray-100">
                                        {post.caption || (isVideo ? "New clip just dropped. Unlock to watch." : "New pics tonight. VIP gets first look.")}
                                    </div>

                                    <div
                                        onClick={() => router.push(`/profile/${post.user_id}`)}
                                        className="mt-3 rounded-2xl overflow-hidden border border-white/10 bg-black/30 cursor-pointer group hover:border-pink-500/40 transition-colors"
                                    >
                                        <div className="relative aspect-video bg-gradient-to-b from-pink-500/15 via-black to-blue-500/10 flex items-center justify-center">
                                            {/* Dynamic Content Image */}
                                            {(post.media_url || post.thumbnail_url) && (
                                                <img
                                                    src={post.media_url || post.thumbnail_url || ""}
                                                    alt="Post content"
                                                    className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                            )}

                                            {/* Overlay for icon if valid image provided, or keep generic if not? 
                                                If we have an image, maybe we don't need the icon as much, but 'Photo preview' logic 
                                                was essentially placeholder. Let's keep the icon overlay but maybe subtler if image exists.
                                                actually, user wants "work as dynamic". 
                                                If image exists, we show image. The 'Tap to view' badge is still good.
                                                The big centered Icon might obscure the image. Let's make it conditional/overlay.
                                            */}
                                            {!(post.media_url || post.thumbnail_url) && (
                                                isVideo ? (
                                                    <div className="flex items-center gap-2 text-blue-200">
                                                        <Video className="w-5 h-5" />
                                                        <span className="text-sm">Video preview</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-pink-200">
                                                        <ImageIcon className="w-5 h-5" />
                                                        <span className="text-sm">Photo preview</span>
                                                    </div>
                                                )
                                            )}

                                            <span className="absolute top-2 left-2 text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40 backdrop-blur-md">
                                                {isVideo ? "Tap to unlock" : "Tap to view"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        {isFlashDrop && (
                                            <span className="text-[10px] px-2 py-[2px] rounded-full border border-blue-500/25 text-blue-200">
                                                Flash Drop
                                            </span>
                                        )}
                                        {isSuga4U && (
                                            <span className="text-[10px] px-2 py-[2px] rounded-full border border-pink-500/20 text-pink-200">
                                                Suga 4 U
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        <NeonButton variant="ghost" className="flex-1 justify-center">
                                            Like
                                        </NeonButton>
                                        <NeonButton variant="pink" className="flex-1 justify-center">
                                            Unlock
                                        </NeonButton>
                                    </div>
                                </div>
                            );
                        })}
                        {posts.length === 0 && (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No recent updates.
                            </div>
                        )}
                    </div>
                </NeonCard>
            </div>
        </div>
    );
}

// ---- App shell -------------------------------------------------------------
export default function Home() {
    const router = useRouter();
    const { role, isLoading: authLoading, user } = useAuth();
    const [rooms, setRooms] = useState<any[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);

    const [currentProfile, setCurrentProfile] = useState<{ username: string | null, full_name: string | null } | null>(null);
    const supabase = createClient();

    // Fetch active rooms and posts
    useEffect(() => {
        const fetchContent = async () => {
            try {
                // Fetch rooms joined with host profile
                // Explicitly specifying !host_id to avoid ambiguous relationship errors
                const { data: roomsData, error: roomsError } = await supabase
                    .from('rooms')
                    .select('*, host:profiles!host_id(id, username, avatar_url, role)')
                    .eq('status', 'live');

                if (roomsError) console.error("Error fetching rooms:", roomsError);
                else {
                    // Fetch latest posts for these hosts to get background images
                    const hostIds = (roomsData || []).map(r => r.host?.id || r.host_id).filter(Boolean);

                    let activePostsStr: Record<string, any> = {};

                    if (hostIds.length > 0) {
                        // We want 1 latest post per user.
                        // Simplest efficient way in Supabase/Postgres is unclear without distinct on.
                        // We will just fetch all recent posts for these users and pick latest in JS.
                        const { data: hostPosts } = await supabase
                            .from('posts')
                            .select('user_id, media_url, thumbnail_url, created_at')
                            .in('user_id', hostIds)
                            .order('created_at', { ascending: false })
                            .limit(50); // Reasonable limit for homepage

                        if (hostPosts) {
                            hostPosts.forEach(p => {
                                // Since ordered by desc, first time we see a user_id, it's the latest
                                if (!activePostsStr[p.user_id]) {
                                    activePostsStr[p.user_id] = p;
                                }
                            });
                        }
                    }

                    const mapped = (roomsData || []).map(r => {
                        const hostId = r.host?.id || r.host_id;
                        const latestPost = activePostsStr[hostId];
                        const bgImage = latestPost
                            ? (latestPost.media_url || latestPost.thumbnail_url)
                            : r.cover_image;

                        return {
                            id: r.id,
                            userId: hostId, // Store host ID for profile navigation
                            name: r.host?.username || "Unknown Host",
                            level: "Star",
                            tags: [r.title, r.type || "General"],
                            avatar_url: r.host?.avatar_url,
                            cover_url: bgImage
                        };
                    });
                    setRooms(mapped);
                }

                // 2. Fetch Posts (Creator Feed)
                // 2. Fetch Posts (Creator Feed)
                // Filter to ONLY show posts from users with 'creator' role using !inner join
                // AND only show posts with visual content (media_url is not null)
                const { data: postsData, error: postsError } = await supabase
                    .from('posts')
                    .select('*, profiles!user_id!inner(username, avatar_url, role)')
                    .eq('profiles.role', 'creator')
                    .not('media_url', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (postsError) console.error("Error fetching posts:", postsError);
                else {
                    setPosts(postsData as unknown as Post[]);
                }

            } catch (err) {
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

    // Fetch current user profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('username, full_name')
                    .eq('id', user.id)
                    .single();

                if (data) setCurrentProfile(data);
            } catch (err) {
                console.error("Error fetching profile:", err);
            }
        };
        fetchProfile();
    }, [user]);

    const [homeQuery, setHomeQuery] = useState("");
    const [levelFilter, setLevelFilter] = useState<string | "All">("All");
    const [tagFilter, setTagFilter] = useState<string | "All">("All"); // Renamed for clarity in UI

    // NOTE: no fan-tier selector on Home per requirements; retained for Suga4U preview behavior.
    const [fanTier] = useState<BadgeTier>("Gold");

    // Filter logic removed (moved to HomeScreen)


    // Greeting / top-bar personalization (preview)
    const firstName = role === "creator" ? "Creator" : "Fan";
    const [revealWelcome, setRevealWelcome] = useState(false);
    useEffect(() => {
        const t = window.setTimeout(() => setRevealWelcome(true), 120);
        return () => window.clearTimeout(t);
    }, []);

    const showTierBadge = isHighTier(fanTier) && role !== "creator";
    const tierLabel = fanTier === "VIP" ? "VIP" : fanTier;

    if (authLoading) return null; // Or a loading spinner

    // ---- Creator Dashboard View --------------------------------------------
    if (role === "creator") {
        return (
            <div className="min-h-screen bg-black text-white p-8">
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
            `}</style>

                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-semibold text-white">Creator Studio Dashboard</h1>
                            <p className="text-gray-400 text-sm">Welcome back, @{currentProfile?.username || user?.user_metadata?.username || "Creator"}</p>
                        </div>
                        <NeonButton variant="ghost" className="flex items-center gap-2" onClick={() => router.push('/creator/dashboard')} title="Back">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </NeonButton>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Profile Card */}
                        <button
                            onClick={() => router.push(`/profile/${user?.id}`)}
                            className="rounded-2xl border border-cyan-400/30 bg-black/40 p-6 text-left hover:bg-white/5 transition group"
                        >
                            <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <User className="w-5 h-5 text-cyan-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-cyan-200 mb-1">My Profile</h3>
                            <p className="text-sm text-gray-400">View your profile, collection, and posts.</p>
                        </button>

                        {/* Upload Content Card */}
                        <CreatePostModal
                            currentUserId={user?.id || null}
                            onPostCreated={() => { }} // No feed to refresh here, maybe toast?
                            trigger={
                                <button
                                    className="w-full h-full rounded-2xl border border-green-400/30 bg-black/40 p-6 text-left hover:bg-white/5 transition group"
                                >
                                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                        <Upload className="w-5 h-5 text-green-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-green-200 mb-1">Upload Content</h3>
                                    <p className="text-sm text-gray-400">Post new photos, videos, or status updates.</p>
                                </button>
                            }
                        />

                        {/* Confessions Studio */}
                        <button
                            onClick={() => router.push("/creator/rooms/confessions")}
                            className="rounded-2xl border border-pink-500/30 bg-black/40 p-6 text-left hover:bg-white/5 transition group"
                        >
                            <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Lock className="w-5 h-5 text-pink-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-pink-200 mb-1">Confessions Studio</h3>
                            <p className="text-sm text-gray-400">Manage backlog, publish text/voice/video confessions.</p>
                        </button>

                        {/* X Chat Studio */}
                        <button
                            onClick={() => router.push("/creator/rooms/x-chat")}
                            className="rounded-2xl border border-yellow-400/30 bg-black/40 p-6 text-left hover:bg-white/5 transition group"
                        >
                            <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <MessageCircle className="w-5 h-5 text-yellow-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-yellow-200 mb-1">X Chat Console</h3>
                            <p className="text-sm text-gray-400">Moderate live chat, set slow mode, answer priority DMs.</p>
                        </button>

                        {/* Flash Drop Studio */}
                        <button
                            onClick={() => router.push("/creator/rooms/flash-drop")}
                            className="rounded-2xl border border-blue-400/30 bg-black/40 p-6 text-left hover:bg-white/5 transition group"
                        >
                            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Sparkles className="w-5 h-5 text-blue-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-blue-200 mb-1">Flash Drops</h3>
                            <p className="text-sm text-gray-400">Schedule limited-time drops and monitor sales.</p>
                        </button>

                        {/* Bar Lounge */}
                        <button
                            onClick={() => router.push("/rooms/bar-lounge")}
                            className="rounded-2xl border border-purple-400/30 bg-black/40 p-6 text-left hover:bg-white/5 transition group"
                        >
                            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <BarDrinkIcon className="w-5 h-5 text-purple-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-purple-200 mb-1">Bar Lounge</h3>
                            <p className="text-sm text-gray-400">Buy drinks and join the VIP booth.</p>
                        </button>

                        {/* Truth or Dare */}
                        <button
                            onClick={() => router.push("/rooms/truth-or-dare")}
                            className="rounded-2xl border border-emerald-400/30 bg-black/40 p-6 text-left hover:bg-white/5 transition group"
                        >
                            <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Video className="w-5 h-5 text-emerald-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-emerald-200 mb-1">Truth or Dare</h3>
                            <p className="text-sm text-gray-400">Join camera and send dares!</p>
                        </button>

                        {/* Suga 4 U */}
                        <button
                            onClick={() => router.push("/rooms/suga-4-u")}
                            className="rounded-2xl border border-pink-400/30 bg-black/40 p-6 text-left hover:bg-white/5 transition group"
                        >
                            <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Crown className="w-5 h-5 text-pink-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-pink-200 mb-1">Suga 4 U</h3>
                            <p className="text-sm text-gray-400">Unlock secrets and claim drops.</p>
                        </button>

                        {/* Competition Manager */}
                        <button
                            onClick={() => router.push("/competition")}
                            className="rounded-2xl border border-orange-400/30 bg-black/40 p-6 text-left hover:bg-white/5 transition group"
                        >
                            <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                <Trophy className="w-5 h-5 text-orange-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-orange-200 mb-1">Competition Manager</h3>
                            <p className="text-sm text-gray-400">Create battles, manage brackets & prizes.</p>
                        </button>
                    </div>
                </div>
            </div>
        );
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
                                title="High tier badge"
                            >
                                <Crown className="w-3 h-3" />
                                {tierLabel}
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

                    <div className="w-[220px]">
                        <Dropdown
                            tone="pink"
                            label={
                                <span className="inline-flex items-center gap-2">
                                    <User className="w-4 h-4" /> My Profile
                                </span>
                            }
                            items={[
                                { icon: <User className="w-4 h-4" />, text: "View Profile", onClick: () => router.push("/account/profile") },
                                { icon: <Settings className="w-4 h-4" />, text: "Edit Profile", onClick: () => router.push("/settings/profile") },
                                { icon: <CreditCard className="w-4 h-4" />, text: "Wallet/Card", onClick: () => router.push("/account/wallet") },
                                { icon: <Users className="w-4 h-4" />, text: "Subscription", onClick: () => router.push("/account/subscription") },
                                { icon: <Star className="w-4 h-4" />, text: "CollectionX", onClick: () => router.push("/account/collections") },
                                { icon: <Settings className="w-4 h-4" />, text: "Settings", onClick: () => router.push("/settings/profile") },
                                { icon: <LogOut className="w-4 h-4" />, text: "Log Out", onClick: async () => { await supabase.auth.signOut(); router.push("/"); } },
                            ]}
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
            />
        </div>
    );
}
