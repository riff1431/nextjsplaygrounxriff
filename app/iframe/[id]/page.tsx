"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    ArrowLeft, Search, RefreshCw, MessageSquare, Menu, X, Sparkles, 
    Lock, MessageCircle, Crown, Star, Users, Flame, LogOut, HelpCircle, Heart 
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import ProfileMenu from "@/components/navigation/ProfileMenu";
import BrandLogo from "@/components/common/BrandLogo";
import { NotificationIcon } from "@/components/common/NotificationIcon";
import { DynamicIcon } from "@/components/admin/settings/IframeMenuManager";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

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

function toneClasses(tone: string) {
    switch (tone) {
        case "green":
            return {
                text: "text-emerald-400 drop-shadow-[0_0_22px_rgba(0,255,170,1)] neon-deep",
                icon: "text-emerald-400 drop-shadow-[0_0_26px_rgba(0,255,170,1)]",
                border: "border-emerald-400/90",
                glow: "shadow-[0_0_18px_rgba(0,255,170,0.85),0_0_60px_rgba(0,255,170,0.45)] hover:shadow-[0_0_26px_rgba(0,255,170,0.95),0_0_90px_rgba(0,255,170,0.65)]",
                hover: "hover:bg-emerald-500/8",
            };
        case "purple":
            return {
                text: "text-violet-400 drop-shadow-[0_0_22px_rgba(170,80,255,1)] neon-deep",
                icon: "text-violet-400 drop-shadow-[0_0_26px_rgba(170,80,255,1)]",
                border: "border-violet-400/90",
                glow: "shadow-[0_0_18px_rgba(170,80,255,0.85),0_0_60px_rgba(170,80,255,0.45)] hover:shadow-[0_0_26px_rgba(170,80,255,0.95),0_0_90px_rgba(170,80,255,0.65)]",
                hover: "hover:bg-violet-500/8",
            };
        case "red":
            return {
                text: "text-rose-400 drop-shadow-[0_0_22px_rgba(255,55,95,1)] neon-deep",
                icon: "text-rose-400 drop-shadow-[0_0_26px_rgba(255,55,95,1)]",
                border: "border-rose-400/90",
                glow: "shadow-[0_0_18px_rgba(255,55,95,0.85),0_0_60px_rgba(255,55,95,0.45)] hover:shadow-[0_0_26px_rgba(255,55,95,0.95),0_0_90px_rgba(255,55,95,0.65)]",
                hover: "hover:bg-rose-500/8",
            };
        case "blue":
            return {
                text: "text-cyan-300 drop-shadow-[0_0_22px_rgba(0,230,255,1)] neon-deep",
                icon: "text-cyan-300 drop-shadow-[0_0_26px_rgba(0,230,255,1)]",
                border: "border-cyan-300/90",
                glow: "shadow-[0_0_18px_rgba(0,230,255,0.85),0_0_60px_rgba(0,230,255,0.45)] hover:shadow-[0_0_26px_rgba(0,230,255,0.95),0_0_90px_rgba(0,230,255,0.65)]",
                hover: "hover:bg-cyan-500/8",
            };
        case "yellow":
            return {
                text: "text-lime-300 drop-shadow-[0_0_22px_rgba(200,255,0,1)] neon-deep",
                icon: "text-lime-300 drop-shadow-[0_0_26px_rgba(200,255,0,1)]",
                border: "border-lime-300/90",
                glow: "shadow-[0_0_18px_rgba(200,255,0,0.85),0_0_60px_rgba(200,255,0,0.45)] hover:shadow-[0_0_26px_rgba(200,255,0,0.95),0_0_90px_rgba(200,255,0,0.65)]",
                hover: "hover:bg-lime-500/8",
            };
        case "pink":
        default:
            return {
                text: "text-pink-400 drop-shadow-[0_0_22px_rgba(236,72,153,1)] neon-deep",
                icon: "text-pink-400 drop-shadow-[0_0_26px_rgba(236,72,153,1)]",
                border: "border-pink-400/90",
                glow: "shadow-[0_0_18px_rgba(236,72,153,0.85),0_0_60px_rgba(236,72,153,0.45)] hover:shadow-[0_0_26px_rgba(236,72,153,0.95),0_0_90px_rgba(236,72,153,0.65)]",
                hover: "hover:bg-pink-500/8",
            };
    }
}

