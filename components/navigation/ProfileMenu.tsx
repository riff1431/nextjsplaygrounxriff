"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, CreditCard, Crown, LogOut, Settings, Star, User, LayoutGrid, Briefcase, Award, Trophy, MessageSquare, Lock, Clock, X, HelpCircle, BookOpen, RotateCcw, ShieldCheck } from "lucide-react";
import { useKycStatus } from "@/components/onboarding/OnboardingGuard";
import { useGuidedTour } from "@/components/guided-tour/GuidedTourProvider";
import HelpGuideModal from "@/components/guided-tour/HelpGuideModal";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { DynamicIcon } from "@/components/admin/settings/IframeMenuManager";
import { useAuth } from "@/app/context/AuthContext";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function ProfileMenu({ user, profile, role, router, onSignOut }: any) {
    const supabase = createClient();
    const { updateRole } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isSwitchingRole, setIsSwitchingRole] = useState(false);
    const [iframeMenus, setIframeMenus] = useState<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const { isPending: isKycPending } = useKycStatus();

    const handleSwitchRole = async () => {
        if (!user || isSwitchingRole) return;
        setIsSwitchingRole(true);
        const newRole = role === "creator" ? "fan" : "creator";
        const toastId = toast.loading(`Switching to ${newRole === "creator" ? "Creator" : "Fan"} profile...`);

        try {
            // 1. Update profiles table role
            const { error: profileError } = await supabase
                .from("profiles")
                .update({ role: newRole })
                .eq("id", user.id);

            if (profileError) throw profileError;

            // 2. Update auth user metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { role: newRole }
            });

            if (authError) throw authError;

            // 3. Update React context role state
            updateRole(newRole);

            // Track that the role was explicitly switched in this session
            if (typeof window !== "undefined") {
                sessionStorage.setItem("role_switched", "true");
            }

            toast.success(`Switched to ${newRole === "creator" ? "Creator Hub" : "Fan View"}! ${newRole === "creator" ? "👑" : "🕶️"}`, { id: toastId });
            setIsOpen(false);

            // 4. Redirect
            if (newRole === "creator") {
                router.push("/rooms/creator-studio");
            } else {
                router.push("/home");
            }
        } catch (err: any) {
            console.error("Failed to switch profile:", err);
            toast.error(err.message || "Failed to switch profiles", { id: toastId });
        } finally {
            setIsSwitchingRole(false);
        }
    };

    // Fetch and subscribe to dynamic iframe menus matching user role
    useEffect(() => {
        const fetchIframeMenus = async () => {
            const { data, error } = await supabase
                .from("iframe_menus")
                .select("*")
                .order("created_at", { ascending: true });
            if (!error && data) {
                const filtered = data.filter((m: any) => {
                    if (role === "creator") {
                        return m.target_role === "creator" || m.target_role === "both";
                    } else {
                        return m.target_role === "fan" || m.target_role === "both";
                    }
                });
                setIframeMenus(filtered);
            }
        };

        fetchIframeMenus();

        const channel = supabase
            .channel("realtime-profile-menu-iframe-menus")
            .on("postgres_changes", { event: "*", schema: "public", table: "iframe_menus" }, () => {
                fetchIframeMenus();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [role]);
    const { startTour } = useGuidedTour();
    const [isMobile, setIsMobile] = useState(false);
    const [helpExpanded, setHelpExpanded] = useState(false);
    const [activeGuide, setActiveGuide] = useState<"wallet" | "rooms" | "payouts" | null>(null);
    const [mounted, setMounted] = useState(false);

    // Detect mobile and set mounted
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

    // Close on click outside (desktop only)
    useEffect(() => {
        if (isMobile) return;
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMobile]);

    // Lock body scroll when mobile sheet is open
    useEffect(() => {
        if (isMobile && isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isMobile, isOpen]);

    const menuVars = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }
    };

    /**
     * Handle clicks on locked menu items when KYC is pending.
     */
    const handleLockedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toast.info("🔒 ID verification is pending. This feature will unlock once your identity is verified.", {
            duration: 4000,
        });
    };

    /**
     * Renders a menu item that may be locked when KYC is pending.
     */
    const renderMenuItem = (
        label: string,
        icon: React.ReactNode,
        path: string,
        isLocked: boolean,
        extraClassName?: string,
    ) => {
        if (isLocked) {
            return (
                <button
                    onClick={handleLockedClick}
                    className={cx(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm cursor-not-allowed opacity-40",
                        "text-gray-500",
                        extraClassName
                    )}
                >
                    <div className="flex items-center gap-3">
                        {icon}
                        {label}
                    </div>
                    <Lock className="w-3.5 h-3.5 text-yellow-500/70" />
                </button>
            );
        }

        return (
            <button
                onClick={() => { router.push(path); setIsOpen(false); }}
                className={cx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm group",
                    extraClassName
                )}
            >
                {icon}
                {label}
            </button>
        );
    };

    const menuPanelContent = (
        <>
            {/* KYC Pending Banner */}
            {isKycPending && (
                <div className="px-4 py-2.5 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-b border-yellow-500/20 flex items-center gap-2.5">
                    <div className="relative flex-shrink-0">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-yellow-300">ID Verification Pending</span>
                        <p className="text-[10px] text-yellow-400/60 leading-tight">Some features are locked until verified</p>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="p-5 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent relative">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-[50px] pointer-events-none" />

                {/* Mobile Close Button */}
                {isMobile && (
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition z-20"
                        aria-label="Close menu"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                <div className="relative z-10 flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl p-[2px] bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 shadow-lg shadow-pink-500/20 shrink-0">
                        <div className="w-full h-full rounded-[14px] bg-black overflow-hidden">
                            {(profile?.avatar_url || user?.user_metadata?.avatar_url) ? (
                                <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                    <User className="w-6 h-6 text-zinc-400" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="text-base font-bold text-white truncate">
                            {profile?.full_name || user?.user_metadata?.full_name || "User"}
                        </h3>
                        <p className="text-xs text-pink-300/80 items-center gap-1 flex mb-2 truncate">
                            @{profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || "username"}
                        </p>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 no-underline">
                            <div className={cx("w-1.5 h-1.5 rounded-full", role === 'creator' ? "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" : "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]")} />
                            <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-300">
                                {role === 'creator' ? 'Creator Account' : 'Fan Account'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Switcher Section */}
            {(role === "creator" || profile?.is_creator) && (
                <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01]">
                    <button
                        onClick={handleSwitchRole}
                        disabled={isSwitchingRole}
                        className={cx(
                            "w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 group relative overflow-hidden text-left",
                            role === "creator"
                                ? "border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.05)] cursor-pointer"
                                : "border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10 hover:border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.05)] cursor-pointer"
                        )}
                    >
                        {/* Glow effect on hover */}
                        <div className={cx(
                            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-md",
                            role === "creator" ? "bg-cyan-500/10" : "bg-pink-500/10"
                        )} />

                        <div className="relative z-10 flex items-center gap-3">
                            <div className={cx(
                                "p-2 rounded-xl border transition-all duration-300",
                                role === "creator"
                                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:scale-110"
                                    : "bg-pink-500/10 border-pink-500/20 text-pink-400 group-hover:scale-110"
                            )}>
                                {role === "creator" ? <User className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                            </div>
                            <div className="text-left">
                                <span className="block text-xs font-semibold text-white">
                                    {role === "creator" ? "Switch to Fan View" : "Switch to Creator Hub"}
                                </span>
                                <span className="text-[10px] text-zinc-400 leading-none block mt-0.5 font-sans">
                                    {role === "creator" ? "Browse & support other creators" : "Go live & manage your studio"}
                                </span>
                            </div>
                        </div>

                        <div className={cx(
                            "p-1.5 rounded-full border transition-transform duration-500",
                            role === "creator"
                                ? "border-cyan-500/10 text-cyan-400 group-hover:rotate-180"
                                : "border-pink-500/10 text-pink-400 group-hover:rotate-180"
                        )}>
                            {isSwitchingRole ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                    <path d="M16 16h5v5" />
                                </svg>
                            )}
                        </div>
                    </button>
                </div>
            )}

            {/* Quick Actions */}
            <div className="p-3 grid grid-cols-2 gap-2">
                {isKycPending ? (
                    <>
                        <button onClick={handleLockedClick} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-not-allowed opacity-40">
                            <div className="relative">
                                <CreditCard className="w-5 h-5 text-gray-500" />
                                <Lock className="w-2.5 h-2.5 text-yellow-500/70 absolute -bottom-0.5 -right-1" />
                            </div>
                            <span className="text-xs text-gray-500">Wallet</span>
                        </button>
                        <button onClick={handleLockedClick} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-not-allowed opacity-40">
                            <div className="relative">
                                <Award className="w-5 h-5 text-gray-500" />
                                <Lock className="w-2.5 h-2.5 text-yellow-500/70 absolute -bottom-0.5 -right-1" />
                            </div>
                            <span className="text-xs text-gray-500">Membership</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => { router.push('/account/wallet'); setIsOpen(false); }} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-pink-500/30 transition-all group">
                            <CreditCard className="w-5 h-5 text-blue-300 group-hover:text-blue-200 group-hover:scale-110 transition-transform" />
                            <span className="text-xs text-gray-300">Wallet</span>
                        </button>
                        <button onClick={() => { router.push(role === 'creator' ? '/account/creator-levels' : '/account/membership'); setIsOpen(false); }} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-amber-500/30 transition-all group">
                            <Award className="w-5 h-5 text-amber-400 group-hover:text-amber-300 group-hover:scale-110 transition-transform" />
                            <span className="text-xs text-gray-300">Membership</span>
                        </button>
                    </>
                )}
            </div>

            {/* Menu Items List */}
            <div className="px-2 pb-4">
                <div className="space-y-0.5">
                    {role === 'admin' && (
                        <button onClick={() => { router.push('/admin/dashboard'); setIsOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pink-500/10 text-pink-200 hover:text-pink-100 transition-colors text-sm group border border-pink-500/20 mb-1">
                            <Briefcase className="w-4 h-4 text-pink-400 group-hover:text-pink-300 transition-colors" />
                            Business Console
                        </button>
                    )}

                    {renderMenuItem(
                        "Feed",
                        <LayoutGrid className={cx("w-4 h-4", isKycPending ? "text-gray-600" : "text-gray-500 group-hover:text-pink-400 transition-colors")} />,
                        "/account/subscribed-feed",
                        isKycPending
                    )}

                    {/* Profile — always accessible */}
                    {renderMenuItem(
                        "Profile",
                        <User className="w-4 h-4 text-gray-500 group-hover:text-pink-400 transition-colors" />,
                        "/account/profile",
                        false
                    )}

                    {/* Verification — creator status page link */}
                    {role === "creator" && renderMenuItem(
                        "Verification",
                        <ShieldCheck className="w-4 h-4 text-gray-500 group-hover:text-pink-400 transition-colors" />,
                        "/kyc-verification",
                        false
                    )}

                    {/* Collections — locked when KYC pending */}
                    {renderMenuItem(
                        "Collections",
                        <Star className={cx("w-4 h-4", isKycPending ? "text-gray-600" : "text-gray-500 group-hover:text-purple-400 transition-colors")} />,
                        "/account/collections",
                        isKycPending
                    )}

                    {/* Membership — locked when KYC pending */}
                    {renderMenuItem(
                        "Membership",
                        <Award className={cx("w-4 h-4", isKycPending ? "text-gray-600" : "text-gray-500 group-hover:text-amber-400 transition-colors")} />,
                        role === 'creator' ? '/account/creator-levels' : '/account/membership',
                        isKycPending
                    )}

                    {/* Settings — locked when KYC pending */}
                    {renderMenuItem(
                        "Settings",
                        <Settings className={cx("w-4 h-4", isKycPending ? "text-gray-600" : "text-gray-500 group-hover:text-cyan-400 transition-colors")} />,
                        "/settings/profile",
                        isKycPending
                    )}

                    {/* Switch Profile — always accessible if creator */}
                    {(role === "creator" || profile?.is_creator) && (
                        <button
                            onClick={handleSwitchRole}
                            disabled={isSwitchingRole}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm group cursor-pointer"
                        >
                            <User className="w-4 h-4 text-gray-500 group-hover:text-pink-400 transition-colors" />
                            {role === "creator" ? "Switch to Fan Profile" : "Switch to Creator Profile"}
                        </button>
                    )}

                    {/* Dynamic Iframe Menus */}
                    {iframeMenus.map((menu) => (
                        <button
                            key={menu.id}
                            onClick={() => { router.push(`/iframe/${menu.id}`); setIsOpen(false); }}
                            className={cx(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm group"
                            )}
                        >
                            <DynamicIcon name={menu.icon} className="w-4 h-4 text-gray-500 group-hover:text-pink-400 transition-colors" />
                            <span className="truncate">{menu.name}</span>
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="my-2 h-px bg-white/5 w-full" />

                {/* Help & Tutorials */}
                <div className="space-y-0.5">
                    <button
                        onClick={() => setHelpExpanded(!helpExpanded)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-colors text-sm group"
                    >
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                            Help & Tutorials
                        </div>
                        <ChevronDown className={cx("w-3.5 h-3.5 text-gray-500 transition-transform duration-200", helpExpanded && "rotate-180")} />
                    </button>

                    {helpExpanded && (
                        <div className="ml-3 pl-4 border-l border-white/5 space-y-0.5">
                            {role !== 'creator' && (
                                <button
                                    onClick={() => { setIsOpen(false); startTour('fan'); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-xs"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Restart Fan Tour
                                </button>
                            )}
                            {role === 'creator' && (
                                <button
                                    onClick={() => { setIsOpen(false); startTour('creator'); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-xs"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Restart Creator Tour
                                </button>
                            )}

                            <div className="my-1.5 h-px bg-white/5" />

                            <button
                                onClick={() => { setIsOpen(false); setActiveGuide('wallet'); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-xs"
                            >
                                <BookOpen className="w-3 h-3" />
                                How Wallet Works
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); setActiveGuide('rooms'); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-xs"
                            >
                                <BookOpen className="w-3 h-3" />
                                How Rooms Work
                            </button>
                            {role === 'creator' && (
                                <button
                                    onClick={() => { setIsOpen(false); setActiveGuide('payouts'); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors text-xs"
                                >
                                    <BookOpen className="w-3 h-3" />
                                    How Payouts Work
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="my-2 h-px bg-white/5 w-full" />

                <button
                    onClick={() => { setIsOpen(false); onSignOut(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-300/80 hover:text-red-200 transition-colors text-sm group"
                >
                    <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Sign Out
                </button>
            </div>
        </>
    );

    return (
        <div className="relative z-50" ref={containerRef} data-tour="wallet-button">
            {/* Trigger Button */}
            {isMobile ? (
                /* ── Mobile: borderless circular avatar ── */
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cx(
                        "relative flex items-center justify-center w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 to-blue-500 hover:scale-105 active:scale-95 transition-all duration-300 shrink-0",
                        isOpen ? "shadow-[0_0_12px_rgba(236,72,153,0.4)] ring-1 ring-pink-500/50" : "shadow-[0_0_6px_rgba(236,72,153,0.15)]"
                    )}
                >
                    <div className="w-full h-full rounded-full bg-black overflow-hidden relative">
                        {(profile?.avatar_url || user?.user_metadata?.avatar_url) ? (
                            <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                <User className="w-4 h-4 text-zinc-400" />
                            </div>
                        )}
                    </div>
                </button>
            ) : (
                /* ── Desktop: capsule with name and chevron ── */
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cx(
                        "flex items-center gap-2 pl-2 pr-3 sm:pr-4 py-1.5 rounded-full transition-all duration-300",
                        "border border-pink-500/20 bg-black/40 hover:bg-white/5 hover:border-pink-500/40",
                        isOpen && "bg-white/10 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                    )}
                >
                    {/* Avatar Circle */}
                    <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 to-blue-500 shrink-0">
                        <div className="w-full h-full rounded-full bg-black overflow-hidden relative">
                            {(profile?.avatar_url || user?.user_metadata?.avatar_url) ? (
                                <img src={profile?.avatar_url || user?.user_metadata?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                    <User className="w-4 h-4 text-zinc-400" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Name & Chevron — hide name text on very small screens */}
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="text-sm font-medium text-pink-100 max-w-[100px] truncate">
                            {profile?.username || user?.user_metadata?.username || "My Profile"}
                        </span>
                        <ChevronDown className={cx("w-4 h-4 text-pink-300/70 transition-transform duration-300", isOpen && "rotate-180")} />
                    </div>
                    {/* On tiny screens just show the chevron */}
                    <ChevronDown className={cx("w-4 h-4 text-pink-300/70 transition-transform duration-300 sm:hidden", isOpen && "rotate-180")} />
                </button>
            )}

            {/* Dropdown / Bottom-Sheet */}
            {mounted && isMobile && typeof document !== "undefined" ? (
                createPortal(
                    <AnimatePresence>
                        {isOpen && (
                            <>
                                {/* Backdrop */}
                                <motion.div
                                    key="profile-backdrop"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm"
                                    onClick={() => setIsOpen(false)}
                                />
                                {/* Sheet */}
                                <motion.div
                                    key="profile-sheet"
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="fixed bottom-0 left-0 right-0 z-[101] rounded-t-3xl border-t border-l border-r border-pink-500/25 bg-[#0d0d14] backdrop-blur-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                                >
                                    {/* Drag handle */}
                                    <div className="flex justify-center pt-3 pb-1.5 sticky top-0 bg-[#0d0d14] z-10 shrink-0">
                                        <div className="w-10 h-1 rounded-full bg-white/20" />
                                    </div>
                                    <div className="overflow-y-auto flex-1 pb-4">
                                        {menuPanelContent}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>,
                    document.body
                )
            ) : (
                <AnimatePresence>
                    {isOpen && (
                        /* ── Desktop: dropdown ── */
                        <motion.div
                            key="profile-dropdown"
                            variants={menuVars}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="absolute right-0 top-full mt-3 w-80 rounded-2xl overflow-hidden border border-pink-500/25 bg-black/85 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(236,72,153,0.1)]"
                        >
                            {menuPanelContent}
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Help Guide Modal */}
            {activeGuide && (
                <HelpGuideModal
                    guide={activeGuide}
                    onClose={() => setActiveGuide(null)}
                />
            )}
        </div>
    );
}
