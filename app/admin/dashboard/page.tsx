"use strict";
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
    Palette,
    Menu,
    X,
    Check,
} from "lucide-react";
import { NeonCard, NeonButton } from "../../../components/admin/shared/NeonCard";
import { AdminSectionTitle } from "../../../components/admin/shared/AdminTable";
import { AdminPill } from "../../../components/admin/shared/AdminPill";

// Module Imports
import PricingControls from "../../../components/admin/settings/PricingControls";
import UserManagement from "../../../components/admin/users/UserManagement";
import AuditLogViewer from "../../../components/admin/safety/AuditLogViewer";
import RefundManager from "../../../components/admin/finance/RefundManager";
import PayoutManager from "../../../components/admin/finance/PayoutManager";
import ModerationQueue from "../../../components/admin/safety/ModerationQueue";
import AdminStats from "../../../components/admin/dashboard/AdminStats";
// Extended Modules
import SchedulingManager from "../../../components/admin/settings/SchedulingManager";
import MessagingCenter from "../../../components/admin/users/MessagingCenter";
import SystemMonitoring from "../../../components/admin/safety/SystemMonitoring";
import AdminThemeEditor from "../../../components/admin/settings/AdminThemeEditor";
import PaymentGatewayManager from "../../../components/admin/settings/PaymentGatewayManager";
import PaymentApprovals from "../../../components/admin/finance/PaymentApprovals";
import SystemPromptManager from "../../../components/admin/content/SystemPromptManager";

// Helpers
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

type AdminModule =
    | "home"
    | "dashboard"
    | "prompts"
    | "pricing"
    | "theme"
    | "payments"
    | "approvals"
    | "users"
    | "refunds"
    | "payouts"
    | "audit"
    | "trust" // Placeholder for now
    | "scheduling" // Placeholder
    | "moderation"
    | "messaging" // Placeholder
    | "monitoring"; // Placeholder

export default function AdminDashboardPage() {
    const router = useRouter();
    const [bizModule, setBizModule] = useState<AdminModule>("home");
    const [showMobileNav, setShowMobileNav] = useState(false);

    const NAV: Array<{ id: AdminModule; label: string; icon: React.ReactNode; tone?: "cyan" | "amber" | "red" | "green" | "pink" }> = [
        { id: "home", label: "Admin Home", icon: <Home className="w-4 h-4" />, tone: "cyan" },
        { id: "dashboard", label: "Dashboard", icon: <Star className="w-4 h-4" />, tone: "green" },
        { id: "prompts", label: "System Truth & Dare", icon: <MessageCircle className="w-4 h-4" />, tone: "pink" },
        { id: "pricing", label: "Pricing Controls", icon: <Settings className="w-4 h-4" />, tone: "amber" },
        { id: "theme", label: "Theme & Brand", icon: <Palette className="w-4 h-4" />, tone: "pink" },
        { id: "payments", label: "Payment Gateways", icon: <CreditCard className="w-4 h-4" />, tone: "green" },
        { id: "approvals", label: "Payment Approvals", icon: <Check className="w-4 h-4" />, tone: "green" },
        { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, tone: "cyan" },
        { id: "refunds", label: "Refunds", icon: <CreditCard className="w-4 h-4" />, tone: "amber" },
        { id: "payouts", label: "Payouts", icon: <CreditCard className="w-4 h-4" />, tone: "green" },
        { id: "audit", label: "Audit Logs", icon: <Lock className="w-4 h-4" />, tone: "cyan" },
        { id: "moderation", label: "Moderation", icon: <Bell className="w-4 h-4" />, tone: "red" },
        // Placeholders below
        { id: "scheduling", label: "Scheduling", icon: <Timer className="w-4 h-4" />, tone: "cyan" },
        { id: "messaging", label: "Messaging", icon: <MessageCircle className="w-4 h-4" />, tone: "cyan" },
        { id: "monitoring", label: "Monitoring", icon: <Flame className="w-4 h-4" />, tone: "amber" },
    ];

    function HeaderRight() {
        return (
            <div className="flex items-center gap-2">
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
    }: {
        id: AdminModule;
        label: string;
        desc: string;
        icon: React.ReactNode;
        tone: "cyan" | "amber" | "red" | "green" | "pink";
    }) {
        return (
            <button
                onClick={() => setBizModule(id)}
                className="rounded-2xl border border-white/10 bg-black/30 p-4 text-left hover:bg-white/5 transition"
            >
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

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto lg:max-h-none">
                            {NAV.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => {
                                        setBizModule(n.id);
                                        setShowMobileNav(false);
                                    }}
                                    className={cx(
                                        "w-full rounded-xl border bg-black/40 px-3 py-2 text-sm transition",
                                        bizModule === n.id ? "border-cyan-300/55 text-cyan-200" : "border-white/10 text-gray-200 hover:bg-white/5"
                                    )}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        {n.icon}
                                        {n.label}
                                    </span>
                                </button>
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
                                <Tile id="prompts" label="System Truth & Dare" icon={<MessageCircle className="w-4 h-4" />} tone="pink" desc="Manage prompts" />
                                <Tile id="pricing" label="Pricing Controls" icon={<Settings className="w-4 h-4" />} tone="amber" desc="Global configuration" />
                                <Tile id="users" label="Users" icon={<Users className="w-4 h-4" />} tone="cyan" desc="Manage access" />
                                <Tile id="refunds" label="Refunds" icon={<CreditCard className="w-4 h-4" />} tone="amber" desc="Dispute resolution" />
                                <Tile id="payouts" label="Payouts" icon={<CreditCard className="w-4 h-4" />} tone="green" desc="Creator payments" />
                                <Tile id="audit" label="Audit Logs" icon={<Lock className="w-4 h-4" />} tone="cyan" desc="System history" />
                                <Tile id="moderation" label="Moderation" icon={<Bell className="w-4 h-4" />} tone="red" desc="Safety queue" />
                            </div>
                        </NeonCard>
                    )}

                    {/* Dashboard Stats View */}
                    {bizModule === "dashboard" && (
                        <AdminStats />
                    )}

                    {/* Integrated Modules */}
                    {bizModule === "prompts" && <SystemPromptManager />}
                    {bizModule === "pricing" && <PricingControls />}
                    {bizModule === "theme" && <AdminThemeEditor />}
                    {bizModule === "payments" && <PaymentGatewayManager />}
                    {bizModule === "approvals" && <PaymentApprovals />}
                    {bizModule === "users" && <UserManagement />}
                    {bizModule === "audit" && <AuditLogViewer />}
                    {bizModule === "refunds" && <RefundManager />}
                    {bizModule === "payouts" && <PayoutManager />}
                    {bizModule === "moderation" && <ModerationQueue />}

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
