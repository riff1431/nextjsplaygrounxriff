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
import SystemPromptManager from "../../../components/admin/content/SystemPromptManager";

// ...

type AdminModule =
    | "home"
    | "dashboard"
    | "prompts" // Added
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
        { id: "prompts", label: "System Truth & Dare", icon: <MessageCircle className="w-4 h-4" />, tone: "pink" }, // Added
        { id: "pricing", label: "Pricing Controls", icon: <Settings className="w-4 h-4" />, tone: "amber" },
        { id: "theme", label: "Theme & Brand", icon: <Palette className="w-4 h-4" />, tone: "pink" },
        // ...
    ];

    // ...

    return (
        // ...
        {/* Integrated Modules */ }
                    { bizModule === "prompts" && <SystemPromptManager /> }
    { bizModule === "pricing" && <PricingControls /> }
        // ...
    )
}
{ bizModule === "payments" && <PaymentGatewayManager /> }
{ bizModule === "approvals" && <PaymentApprovals /> }
{ bizModule === "users" && <UserManagement /> }
{ bizModule === "audit" && <AuditLogViewer /> }
{ bizModule === "refunds" && <RefundManager /> }
{ bizModule === "payouts" && <PayoutManager /> }
{ bizModule === "moderation" && <ModerationQueue /> }

{/* Extended Modules */ }
{ bizModule === "scheduling" && <SchedulingManager /> }
{ bizModule === "messaging" && <MessagingCenter /> }
{ bizModule === "monitoring" && <SystemMonitoring /> }

{/* Placeholders for unimplemented modules */ }
{
    (["trust"].includes(bizModule)) && (
        <NeonCard className="p-10 text-center text-gray-500">
            Module {bizModule} is under construction.
        </NeonCard>
    )
}
                </div >
            </div >
        </div >
    );
}
