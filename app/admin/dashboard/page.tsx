"use strict";
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Home,
    Star,
    Settings,
    Users,
    CreditCard,
    Lock,
    Timer,
    Bell,
    MessageCircle,
    Flame,
    Coins,
    Palette,
    Mail,
    Menu,
    X,
    Check,
    Sparkles,
    Martini,
    DoorOpen,
    Banknote,
    DollarSign,
    FileText,
    Video,
} from "lucide-react";
import { NeonCard, NeonButton } from "../../../components/admin/shared/NeonCard";
import { AdminSectionTitle } from "../../../components/admin/shared/AdminTable";
import { AdminPill } from "../../../components/admin/shared/AdminPill";

// Module Imports
import PricingControls from "../../../components/admin/settings/PricingControls";
import UserManagement from "../../../components/admin/users/UserManagement";
import AuditLogViewer from "../../../components/admin/safety/AuditLogViewer";
import RefundManager from "../../../components/admin/finance/RefundManager";
import AdminStats from "../../../components/admin/dashboard/AdminStats";
// Extended Modules
import SchedulingManager from "../../../components/admin/settings/SchedulingManager";
import MessagingCenter from "../../../components/admin/users/MessagingCenter";
import SystemMonitoring from "../../../components/admin/safety/SystemMonitoring";
import CreatorPayouts from "../../../components/admin/finance/CreatorPayouts";
import ModerationQueue from "../../../components/admin/safety/ModerationQueue";
import SuggestionsManager from "../../../components/admin/users/SuggestionsManager";
import AdminThemeEditor from "../../../components/admin/settings/AdminThemeEditor";
import PaymentGatewayManager from "../../../components/admin/settings/PaymentGatewayManager";
import PaymentApprovals from "../../../components/admin/finance/PaymentApprovals";
import SystemPromptManager from "../../../components/admin/content/SystemPromptManager";
import KYCReviewPanel from "../../../components/admin/users/KYCReviewPanel";
import FanMembershipManager from "../../../components/admin/settings/FanMembershipManager";
import ConfessionListsManager from "../../../components/admin/content/ConfessionListsManager";
import CreatorLevelManager from "../../../components/admin/settings/CreatorLevelManager";
import AccountTypeManager from "../../../components/admin/settings/AccountTypeManager";
import BarLoungeManager from "../../../components/admin/settings/BarLoungeManager";
import BankPaymentReviewPanel from "../../../components/admin/finance/BankPaymentReviewPanel";
import AdminCreatorEarnings from "../../../components/admin/finance/AdminCreatorEarnings";
import PolicyEditor from "../../../components/admin/settings/PolicyEditor";
import ImportantPagesManager from "../../../components/admin/settings/ImportantPagesManager";
import CurrencyManager from "../../../components/admin/settings/CurrencyManager";
import CampaignsManager from "../../../components/admin/settings/CampaignsManager";
import IframeMenuManager from "../../../components/admin/settings/IframeMenuManager";
import EmailSettingsPanel from "../../../components/admin/emails/EmailSettingsPanel";
import AgoraSettingsPanel from "../../../components/admin/settings/AgoraSettingsPanel";

// Helpers
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

type AdminModule =
    | "home"
    | "dashboard"
    | "campaigns"
    | "prompts"
    | "confession-lists" // Confession Lists
    | "pricing"
    | "theme"
    | "policy"
    | "important-pages"
    | "payments"
    | "approvals"
    | "users"
    | "kyc" // KYC Review
    | "account-types" // Account Types (Sugar Daddy/Mommy)
    | "memberships" // Fan Memberships
    | "creator-levels" // Creator Levels
    | "bar-lounge" // Bar Lounge Config
    | "bank-payments" // Bank Payment Reviews
    | "refunds"
    | "payouts"
    | "audit"
    | "suggestions"
    | "trust" // Placeholder for now
    | "scheduling" // Placeholder
    | "moderation"
    | "messaging" // Placeholder
    | "monitoring" // Placeholder
    | "room-settings" // Links to /admin/rooms
    | "finance-payouts" // Links to /admin/finance/payouts
    | "revenue-splits" // Links to /admin/finance/splits
    | "creator-earnings" // Creator Earnings panel
    | "currency" // Default Currency
    | "emails" // SMTP and Email logs
    | "iframe-menus" // dynamic iframe menus
    | "agora"; // Agora Streaming Configuration

