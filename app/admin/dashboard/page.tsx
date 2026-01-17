"use client";

import React, { useState, useMemo, useEffect } from "react";
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
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

// ---- Shared helpers --------------------------------------------------------
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
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

// ---- Admin Business Console (FULL Preview) ------------------------------------
type AdminModule =
    | "home"
    | "dashboard"
    | "pricing"
    | "users"
    | "refunds"
    | "payouts"
    | "audit"
    | "trust"
    | "scheduling"
    | "moderation"
    | "messaging"
    | "monitoring";

function AdminPill({
    children,
    tone = "cyan",
}: {
    children: React.ReactNode;
    tone?: "cyan" | "pink" | "amber" | "red" | "green";
}) {
    const cls =
        tone === "pink"
            ? "border-pink-500/25 text-pink-200 bg-pink-500/10"
            : tone === "amber"
                ? "border-yellow-400/25 text-yellow-200 bg-yellow-500/10"
                : tone === "red"
                    ? "border-rose-400/25 text-rose-200 bg-rose-500/10"
                    : tone === "green"
                        ? "border-emerald-400/25 text-emerald-200 bg-emerald-500/10"
                        : "border-cyan-300/25 text-cyan-200 bg-cyan-500/10";
    return <span className={`text-[10px] px-2 py-[2px] rounded-full border ${cls}`}>{children}</span>;
}

function AdminSectionTitle({
    icon,
    title,
    sub,
    right,
}: {
    icon?: React.ReactNode;
    title: string;
    sub?: string;
    right?: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div>
                <div className="text-cyan-200 text-base inline-flex items-center gap-2 drop-shadow-[0_0_40px_rgba(0,230,255,0.7)]">
                    {icon} {title}
                </div>
                {sub && <div className="mt-1 text-[11px] text-gray-400">{sub}</div>}
            </div>
            {right}
        </div>
    );
}