const CATS = [
    { label: "Flash Drops", key: "drops", icon: <Sparkles className="w-4 h-4" />, tone: "blue", route: "/rooms/flash-drop-sessions", roomType: "flash-drop" },
    { label: "Confessions", key: "conf", icon: <Lock className="w-4 h-4" />, tone: "red", route: "/rooms/confessions-browse", roomType: "confessions" },
    { label: "X Chat", key: "xchat", icon: <MessageCircle className="w-4 h-4" />, tone: "yellow", route: "/rooms/x-chat-sessions", roomType: "x-chat" },
    { label: "Bar Lounge", key: "bar", icon: <BarDrinkIcon className="w-4 h-4" />, tone: "purple", route: "/rooms/bar-lounge", roomType: "bar-lounge" },
    { label: "Truth or Dare", key: "truth", icon: <MessageCircle className="w-4 h-4" />, tone: "green", route: "/rooms/truth-or-dare-sessions", roomType: "truth-or-dare" },
    { label: "Suga 4 U", key: "suga4u", icon: <Crown className="w-4 h-4" />, tone: "pink", primary: true, route: "/rooms/suga4u-sessions", roomType: "suga-4-u" },
];

export default function IframeWrapperPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { user, role, logout } = useAuth();
    const { roomSettings: activeStatuses } = useTheme();
    const supabase = createClient();

    // State for target iframe details
    const [menuItem, setMenuItem] = useState<any>(null);
    const [allMenus, setAllMenus] = useState<any[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("username, full_name, avatar_url")
                .eq("id", user.id)
                .single();
            if (data) setProfile(data);
        };
        fetchProfile();
    }, [user]);

    const fetchMenuDetails = async () => {
        setLoading(true);
        // 1. Fetch current menu item
        const { data: currentMenu, error: currentError } = await supabase
            .from("iframe_menus")
            .select("*")
            .eq("id", params.id)
            .single();

        if (currentError) {
            console.error("Error loading menu item:", currentError);
        } else {
            setMenuItem(currentMenu);
        }

        // 2. Fetch all menus for sidebar rendering
        const { data: list, error: listError } = await supabase
            .from("iframe_menus")
            .select("*")
            .order("created_at", { ascending: true });

        if (!listError && list) {
            setAllMenus(list);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMenuDetails();

        // Realtime subscription for updates
        const channel = supabase
            .channel("realtime-iframe-menus-page")
            .on("postgres_changes", { event: "*", schema: "public", table: "iframe_menus" }, () => {
                fetchMenuDetails();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [params.id]);

    const filteredMenus = allMenus.filter(m => m.target_role === "fan" || m.target_role === "both");

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-pink-500 font-bold gap-3">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span>Loading App...</span>
            </div>
        );
    }

    if (!menuItem) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
                    <X className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">App Not Found</h2>
                <p className="text-gray-500 text-sm max-w-sm mb-6">
                    The requested menu item does not exist or has been removed by the administrator.
                </p>
                <button
                    onClick={() => router.push(role === "creator" ? "/rooms/creator-studio" : "/home")}
                    className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold transition"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    // Role check
    const isAllowed = menuItem.target_role === "both" || menuItem.target_role === role || role === "admin";
    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-yellow-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-gray-500 text-sm max-w-sm mb-6">
                    You do not have the required permissions to view this option.
                </p>
                <button
                    onClick={() => router.push(role === "creator" ? "/rooms/creator-studio" : "/home")}
                    className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold transition"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    // ─── RENDER CREATOR VIEW ───
    if (role === "creator") {
        return (
            <ProtectRoute allowedRoles={["creator", "admin"]}>
                <div className="cs-theme min-h-screen relative p-3 sm:p-4 md:p-8 max-w-[1600px] mx-auto flex flex-col gap-6 z-10">
                    {/* Background */}
                    <div
                        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
                        style={{ backgroundImage: "url('/rooms/creator-studio-bg.jpg')" }}
                    />
                    <div className="fixed inset-0 bg-black/60 -z-10" />

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-pink-500/25 pb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push("/rooms/creator-studio")}
                                className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 font-medium flex items-center gap-2 transition"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Studio
                            </button>
                            <h1 className="text-2xl sm:text-3xl cs-font-display italic cs-neon-text-pink flex items-center gap-2">
                                <DynamicIcon name={menuItem.icon} className="w-6 h-6 shrink-0" />
                                {menuItem.name}
                            </h1>
                        </div>
                        <div className="relative z-50">
                            <ProfileMenu
                                user={user}
                                profile={profile}
                                role="creator"
                                router={router}
                                onSignOut={logout}
                            />
                        </div>
                    </div>

                    {/* Full Height Iframe Container */}
                    <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl p-1.5 md:p-3 relative overflow-hidden backdrop-blur-md shadow-2xl h-[calc(100vh-170px)]">
                        <iframe
                            src={menuItem.url}
                            className="w-full h-full rounded-2xl border-none bg-black"
                            allowFullScreen
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        />
                    </div>
                </div>
            </ProtectRoute>
        );
    }

    // ─── RENDER FAN VIEW (Header + Sidebar Category Menu + Iframe) ───
    const currentTone = toneClasses(menuItem.color);
    return (
        <ProtectRoute allowedRoles={["fan", "admin"]}>
            <div className="min-h-screen bg-black text-white flex flex-col">
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

                {/* Mobile Drawer Menu */}
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                        <div 
                            className="w-64 bg-zinc-950/95 border-r border-pink-500/25 h-full p-5 flex flex-col justify-between"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                    <button onClick={() => { setIsSidebarOpen(false); router.push("/home"); }}>
                                        <BrandLogo showBadge={false} />
                                    </button>
                                    <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">Browse Room</div>
                                    {/* Static categories */}
                                    {CATS.filter(cat => activeStatuses[cat.roomType] !== false).map(cat => {
                                        const t = toneClasses(cat.tone);
                                        return (
                                            <button
                                                key={cat.key}
                                                onClick={() => { setIsSidebarOpen(false); router.push(cat.route); }}
                                                className={cx("w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55", t.border, t.glow, t.hover)}
                                            >
                                                <span className={cx("inline-flex items-center gap-2 w-full justify-between neon-flicker", t.text)}>
                                                    <span className="inline-flex items-center gap-2">
                                                        <span>{cat.icon}</span>
                                                        <span className="truncate neon-deep">{cat.label}</span>
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}

                                    {/* Dynamic categories */}
                                    {filteredMenus.map(menu => {
                                        const t = toneClasses(menu.color);
                                        const isActive = menuItem.id === menu.id;
                                        return (
                                            <button
                                                key={menu.id}
                                                onClick={() => { setIsSidebarOpen(false); router.push(`/iframe/${menu.id}`); }}
                                                className={cx(
                                                    "w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55",
                                                    t.border,
                                                    t.glow,
                                                    t.hover,
                                                    isActive && "ring-2 ring-pink-500/50 bg-pink-500/10"
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
                            </div>

                            {/* Account footer inside Drawer */}
                            <div className="pt-4 border-t border-white/10 mt-auto space-y-2">
                                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">My Account</div>
                                <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/collections")}>
                                    <Star className="w-4 h-4" /> Collections
                                </button>
                                <button className="w-full rounded-xl border border-emerald-500/50 bg-black px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/suggestions")}>
                                    <MessageSquare className="w-4 h-4 text-emerald-300" /> Suggestions
                                </button>
                                <button className="w-full rounded-xl border border-blue-500/50 bg-black px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/subscription")}>
                                    <Users className="w-4 h-4 text-blue-300" /> Subscriptions
                                </button>
                                <button className="w-full rounded-xl border border-pink-500/50 bg-black px-3 py-2 text-sm text-pink-200 hover:bg-pink-500/10 inline-flex items-center gap-2 justify-start transition animate-pulse" onClick={() => router.push("/newsfeed")}>
                                    <Flame className="w-4 h-4 text-pink-400" /> NewsFeed
                                </button>
                                <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition" onClick={logout}>
                                    <LogOut className="w-4 h-4" /> Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <header className="sticky top-0 z-40 px-4 sm:px-6 py-3 border-b border-pink-500/20 bg-black/80 backdrop-blur-xl">
                    <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition"
                                title="Open menu"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <button onClick={() => router.push("/home")} className="flex items-center gap-2 select-none text-left" title="Back to Home">
                                <BrandLogo showBadge={false} />
                            </button>
                            <div className="hidden sm:flex items-center gap-2 text-sm">
                                <div className={cx("w-2 h-2 rounded-full bg-pink-500 animate-pulse", currentTone.glow)} />
                                <span className={cx("font-bold neon-deep", currentTone.text)}>{menuItem.name}</span>
                            </div>
                        </div>

                        {/* Top Right Header Controls */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push('/account/messages')}
                                className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition"
                                title="Messages"
                            >
                                <MessageSquare className="w-5 h-5" />
                            </button>
                            <NotificationIcon role="fan" />
                            <ProfileMenu
                                user={user}
                                profile={profile}
                                role={role}
                                router={router}
                                onSignOut={logout}
                            />
                        </div>
                    </div>
                </header>

                {/* Main Layout Grid */}
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 flex gap-6 items-start w-full flex-1">
                    {/* Left Rail Sidebar */}
                    <aside className="w-48 shrink-0 hidden lg:block sticky top-20 h-[calc(100vh-120px)]">
                        <div className="rounded-2xl border border-pink-500/25 bg-black p-4 shadow-[0_0_24px_rgba(236,72,153,0.14),0_0_56px_rgba(59,130,246,0.08)] relative overflow-hidden h-full flex flex-col">
                            {/* Ambient glow behind tiles */}
                            <div className="pointer-events-none absolute inset-0 opacity-55">
                                <div className="absolute -inset-12 blur-3xl bg-[radial-gradient(circle_at_25%_20%,rgba(255,0,200,0.30),transparent_55%),radial-gradient(circle_at_80%_35%,rgba(0,230,255,0.22),transparent_60%)]" />
                            </div>

                            <div className="relative flex flex-col justify-between flex-1 h-full space-y-6 lg:space-y-0">
                                <div className="space-y-6">
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 mt-3 px-1">Browse Room</div>
                                        <div className="mt-1 space-y-2">
                                            {/* Static Categories */}
                                            {CATS.filter(cat => activeStatuses[cat.roomType] !== false).map(cat => {
                                                const t = toneClasses(cat.tone);
                                                return (
                                                    <button
                                                        key={cat.key}
                                                        onClick={() => router.push(cat.route)}
                                                        className={cx("w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55", t.border, t.glow, t.hover)}
                                                    >
                                                        <span className={cx("inline-flex items-center gap-2 w-full justify-between neon-flicker", t.text)}>
                                                            <span className="inline-flex items-center gap-2">
                                                                <span>{cat.icon}</span>
                                                                <span className="truncate neon-deep">{cat.label}</span>
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            })}

                                            {/* Dynamic Categories */}
                                            {filteredMenus.map(menu => {
                                                const t = toneClasses(menu.color);
                                                const isActive = menuItem.id === menu.id;
                                                return (
                                                    <button
                                                        key={menu.id}
                                                        onClick={() => router.push(`/iframe/${menu.id}`)}
                                                        className={cx(
                                                            "w-full text-left px-3 py-2 rounded-xl border text-sm transition bg-black/55",
                                                            t.border,
                                                            t.glow,
                                                            t.hover,
                                                            isActive && "ring-2 ring-pink-500/50 bg-pink-500/10 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
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
                                    </div>
                                </div>

                                {/* My Account Footer menu */}
                                <div className="pt-4 border-t border-white/10 lg:mt-auto">
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">My Account</div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/collections")}>
                                            <Star className="w-4 h-4" /> Collections
                                        </button>
                                        <button className="w-full rounded-xl border border-emerald-500/50 bg-black px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/suggestions")}>
                                            <MessageSquare className="w-4 h-4" /> Suggestions
                                        </button>
                                        <button className="w-full rounded-xl border border-blue-500/50 bg-black px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/account/subscription")}>
                                            <Users className="w-4 h-4" /> Subscriptions
                                        </button>
                                        <button className="w-full rounded-xl border border-pink-500/50 bg-black px-3 py-2 text-sm text-pink-200 hover:bg-pink-500/10 inline-flex items-center gap-2 justify-start transition" onClick={() => router.push("/newsfeed")}>
                                            <Flame className="w-4 h-4 text-pink-400" /> NewsFeed
                                        </button>
                                        <button className="w-full rounded-xl border border-white/20 bg-black px-3 py-2 text-sm text-gray-200 hover:bg-white/10 inline-flex items-center gap-2 justify-start transition" onClick={logout}>
                                            <LogOut className="w-4 h-4" /> Log Out
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Full-Height Iframe View */}
                    <main className="flex-1 bg-black/45 border border-white/5 rounded-3xl p-1.5 md:p-3 relative overflow-hidden backdrop-blur-md shadow-2xl h-[calc(100vh-170px)] w-full">
                        <iframe
                            src={menuItem.url}
                            className="w-full h-full rounded-2xl border-none bg-black"
                            allowFullScreen
                            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        />
                    </main>
                </div>
            </div>
        </ProtectRoute>
    );
}