export default function AdminDashboardPage() {
    const router = useRouter();
    const [bizModule, setBizModule] = useState<AdminModule>("home");
    const [showMobileNav, setShowMobileNav] = useState(false);
    const [pendingSuggestions, setPendingSuggestions] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        const fetchPendingSuggestions = async () => {
            const supabase = createClient();
            const { count } = await supabase
                .from("platform_suggestions")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");
            if (count) {
                setPendingSuggestions(count);
            }
        };
        fetchPendingSuggestions();

        // Fetch unread admin messages count
        const fetchUnreadMessages = async () => {
            try {
                const res = await fetch("/api/admin/messages");
                if (res.ok) {
                    const data = await res.json();
                    setUnreadMessages(data.unreadTotal || 0);
                }
            } catch { }
        };
        fetchUnreadMessages();
    }, []);

    // These modules navigate to separate pages instead of switching state
    const ROUTE_MAP: Record<string, string> = {
        "room-settings": "/admin/rooms",
        "finance-payouts": "/admin/finance/payouts",
        "revenue-splits": "/admin/finance/splits",
    };

    const NAV_GROUPS: Array<{
        title: string;
        items: Array<{ id: AdminModule; label: string; icon: React.ReactNode; tone?: "cyan" | "amber" | "red" | "green" | "pink"; badge?: number }>;
    }> = [
        {
            title: "Core Console",
            items: [
                { id: "home", label: "Admin Home", icon: <Home className="w-4 h-4" />, tone: "cyan" },
                { id: "dashboard", label: "Dashboard", icon: <Star className="w-4 h-4" />, tone: "green" },
            ]
        },
        {
            title: "Rooms & Content",
            items: [
                { id: "room-settings", label: "Room Settings", icon: <DoorOpen className="w-4 h-4" />, tone: "pink" },
                { id: "prompts", label: "System Truth & Dare", icon: <MessageCircle className="w-4 h-4" />, tone: "pink" },
                { id: "confession-lists", label: "Confession Lists", icon: <Flame className="w-4 h-4" />, tone: "pink" },
                { id: "bar-lounge", label: "Bar Lounge", icon: <Martini className="w-4 h-4" />, tone: "pink" },
            ]
        },
        {
            title: "Marketing & Campaigns",
            items: [
                { id: "campaigns", label: "Timer & Popups", icon: <Timer className="w-4 h-4" />, tone: "pink" },
                { id: "theme", label: "Theme & Brand", icon: <Palette className="w-4 h-4" />, tone: "pink" },
                { id: "policy", label: "Legal & Policies", icon: <FileText className="w-4 h-4" />, tone: "cyan" },
                { id: "important-pages", label: "Important Pages", icon: <FileText className="w-4 h-4" />, tone: "amber" },
            ]
        },
        {
            title: "Users & Safety",
            items: [
                { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, tone: "cyan" },
                { id: "kyc", label: "KYC Review", icon: <Lock className="w-4 h-4" />, tone: "red" },
                { id: "suggestions", label: "Suggestions", icon: <MessageCircle className="w-4 h-4" />, tone: "cyan", badge: pendingSuggestions },
                { id: "messaging", label: "Messaging", icon: <MessageCircle className="w-4 h-4" />, tone: "cyan", badge: unreadMessages },
            ]
        },
        {
            title: "System Config",
            items: [
                { id: "pricing", label: "Pricing Controls", icon: <Settings className="w-4 h-4" />, tone: "amber" },
                { id: "currency", label: "Default Currency", icon: <Coins className="w-4 h-4" />, tone: "green" },
                { id: "payments", label: "Payment Gateways", icon: <CreditCard className="w-4 h-4" />, tone: "green" },
                { id: "emails", label: "SMTP & Email Logs", icon: <Mail className="w-4 h-4" />, tone: "cyan" },
                { id: "account-types", label: "Account Types", icon: <Sparkles className="w-4 h-4" />, tone: "pink" },
                { id: "memberships", label: "Fan Memberships", icon: <Star className="w-4 h-4" />, tone: "amber" },
                { id: "creator-levels", label: "Creator Levels", icon: <Star className="w-4 h-4" />, tone: "pink" },
                { id: "iframe-menus", label: "Iframe Menu", icon: <Settings className="w-4 h-4" />, tone: "amber" },
                { id: "agora", label: "Agora Streaming", icon: <Video className="w-4 h-4" />, tone: "cyan" },
            ]
        },
        {
            title: "Finance & Payouts",
            items: [
                { id: "approvals", label: "Payment Approvals", icon: <Check className="w-4 h-4" />, tone: "green" },
                { id: "bank-payments", label: "Bank Payments", icon: <CreditCard className="w-4 h-4" />, tone: "green" },
                { id: "refunds", label: "Refunds", icon: <CreditCard className="w-4 h-4" />, tone: "amber" },
                { id: "finance-payouts", label: "Payouts (Page)", icon: <Banknote className="w-4 h-4" />, tone: "green" },
                { id: "payouts", label: "Payouts", icon: <CreditCard className="w-4 h-4" />, tone: "green" },
                { id: "creator-earnings", label: "Creator Earnings", icon: <DollarSign className="w-4 h-4" />, tone: "green" },
                { id: "revenue-splits", label: "Revenue Splits", icon: <DollarSign className="w-4 h-4" />, tone: "amber" },
            ]
        }
    ];

    function HeaderRight() {
        return (
            <div className="flex items-center gap-2">
                {pendingSuggestions > 0 && (
                    <AdminPill tone="red" className="animate-pulse">
                        {pendingSuggestions} Pending Suggestion{pendingSuggestions !== 1 ? 's' : ''}
                    </AdminPill>
                )}
                <AdminPill tone="cyan">Admin v2.0</AdminPill>
                <NeonButton variant="ghost" onClick={() => router.push('/home')} title="Exit Admin Console">
                    Exit
                </NeonButton>
            </div>
        );
    }

    function Tile({
        id,
        label,
        desc,
        icon,
        tone,
        badge,
    }: {
        id: AdminModule;
        label: string;
        desc: string;
        icon: React.ReactNode;
        tone: "cyan" | "amber" | "red" | "green" | "pink";
        badge?: number;
    }) {
        return (
            <button
                onClick={() => setBizModule(id)}
                className="rounded-2xl border border-white/10 bg-black/30 p-4 text-left hover:bg-white/5 transition relative"
            >
                {badge && badge > 0 ? (
                    <span className="absolute top-3 right-3 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                ) : null}
                <div className="inline-flex items-center gap-2 text-cyan-200 text-sm">
                    {icon} {label}
                </div>
                <div className="mt-2 text-[11px] text-gray-400">{desc}</div>
                <div className="mt-3 text-[11px] text-gray-500 inline-flex items-center gap-2">
                    <AdminPill tone={tone}>Open</AdminPill>
                    <span className="text-gray-500">→</span>
                </div>
            </button>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6 font-sans">
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between mb-4">
                <div className="text-fuchsia-200 text-sm inline-flex items-center gap-2 font-bold">
                    <Settings className="w-4 h-4 text-cyan-200" />
                    Console
                </div>
                <NeonButton variant="ghost" onClick={() => setShowMobileNav(!showMobileNav)}>
                    {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </NeonButton>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                {/* Left nav - Mobile: Overlay / Desktop: Static Col */}
                <div className={cx(
                    "lg:col-span-3 transition-all duration-300 ease-in-out z-50",
                    "lg:block", // Always show on desktop
                    showMobileNav ? "block absolute top-0 left-0 right-0 shadow-2xl" : "hidden" // Mobile toggle
                )}>
                    <NeonCard className="p-4 bg-black/95 backdrop-blur-md">
                        <div className="hidden lg:inline-flex text-fuchsia-200 text-sm mb-3 items-center gap-2">
                            <Settings className="w-4 h-4 text-cyan-200" />
                            Business Console
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto lg:max-h-[80vh] pr-1 scrollbar-thin">
                            {NAV_GROUPS.map((group) => (
                                <div key={group.title} className="space-y-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500/80 px-2.5 pt-2 pb-1">
                                        {group.title}
                                    </div>
                                    <div className="space-y-1">
                                        {group.items.map((n) => (
                                            <button
                                                key={n.id}
                                                onClick={() => {
                                                    if (ROUTE_MAP[n.id]) {
                                                        router.push(ROUTE_MAP[n.id]);
                                                    } else {
                                                        setBizModule(n.id);
                                                    }
                                                    setShowMobileNav(false);
                                                }}
                                                className={cx(
                                                    "w-full rounded-xl border bg-black/40 px-3 py-2 text-sm transition flex items-center justify-between text-left",
                                                    bizModule === n.id ? "border-cyan-300/55 text-cyan-200 bg-cyan-500/5 shadow-[0_0_10px_rgba(6,182,212,0.1)]" : "border-white/10 text-gray-200 hover:bg-white/5"
                                                )}
                                            >
                                                <span className="inline-flex items-center gap-2 flex-1">
                                                    {n.icon}
                                                    {n.label}
                                                    {ROUTE_MAP[n.id] && <span className="text-[9px] text-gray-500 ml-1">↗</span>}
                                                </span>
                                                {n.badge && n.badge > 0 ? (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto">
                                                        {n.badge}
                                                    </span>
                                                ) : null}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </NeonCard>
                </div>

                {/* Main content */}
                <div className="lg:col-span-9 space-y-4">
                    {/* Home Tile View */}
                    {bizModule === "home" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Home className="w-4 h-4" />}
                                title="Admin Home"
                                sub="Welcome back, Administrator."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <Tile id="dashboard" label="Dashboard" icon={<Star className="w-4 h-4" />} tone="green" desc="Revenue overview" />
                                <button
                                    onClick={() => router.push('/admin/rooms')}
                                    className="rounded-2xl border border-white/10 bg-black/30 p-4 text-left hover:bg-white/5 transition"
                                >
                                    <div className="inline-flex items-center gap-2 text-cyan-200 text-sm">
                                        <DoorOpen className="w-4 h-4" /> Room Settings
                                    </div>
                                    <div className="mt-2 text-[11px] text-gray-400">Fees, toggles & sessions</div>
                                    <div className="mt-3 text-[11px] text-gray-500 inline-flex items-center gap-2">
                                        <AdminPill tone="pink">Open ↗</AdminPill>
                                        <span className="text-gray-500">→</span>
                                    </div>
                                </button>
                                <Tile id="prompts" label="System Truth & Dare" icon={<MessageCircle className="w-4 h-4" />} tone="pink" desc="Manage prompts" />
                                <Tile id="confession-lists" label="Confession Lists" icon={<Flame className="w-4 h-4" />} tone="pink" desc="All confessions" />
                                <Tile id="pricing" label="Pricing Controls" icon={<Settings className="w-4 h-4" />} tone="amber" desc="Global configuration" />
                                <Tile id="policy" label="Legal & Policies" icon={<FileText className="w-4 h-4" />} tone="cyan" desc="T&Cs and Privacy" />
                                <Tile id="important-pages" label="Important Pages" icon={<FileText className="w-4 h-4" />} tone="amber" desc="Edit public pages" />
                                <Tile id="campaigns" label="Timer & Popups" icon={<Timer className="w-4 h-4" />} tone="pink" desc="Manage countdowns & popups" />
                                <Tile id="users" label="Users" icon={<Users className="w-4 h-4" />} tone="cyan" desc="Manage access" />
                                <Tile id="kyc" label="KYC Review" icon={<Lock className="w-4 h-4" />} tone="red" desc="Verify creators" />
                                <Tile id="memberships" label="Memberships" icon={<Star className="w-4 h-4" />} tone="amber" desc="Fan plans" />
                                <Tile id="creator-levels" label="Creator Levels" icon={<Star className="w-4 h-4" />} tone="pink" desc="Creator tiers" />
                                <Tile id="bar-lounge" label="Bar Lounge" icon={<Martini className="w-4 h-4" />} tone="pink" desc="Global config" />
                                <Tile id="currency" label="Default Currency" icon={<Coins className="w-4 h-4" />} tone="green" desc="Set display currency" />
                                <Tile id="iframe-menus" label="Iframe Menu" icon={<Settings className="w-4 h-4" />} tone="amber" desc="Manage fan & creator menus" />
                                <Tile id="agora" label="Agora Streaming" icon={<Video className="w-4 h-4" />} tone="cyan" desc="Configure App ID & certificates" />
                                <Tile id="emails" label="SMTP & Email Logs" icon={<Mail className="w-4 h-4" />} tone="cyan" desc="SMTP servers & logs" />
                                <Tile id="refunds" label="Refunds" icon={<CreditCard className="w-4 h-4" />} tone="amber" desc="Dispute resolution" />
                                <Tile id="payouts" label="Payouts" icon={<CreditCard className="w-4 h-4" />} tone="green" desc="Creator payments" />
                                <Tile id="creator-earnings" label="Creator Earnings" icon={<DollarSign className="w-4 h-4" />} tone="green" desc="All creator activity" />
                                <button
                                    onClick={() => router.push('/admin/finance/splits')}
                                    className="rounded-2xl border border-white/10 bg-black/30 p-4 text-left hover:bg-white/5 transition"
                                >
                                    <div className="inline-flex items-center gap-2 text-amber-200 text-sm">
                                        <DollarSign className="w-4 h-4" /> Revenue Splits
                                    </div>
                                    <div className="mt-2 text-[11px] text-gray-400">Manage split rules &amp; pricing</div>
                                    <div className="mt-3 text-[11px] text-gray-500 inline-flex items-center gap-2">
                                        <AdminPill tone="amber">Open ↗</AdminPill>
                                        <span className="text-gray-500">→</span>
                                    </div>
                                </button>
                                <Tile id="suggestions" label="Suggestions" icon={<MessageCircle className="w-4 h-4" />} tone="cyan" desc="User feedback" badge={pendingSuggestions} />
                            </div>
                        </NeonCard>
                    )}

                    {/* Dashboard Stats View */}
                    {bizModule === "dashboard" && (
                        <AdminStats />
                    )}

                    {/* Integrated Modules */}
                    {bizModule === "prompts" && <SystemPromptManager />}
                    {bizModule === "confession-lists" && <ConfessionListsManager />}
                    {bizModule === "pricing" && <PricingControls />}
                    {bizModule === "theme" && <AdminThemeEditor />}
                    {bizModule === "policy" && <PolicyEditor />}
                    {bizModule === "important-pages" && <ImportantPagesManager />}
                    {bizModule === "campaigns" && <CampaignsManager />}
                    {bizModule === "currency" && <CurrencyManager />}
                    {bizModule === "iframe-menus" && <IframeMenuManager />}
                    {bizModule === "emails" && <EmailSettingsPanel />}
                    {bizModule === "agora" && <AgoraSettingsPanel />}
                    {bizModule === "payments" && <PaymentGatewayManager />}
                    {bizModule === "approvals" && <PaymentApprovals />}
                    {bizModule === "users" && <UserManagement />}
                    {bizModule === "kyc" && <KYCReviewPanel />}
                    {bizModule === "account-types" && <AccountTypeManager />}
                    {bizModule === "memberships" && <FanMembershipManager />}
                    {bizModule === "creator-levels" && <CreatorLevelManager />}
                    {bizModule === "bar-lounge" && <BarLoungeManager />}
                    {bizModule === "bank-payments" && <BankPaymentReviewPanel />}
                    {bizModule === "audit" && <AuditLogViewer />}
                    {bizModule === "refunds" && <RefundManager />}
                    {bizModule === "payouts" && <CreatorPayouts />}
                    {bizModule === "creator-earnings" && <AdminCreatorEarnings />}
                    {bizModule === "moderation" && <ModerationQueue />}
                    {bizModule === "suggestions" && <SuggestionsManager />}

                    {/* Extended Modules */}
                    {bizModule === "scheduling" && <SchedulingManager />}
                    {bizModule === "messaging" && <MessagingCenter />}
                    {bizModule === "monitoring" && <SystemMonitoring />}

                    {/* Placeholders for unimplemented modules */}
                    {(["trust"].includes(bizModule)) && (
                        <NeonCard className="p-10 text-center text-gray-500">
                            Module {bizModule} is under construction.
                        </NeonCard>
                    )}
                </div>
            </div>
        </div>
    );
}