function AdminTable({
    columns,
    rows,
}: {
    columns: Array<{ key: string; label: string; w?: string; right?: boolean }>;
    rows: Array<Record<string, React.ReactNode>>;
}) {
    const grid = columns.map((c) => c.w ?? "1fr").join(" ");
    return (
        <div className="rounded-2xl border border-white/10 overflow-x-auto bg-black/30">
            <div className="min-w-[800px]">
                <div className="grid bg-black/60 border-b border-white/10" style={{ gridTemplateColumns: grid }}>
                    {columns.map((c) => (
                        <div
                            key={c.key}
                            className={cx("px-3 py-2 text-[10px] text-gray-300", c.right && "text-right")}
                        >
                            {c.label}
                        </div>
                    ))}
                </div>
                <div className="divide-y divide-white/10">
                    {rows.map((r, i) => (
                        <div key={i} className="grid hover:bg-white/5 transition" style={{ gridTemplateColumns: grid }}>
                            {columns.map((c) => (
                                <div key={c.key} className={cx("px-3 py-2 text-xs text-gray-100", c.right && "text-right")}>
                                    {r[c.key] ?? <span className="text-gray-500">—</span>}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AdminBusinessConsolePreview({ onExit }: { onExit: () => void }) {
    const [bizModule, setBizModule] = useState<AdminModule>("home");
    const [showMobileNav, setShowMobileNav] = useState(false);

    // Pricing (global + version notes)
    const [entryFee, setEntryFee] = useState(10);
    const [freeMinutes, setFreeMinutes] = useState(10);
    const [perMinuteFee, setPerMinuteFee] = useState(2);
    const [pricingVersion, setPricingVersion] = useState("v3");
    const [pricingNote, setPricingNote] = useState("Keep Suga4U + TruthOrDare aligned with global defaults unless overridden.");
    // Users
    const [userQuery, setUserQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [realUsers, setRealUsers] = useState<any[]>([]);

    const supabase = createClient();

    // Stats
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeRooms: 0,
        totalRooms: 0,
        paymentsOk: true // Mock for now
    });

    useEffect(() => {
        if (bizModule === "dashboard") {
            const fetchStats = async () => {
                const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
                const { count: activeRoomCount } = await supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('status', 'live');
                const { count: totalRoomCount } = await supabase.from('rooms').select('*', { count: 'exact', head: true });

                setStats(s => ({
                    ...s,
                    totalUsers: userCount || 0,
                    activeRooms: activeRoomCount || 0,
                    totalRooms: totalRoomCount || 0
                }));
            };
            fetchStats();
        }
    }, [bizModule, supabase]);

    useEffect(() => {
        const fetchUsers = async () => {
            let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

            if (userQuery.trim()) {
                const q = userQuery.trim();
                query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%,id.eq.${q}`);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching profiles:', error);
                toast.error("Failed to fetch users");
            } else {
                setRealUsers(data || []);
            }
        };

        const timer = setTimeout(fetchUsers, 500);
        return () => clearTimeout(timer);
    }, [userQuery, supabase]);

    const toggleUserStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === "Restricted" ? "Active" : "Restricted";
        const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);

        if (error) {
            toast.error("Failed to update status");
        } else {
            toast.success(`User ${newStatus === 'Restricted' ? 'restricted' : 'activated'}`);
            setRealUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        }
    };

    // Refunds
    const [refundQuery, setRefundQuery] = useState("");

    // Messaging
    const [audience, setAudience] = useState<"fans" | "creators" | "both">("both");
    const [broadcastText, setBroadcastText] = useState("");
    const [broadcastLog, setBroadcastLog] = useState<Array<{ at: string; to: string; msg: string }>>([
        { at: "Today 10:14", to: "Both", msg: "Maintenance notice: payments may be delayed for 15 min." },
        { at: "Yesterday 21:02", to: "Creators", msg: "Reminder: verify payout method to avoid holds." },
    ]);

    // Monitoring
    const [health, setHealth] = useState({
        payments: "OK",
        realtime: "OK",
        safetyQueue: "Elevated",
        payouts: "OK",
    });

    const NAV: Array<{ id: AdminModule; label: string; icon: React.ReactNode; tone?: "cyan" | "amber" | "red" | "green" | "pink" }> = [
        { id: "home", label: "Admin Home", icon: <Home className="w-4 h-4" />, tone: "cyan" },
        { id: "dashboard", label: "Dashboard", icon: <Star className="w-4 h-4" />, tone: "green" },
        { id: "pricing", label: "Pricing Controls", icon: <Settings className="w-4 h-4" />, tone: "amber" },
        { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, tone: "cyan" },
        { id: "refunds", label: "Refunds", icon: <CreditCard className="w-4 h-4" />, tone: "amber" },
        { id: "payouts", label: "Payouts", icon: <CreditCard className="w-4 h-4" />, tone: "green" },
        { id: "audit", label: "Audit Logs", icon: <Lock className="w-4 h-4" />, tone: "cyan" },
        { id: "trust", label: "Trust & Safety", icon: <Lock className="w-4 h-4" />, tone: "red" },
        { id: "scheduling", label: "Scheduling", icon: <Timer className="w-4 h-4" />, tone: "cyan" },
        { id: "moderation", label: "Moderation", icon: <Bell className="w-4 h-4" />, tone: "red" },
        { id: "messaging", label: "Messaging", icon: <MessageCircle className="w-4 h-4" />, tone: "cyan" },
        { id: "monitoring", label: "Monitoring", icon: <Flame className="w-4 h-4" />, tone: "amber" },
    ];

    const users = realUsers.map((u: any) => ({
        id: u.id,
        name: u.full_name || u.username || "Anonymous",
        role: u.role || "fan",
        status: u.status || "Active",
        risk: "Low", // Mock for now
        joined: u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"
    }));

    const refunds = [
        { id: "rf_8802", txn: "txn_8802", user: "u_1021", reason: "Duplicate charge", amount: "$25.00", status: "Open", at: "Today 09:58" },
        { id: "rf_8799", txn: "txn_8799", user: "u_2008", reason: "Chargeback (cardholder)", amount: "$50.00", status: "Dispute", at: "Yesterday 16:41" },
        { id: "rf_8712", txn: "txn_8712", user: "u_1944", reason: "Service issue", amount: "$10.00", status: "Resolved", at: "2026-01-07" },
    ];

    const payouts = [
        { batch: "po_2026_01_1", total: "$88,240", creators: 142, status: "Processing", eta: "Today 17:00" },
        { batch: "po_2026_01_0", total: "$91,800", creators: 151, status: "Paid", eta: "2026-01-11" },
        { batch: "po_2025_12_4", total: "$85,120", creators: 139, status: "Paid", eta: "2026-01-04" },
    ];

    const audit = [
        { at: "Today 10:11", actor: "admin@pgx", action: "Updated global pricing", target: "Pricing Controls", ip: "192.0.2.11" },
        { at: "Today 09:21", actor: "admin@pgx", action: "Applied restriction", target: "u_2008", ip: "192.0.2.11" },
        { at: "Yesterday 23:03", actor: "trust@pgx", action: "Escalated report", target: "Moderation", ip: "198.51.100.9" },
    ];

    const trustSignals = [
        { k: "Spam Spike", v: "Stable", sev: <AdminPill tone="green">OK</AdminPill> },
        { k: "Underage Risk Queue", v: "3 flagged", sev: <AdminPill tone="red">Critical</AdminPill> },
        { k: "Creator Verification Backlog", v: "12 pending", sev: <AdminPill tone="amber">Elevated</AdminPill> },
        { k: "Chargeback Rate", v: "0.42%", sev: <AdminPill tone="green">OK</AdminPill> },
    ];

    const scheduleTemplates = [
        { id: "tpl_1", name: "Truth or Dare (Weekend Prime)", duration: "60m", defaultCaps: "4 creators / 10 fans", status: "Enabled" },
        { id: "tpl_2", name: "Suga4U (Nightly)", duration: "90m", defaultCaps: "1 spotlight / 10 fans", status: "Enabled" },
        { id: "tpl_3", name: "Bar Lounge (Happy Hour)", duration: "45m", defaultCaps: "2 creators / 12 fans", status: "Draft" },
    ];

    const moderationQueue = [
        { id: "mod_551", type: "Harassment", target: "@VelvetX", sev: "High", status: "Open", at: "Today 09:18" },
        { id: "mod_549", type: "Underage Risk", target: "@Unknown", sev: "Critical", status: "In Review", at: "Yesterday 23:01" },
        { id: "mod_532", type: "Spam", target: "u_1021", sev: "Low", status: "Resolved", at: "2026-01-09" },
    ];

    const filteredUsers = users; // Filtering is now server-side via useEffect

    const filteredRefunds = useMemo(() => {
        const q = refundQuery.trim().toLowerCase();
        if (!q) return refunds;
        return refunds.filter((r) => [r.id, r.txn, r.user, r.reason, r.status, r.amount].some((x) => String(x).toLowerCase().includes(q)));
    }, [refundQuery]);

    function HeaderRight() {
        return (
            <div className="flex items-center gap-2">
                <AdminPill tone="cyan">Admin Preview</AdminPill>
                <NeonButton variant="ghost" onClick={onExit} title="Exit Admin Console">
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

                        <div className="mt-5 text-[11px] text-gray-400 border-t border-white/10 pt-4 lg:border-none lg:pt-0">
                            Global pricing: <span className="text-cyan-200">${entryFee}</span> entry,{" "}
                            <span className="text-cyan-200">{freeMinutes}m</span> free,{" "}
                            <span className="text-cyan-200">${perMinuteFee}/m</span> pay-to-stay
                        </div>
                    </NeonCard>
                </div>

                {/* Main content */}
                <div className="lg:col-span-9 space-y-4">
                    {bizModule === "home" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Home className="w-4 h-4" />}
                                title="Admin Home"
                                sub="One-click access to all Business Console modules."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <Tile id="dashboard" label="Dashboard" icon={<Star className="w-4 h-4" />} tone="green" desc="Revenue by range & stream" />
                                <Tile id="pricing" label="Pricing Controls" icon={<Settings className="w-4 h-4" />} tone="amber" desc="Global pricing, versions" />
                                <Tile id="users" label="Users" icon={<Users className="w-4 h-4" />} tone="cyan" desc="Search, restrictions" />
                                <Tile id="refunds" label="Refunds" icon={<CreditCard className="w-4 h-4" />} tone="amber" desc="Refunds, chargebacks" />
                                <Tile id="payouts" label="Payouts" icon={<CreditCard className="w-4 h-4" />} tone="green" desc="Batches, failures" />
                                <Tile id="audit" label="Audit Logs" icon={<Lock className="w-4 h-4" />} tone="cyan" desc="Immutable admin trail" />
                                <Tile id="trust" label="Trust & Safety" icon={<Lock className="w-4 h-4" />} tone="red" desc="Anti-cheat controls" />
                                <Tile id="scheduling" label="Scheduling" icon={<Timer className="w-4 h-4" />} tone="cyan" desc="Events & templates" />
                                <Tile id="moderation" label="Moderation" icon={<Bell className="w-4 h-4" />} tone="red" desc="Reports & actions" />
                                <Tile id="messaging" label="Messaging" icon={<MessageCircle className="w-4 h-4" />} tone="cyan" desc="Broadcast & templates" />
                                <Tile id="monitoring" label="Monitoring" icon={<Flame className="w-4 h-4" />} tone="amber" desc="Health & alerts" />
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "dashboard" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Star className="w-4 h-4" />}
                                title="Dashboard"
                                sub="KPIs, revenue health, and operational signals."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                                {[
                                    { k: "Total Users", v: stats.totalUsers, p: <AdminPill tone="cyan">Total</AdminPill> },
                                    { k: "Active Rooms", v: stats.activeRooms, p: <AdminPill tone="green">Live</AdminPill> },
                                    { k: "Total Rooms", v: stats.totalRooms, p: <AdminPill tone="pink">All Time</AdminPill> },
                                    { k: "Platform Health", v: "OK", p: <AdminPill tone="green">Stable</AdminPill> },
                                ].map((m) => (
                                    <div key={m.k} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="text-[11px] text-gray-400">{m.k}</div>
                                            {m.p}
                                        </div>
                                        <div className="mt-2 text-xl text-white">{m.v}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <div className="text-sm text-cyan-200">Revenue Streams (mock)</div>
                                    <div className="mt-3 space-y-2">
                                        {[
                                            { l: "Entry Fees", p: 22 },
                                            { l: "Pay-to-Stay", p: 18 },
                                            { l: "Tips", p: 34 },
                                            { l: "Unlocks", p: 26 },
                                        ].map((r) => (
                                            <div key={r.l} className="flex items-center gap-3">
                                                <div className="w-28 text-xs text-gray-300">{r.l}</div>
                                                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                                    <div className="h-full bg-cyan-400/60" style={{ width: `${r.p}%` }} />
                                                </div>
                                                <div className="w-10 text-xs text-gray-300 text-right">{r.p}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <div className="text-sm text-cyan-200">Operational Notes</div>
                                    <div className="mt-2 text-[11px] text-gray-400">
                                        This is a preview-only dashboard to validate layout and navigation. Wire these tiles to real metrics later.
                                    </div>
                                    <div className="mt-3 space-y-2 text-xs text-gray-200">
                                        <div className="flex items-center justify-between">
                                            <span>Payments latency</span>
                                            <AdminPill tone="green">OK</AdminPill>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Realtime events</span>
                                            <AdminPill tone="green">OK</AdminPill>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Safety queue backlog</span>
                                            <AdminPill tone="amber">Elevated</AdminPill>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "pricing" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Settings className="w-4 h-4" />}
                                title="Pricing Controls"
                                sub="Global defaults + versioning notes (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <div className="text-sm text-cyan-200">Global Defaults</div>
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <label className="text-xs text-gray-300">
                                            Entry Fee ($)
                                            <input
                                                type="number"
                                                value={entryFee}
                                                onChange={(e) => setEntryFee(Math.max(0, Number(e.target.value)))}
                                                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                            />
                                        </label>
                                        <label className="text-xs text-gray-300">
                                            Free Minutes
                                            <input
                                                type="number"
                                                value={freeMinutes}
                                                onChange={(e) => setFreeMinutes(Math.max(0, Number(e.target.value)))}
                                                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                            />
                                        </label>
                                        <label className="text-xs text-gray-300">
                                            Per Minute ($)
                                            <input
                                                type="number"
                                                value={perMinuteFee}
                                                onChange={(e) => setPerMinuteFee(Math.max(0, Number(e.target.value)))}
                                                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                            />
                                        </label>
                                    </div>

                                    <div className="mt-3 text-[11px] text-gray-400">
                                        Preview behavior: these values display across Admin modules for consistency validation.
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-cyan-200">Pricing Versioning</div>
                                        <AdminPill tone="amber">{pricingVersion}</AdminPill>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label className="text-xs text-gray-300">
                                            Active Version
                                            <input
                                                value={pricingVersion}
                                                onChange={(e) => setPricingVersion(e.target.value)}
                                                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                            />
                                        </label>

                                        <div className="text-xs text-gray-300">
                                            Quick Actions
                                            <div className="mt-1 flex items-center gap-2">
                                                <NeonButton
                                                    variant="blue"
                                                    onClick={() => setPricingNote("Hotfix: align all rooms to global defaults.")}
                                                >
                                                    Apply Hotfix
                                                </NeonButton>
                                                <NeonButton
                                                    variant="ghost"
                                                    onClick={() => setPricingNote("Keep Suga4U + TruthOrDare aligned with global defaults unless overridden.")}
                                                >
                                                    Reset
                                                </NeonButton>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="text-xs text-gray-300">Release Note</div>
                                        <textarea
                                            value={pricingNote}
                                            onChange={(e) => setPricingNote(e.target.value)}
                                            className="mt-1 w-full min-h-[92px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                                <div className="text-sm text-cyan-200">Room Pricing Snapshot (preview)</div>
                                <div className="mt-3">
                                    <AdminTable
                                        columns={[
                                            { key: "room", label: "Room" },
                                            { key: "entry", label: "Entry", w: "120px", right: true },
                                            { key: "free", label: "Free", w: "120px", right: true },
                                            { key: "rate", label: "Rate", w: "140px", right: true },
                                            { key: "mode", label: "Mode", w: "140px" },
                                        ]}
                                        rows={[
                                            { room: "Suga4U", entry: `$${entryFee}`, free: `${freeMinutes}m`, rate: `$${perMinuteFee}/m`, mode: <AdminPill tone="pink">Global</AdminPill> },
                                            { room: "Truth or Dare", entry: `$${entryFee}`, free: `${freeMinutes}m`, rate: `$${perMinuteFee}/m`, mode: <AdminPill tone="pink">Global</AdminPill> },
                                            { room: "Bar Lounge", entry: `$${Math.max(0, entryFee - 5)}`, free: `${Math.max(0, freeMinutes - 5)}m`, rate: `$${perMinuteFee}/m`, mode: <AdminPill tone="amber">Override</AdminPill> },
                                        ]}
                                    />
                                </div>
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "users" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Users className="w-4 h-4" />}
                                title="Users"
                                sub="Search, restrictions, and risk flags (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4 flex items-center gap-2">
                                <input
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    placeholder="Search by id, name, role, status, risk…"
                                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                />
                                <NeonButton variant="ghost" onClick={() => { setUserQuery(""); setSelectedUser(null); }}>
                                    Clear
                                </NeonButton>
                            </div>

                            <div className="mt-4">
                                <AdminTable
                                    columns={[
                                        { key: "id", label: "User ID", w: "140px" },
                                        { key: "name", label: "Name" },
                                        { key: "role", label: "Role", w: "110px" },
                                        { key: "status", label: "Status", w: "120px" },
                                        { key: "risk", label: "Risk", w: "110px" },
                                        { key: "joined", label: "Joined", w: "120px" },
                                        { key: "act", label: "Actions", w: "160px" },
                                    ]}
                                    rows={filteredUsers.map((u) => ({
                                        id: u.id,
                                        name: u.name,
                                        role: <AdminPill tone={u.role === "creator" ? "pink" : "cyan"}>{u.role}</AdminPill>,
                                        status: u.status === "Restricted" ? <AdminPill tone="red">Restricted</AdminPill> : <AdminPill tone="green">Active</AdminPill>,
                                        risk: u.risk === "High" ? <AdminPill tone="red">High</AdminPill> : u.risk === "Med" ? <AdminPill tone="amber">Med</AdminPill> : <AdminPill tone="green">Low</AdminPill>,
                                        joined: u.joined,
                                        act: (
                                            <div className="flex items-center justify-end gap-2">
                                                <NeonButton
                                                    variant="ghost"
                                                    onClick={() => setSelectedUser(u.id)}
                                                    title="Open user details"
                                                >
                                                    View
                                                </NeonButton>
                                                <NeonButton
                                                    variant={u.status === "Restricted" ? "blue" : "pink"}
                                                    onClick={() => toggleUserStatus(u.id, u.status)}
                                                    title="Restrict / Lift"
                                                >
                                                    {u.status === "Restricted" ? "Lift" : "Restrict"}
                                                </NeonButton>
                                            </div>
                                        ),
                                    }))}
                                />
                            </div>

                            {selectedUser && (
                                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="text-sm text-cyan-200">User Detail: {selectedUser}</div>
                                            <div className="text-[11px] text-gray-400 mt-1">
                                                Preview-only details panel (wire to real profile / wallet / device history later).
                                            </div>
                                        </div>
                                        <NeonButton variant="ghost" onClick={() => setSelectedUser(null)}>
                                            Close
                                        </NeonButton>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                                            <div className="text-[11px] text-gray-400">Wallet Risk</div>
                                            <div className="mt-1 text-sm text-white">No anomalies</div>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                                            <div className="text-[11px] text-gray-400">Devices</div>
                                            <div className="mt-1 text-sm text-white">2 active</div>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                                            <div className="text-[11px] text-gray-400">Recent Flags</div>
                                            <div className="mt-1 text-sm text-white">None</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </NeonCard>
                    )}

                    {bizModule === "refunds" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<CreditCard className="w-4 h-4" />}
                                title="Refunds"
                                sub="Refund requests + chargebacks (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4 flex items-center gap-2">
                                <input
                                    value={refundQuery}
                                    onChange={(e) => setRefundQuery(e.target.value)}
                                    placeholder="Search refunds by id, txn, user, status, reason…"
                                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                />
                                <NeonButton variant="ghost" onClick={() => setRefundQuery("")}>
                                    Clear
                                </NeonButton>
                            </div>

                            <div className="mt-4">
                                <AdminTable
                                    columns={[
                                        { key: "id", label: "Refund ID", w: "140px" },
                                        { key: "txn", label: "Txn", w: "140px" },
                                        { key: "user", label: "User", w: "120px" },
                                        { key: "reason", label: "Reason" },
                                        { key: "amount", label: "Amount", w: "120px", right: true },
                                        { key: "status", label: "Status", w: "120px" },
                                        { key: "act", label: "Actions", w: "170px" },
                                    ]}
                                    rows={filteredRefunds.map((r) => ({
                                        id: r.id,
                                        txn: r.txn,
                                        user: r.user,
                                        reason: r.reason,
                                        amount: r.amount,
                                        status:
                                            r.status === "Resolved" ? <AdminPill tone="green">Resolved</AdminPill> : r.status === "Dispute" ? <AdminPill tone="red">Dispute</AdminPill> : <AdminPill tone="amber">Open</AdminPill>,
                                        act: (
                                            <div className="flex items-center justify-end gap-2">
                                                <NeonButton variant="ghost" onClick={() => alert(`Preview: open ${r.id}`)}>
                                                    View
                                                </NeonButton>
                                                <NeonButton variant="blue" onClick={() => alert(`Preview: mark resolved ${r.id}`)}>
                                                    Resolve
                                                </NeonButton>
                                            </div>
                                        ),
                                    }))}
                                />
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "payouts" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<CreditCard className="w-4 h-4" />}
                                title="Payouts"
                                sub="Batch status, failures, and retries (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4">
                                <AdminTable
                                    columns={[
                                        { key: "batch", label: "Batch", w: "180px" },
                                        { key: "total", label: "Total", w: "140px", right: true },
                                        { key: "creators", label: "Creators", w: "120px", right: true },
                                        { key: "status", label: "Status", w: "140px" },
                                        { key: "eta", label: "ETA" },
                                        { key: "act", label: "Actions", w: "170px" },
                                    ]}
                                    rows={payouts.map((p) => ({
                                        batch: p.batch,
                                        total: p.total,
                                        creators: p.creators,
                                        status: p.status === "Paid" ? <AdminPill tone="green">Paid</AdminPill> : <AdminPill tone="amber">Processing</AdminPill>,
                                        eta: p.eta,
                                        act: (
                                            <div className="flex items-center justify-end gap-2">
                                                <NeonButton variant="ghost" onClick={() => alert(`Preview: view batch ${p.batch}`)}>
                                                    View
                                                </NeonButton>
                                                <NeonButton variant="blue" onClick={() => alert(`Preview: retry failed payouts for ${p.batch}`)}>
                                                    Retry
                                                </NeonButton>
                                            </div>
                                        ),
                                    }))}
                                />
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "audit" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Lock className="w-4 h-4" />}
                                title="Audit Logs"
                                sub="Immutable trail of admin actions (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4">
                                <AdminTable
                                    columns={[
                                        { key: "at", label: "Time", w: "140px" },
                                        { key: "actor", label: "Actor", w: "160px" },
                                        { key: "action", label: "Action" },
                                        { key: "target", label: "Target", w: "160px" },
                                        { key: "ip", label: "IP", w: "140px" },
                                    ]}
                                    rows={audit.map((a) => ({
                                        at: a.at,
                                        actor: a.actor,
                                        action: a.action,
                                        target: a.target,
                                        ip: a.ip,
                                    }))}
                                />
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "trust" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Lock className="w-4 h-4" />}
                                title="Trust & Safety"
                                sub="Risk signals + escalation controls (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {trustSignals.map((t) => (
                                    <div key={t.k} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="text-sm text-cyan-200">{t.k}</div>
                                            {t.sev}
                                        </div>
                                        <div className="mt-2 text-xs text-gray-200">{t.v}</div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <NeonButton variant="ghost" onClick={() => alert(`Preview: open detail for ${t.k}`)}>
                                                View
                                            </NeonButton>
                                            <NeonButton variant="blue" onClick={() => alert(`Preview: escalate ${t.k}`)}>
                                                Escalate
                                            </NeonButton>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "scheduling" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Timer className="w-4 h-4" />}
                                title="Scheduling"
                                sub="Event templates and runtime schedules (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4">
                                <AdminTable
                                    columns={[
                                        { key: "name", label: "Template" },
                                        { key: "duration", label: "Duration", w: "120px" },
                                        { key: "caps", label: "Caps", w: "180px" },
                                        { key: "status", label: "Status", w: "130px" },
                                        { key: "act", label: "Actions", w: "170px" },
                                    ]}
                                    rows={scheduleTemplates.map((s) => ({
                                        name: s.name,
                                        duration: s.duration,
                                        caps: s.defaultCaps,
                                        status: s.status === "Enabled" ? <AdminPill tone="green">Enabled</AdminPill> : <AdminPill tone="amber">Draft</AdminPill>,
                                        act: (
                                            <div className="flex items-center justify-end gap-2">
                                                <NeonButton variant="ghost" onClick={() => alert(`Preview: edit ${s.id}`)}>
                                                    Edit
                                                </NeonButton>
                                                <NeonButton variant="blue" onClick={() => alert(`Preview: schedule using ${s.id}`)}>
                                                    Schedule
                                                </NeonButton>
                                            </div>
                                        ),
                                    }))}
                                />
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "moderation" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Bell className="w-4 h-4" />}
                                title="Moderation"
                                sub="Reports, actions, and resolution workflow (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4">
                                <AdminTable
                                    columns={[
                                        { key: "id", label: "Case", w: "120px" },
                                        { key: "type", label: "Type", w: "150px" },
                                        { key: "target", label: "Target" },
                                        { key: "sev", label: "Severity", w: "120px" },
                                        { key: "status", label: "Status", w: "130px" },
                                        { key: "at", label: "Time", w: "140px" },
                                        { key: "act", label: "Actions", w: "180px" },
                                    ]}
                                    rows={moderationQueue.map((m) => ({
                                        id: m.id,
                                        type: m.type,
                                        target: m.target,
                                        sev:
                                            m.sev === "Critical" ? <AdminPill tone="red">Critical</AdminPill> : m.sev === "High" ? <AdminPill tone="amber">High</AdminPill> : <AdminPill tone="green">Low</AdminPill>,
                                        status:
                                            m.status === "Resolved" ? <AdminPill tone="green">Resolved</AdminPill> : m.status === "In Review" ? <AdminPill tone="amber">In Review</AdminPill> : <AdminPill tone="red">Open</AdminPill>,
                                        at: m.at,
                                        act: (
                                            <div className="flex items-center justify-end gap-2">
                                                <NeonButton variant="ghost" onClick={() => alert(`Preview: open case ${m.id}`)}>
                                                    View
                                                </NeonButton>
                                                <NeonButton variant="blue" onClick={() => alert(`Preview: resolve case ${m.id}`)}>
                                                    Resolve
                                                </NeonButton>
                                            </div>
                                        ),
                                    }))}
                                />
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "messaging" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<MessageCircle className="w-4 h-4" />}
                                title="Messaging"
                                sub="Broadcast to fans/creators with a sent log (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <div className="text-sm text-cyan-200">Send Broadcast</div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <NeonButton variant={audience === "fans" ? "blue" : "ghost"} onClick={() => setAudience("fans")}>
                                            Fans
                                        </NeonButton>
                                        <NeonButton variant={audience === "creators" ? "blue" : "ghost"} onClick={() => setAudience("creators")}>
                                            Creators
                                        </NeonButton>
                                        <NeonButton variant={audience === "both" ? "blue" : "ghost"} onClick={() => setAudience("both")}>
                                            Both
                                        </NeonButton>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        <input
                                            value={broadcastText}
                                            onChange={(e) => setBroadcastText(e.target.value)}
                                            placeholder="Type broadcast…"
                                            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
                                        />
                                        <NeonButton
                                            variant="pink"
                                            disabled={!broadcastText.trim()}
                                            onClick={() => {
                                                const msg = broadcastText.trim();
                                                if (!msg) return;
                                                const now = new Date();
                                                const hh = String(now.getHours()).padStart(2, "0");
                                                const mm = String(now.getMinutes()).padStart(2, "0");
                                                setBroadcastLog((l) => [{ at: `Today ${hh}:${mm}`, to: audience === "both" ? "Both" : audience === "fans" ? "Fans" : "Creators", msg }, ...l]);
                                                setBroadcastText("");
                                            }}
                                        >
                                            Send
                                        </NeonButton>
                                    </div>

                                    <div className="mt-3 text-[11px] text-gray-400">
                                        Preview-only: no backend. Use this to validate UI + routing.
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <div className="text-sm text-cyan-200">Sent Log</div>
                                    <div className="mt-3 space-y-2 max-h-[260px] overflow-auto pr-1">
                                        {broadcastLog.map((b, i) => (
                                            <div key={`${b.at}-${i}`} className="rounded-2xl border border-white/10 bg-black/40 p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-[11px] text-gray-400">{b.at}</div>
                                                    <AdminPill tone="cyan">{b.to}</AdminPill>
                                                </div>
                                                <div className="mt-2 text-sm text-white">{b.msg}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </NeonCard>
                    )}

                    {bizModule === "monitoring" && (
                        <NeonCard className="p-5">
                            <AdminSectionTitle
                                icon={<Flame className="w-4 h-4" />}
                                title="Monitoring"
                                sub="Health checks and alerts (preview)."
                                right={<HeaderRight />}
                            />

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { k: "Payments", v: health.payments, set: (x: string) => setHealth((h) => ({ ...h, payments: x })) },
                                    { k: "Realtime", v: health.realtime, set: (x: string) => setHealth((h) => ({ ...h, realtime: x })) },
                                    { k: "Safety Queue", v: health.safetyQueue, set: (x: string) => setHealth((h) => ({ ...h, safetyQueue: x })) },
                                    { k: "Payouts", v: health.payouts, set: (x: string) => setHealth((h) => ({ ...h, payouts: x })) },
                                ].map((m) => (
                                    <div key={m.k} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="text-sm text-cyan-200">{m.k}</div>
                                            <AdminPill tone={m.v === "OK" ? "green" : m.v === "Elevated" ? "amber" : "red"}>{m.v}</AdminPill>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <NeonButton variant="ghost" onClick={() => m.set("OK")}>OK</NeonButton>
                                            <NeonButton variant="ghost" onClick={() => m.set("Elevated")}>Elevated</NeonButton>
                                            <NeonButton variant="ghost" onClick={() => m.set("Down")}>Down</NeonButton>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                                <div className="text-sm text-cyan-200">Alert Feed (mock)</div>
                                <div className="mt-2 space-y-2 text-xs text-gray-200">
                                    <div className="flex items-center justify-between">
                                        <span>Safety queue backlog elevated</span>
                                        <AdminPill tone="amber">Warn</AdminPill>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Payments webhook retries stable</span>
                                        <AdminPill tone="green">OK</AdminPill>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Payout batch processing normal</span>
                                        <AdminPill tone="green">OK</AdminPill>
                                    </div>
                                </div>
                            </div>
                        </NeonCard>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---- Wrapper to provide auth context to the preview
export default function AdminPage() {
    const { logout } = useAuth();
    return <AdminBusinessConsolePreview onExit={logout} />;
}
