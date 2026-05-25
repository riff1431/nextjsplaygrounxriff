"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, CreditCard, Crown, LogOut, Settings, Star, User, LayoutGrid, Briefcase, Award, Trophy, MessageSquare, Lock, Clock } from "lucide-react";
import { useKycStatus } from "@/components/onboarding/OnboardingGuard";
import { toast } from "sonner";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function ProfileMenu({ user, profile, role, router, onSignOut }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const { isPending: isKycPending } = useKycStatus();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const menuVars = {
        hidden: { opacity: 0, y: -10, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }
    };

    /**
     * Handle clicks on locked menu items when KYC is pending.
     * Shows a toast instead of navigating.
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
     * Profile is never locked; everything else is locked when isKycPending is true.
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
                onClick={() => router.push(path)}
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

    return (
        <div className="relative z-50" ref={containerRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cx(
                    "flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full transition-all duration-300",
                    "border border-pink-500/20 bg-black/40 hover:bg-white/5 hover:border-pink-500/40",
                    isOpen && "bg-white/10 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                )}
            >
                {/* Avatar Circle */}
                <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 to-blue-500">
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

                {/* Name & Chevron */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-pink-100 max-w-[100px] truncate">
                        {profile?.username || user?.user_metadata?.username || "My Profile"}
                    </span>
                    <ChevronDown className={cx("w-4 h-4 text-pink-300/70 transition-transform duration-300", isOpen && "rotate-180")} />
                </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={menuVars}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute right-0 top-full mt-3 w-80 rounded-2xl overflow-hidden border border-pink-500/25 bg-black/85 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(236,72,153,0.1)]"
                    >
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

                            <div className="relative z-10 flex items-start gap-4">
                                <div className="w-14 h-14 rounded-2xl p-[2px] bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 shadow-lg shadow-pink-500/20">
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
                                    <p className="text-xs text-pink-300/80 items-center gap-1 flex mb-2">
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
                                    <button onClick={() => router.push('/account/wallet')} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-pink-500/30 transition-all group">
                                        <CreditCard className="w-5 h-5 text-blue-300 group-hover:text-blue-200 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs text-gray-300">Wallet</span>
                                    </button>
                                    <button onClick={() => router.push(role === 'creator' ? '/account/creator-levels' : '/account/membership')} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-amber-500/30 transition-all group">
                                        <Award className="w-5 h-5 text-amber-400 group-hover:text-amber-300 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs text-gray-300">Membership</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Menu Items List */}
                        <div className="px-2 pb-2">
                            <div className="space-y-0.5">
                                {role === 'admin' && (
                                    <button onClick={() => router.push('/admin/dashboard')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pink-500/10 text-pink-200 hover:text-pink-100 transition-colors text-sm group border border-pink-500/20 mb-1">
                                        <Briefcase className="w-4 h-4 text-pink-400 group-hover:text-pink-300 transition-colors" />
                                        Business Console
                                    </button>
                                )}

                                // Feed — locked when KYC pending
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
                            </div>

                            {/* Divider */}
                            <div className="my-2 h-px bg-white/5 w-full" />

                            <button
                                onClick={onSignOut}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-300/80 hover:text-red-200 transition-colors text-sm group"
                            >
                                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Sign Out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
