"use client";

import React, { useState } from "react";
import { ArrowLeft, Video, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute } from "@/app/context/AuthContext";

/**
 * X Chat Room — Fan View (Preview)
 * Entry: $0
 * Metered: $2/min (preview shows a minute counter; production should meter per-second server-side)
 *
 * Notes:
 * - This is UI-only; no real payments.
 * - Purchases should be server-authoritative in production.
 */

// Optional helper (remove if your project already has one)
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

// Replace with your existing card wrapper if you have one
function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_22px_rgba(236,72,153,0.14),0_0_52px_rgba(59,130,246,0.08)]",
                "hover:shadow-[0_0_34px_rgba(236,72,153,0.20),0_0_78px_rgba(59,130,246,0.12)] transition-shadow",
                className
            )}
        >
            {children}
        </div>
    );
}

export default function XChatRoomFanPreview() {
    const router = useRouter();
    const onBack = () => {
        router.push("/home");
    };

    const ENTRY_FEE = 0;
    const PER_MIN = 2;

    // Preview-only: minutes are manual.
    // Production should meter per-second and reconcile via server ledger.
    const [minsInRoom, setMinsInRoom] = useState(3);
    const runningCharge = ENTRY_FEE + Math.max(0, minsInRoom) * PER_MIN;

    const [chat, setChat] = useState("");
    const [toast, setToast] = useState<string | null>(null);

    const spend = (amount: number, msg: string) => {
        // Preview-only: we show confirmation but do not mutate an actual wallet/ledger here.
        setToast(msg);
        window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1400);

        // Production notes:
        // - purchases must be server-authoritative and idempotent
        // - attach purchase intent metadata: room_id, creator_id, session_id, sku_id, amount, currency
        // - update UI from server-confirmed receipt
    };

    const paidReactions = [
        { id: "xr1", label: "🔥 Boost", price: 2 },
        { id: "xr2", label: "💎 Shine", price: 5 },
        { id: "xr3", label: "👑 Crown", price: 10 },
        { id: "xr4", label: "⚡ Pulse", price: 15 },
    ];

    const stickers = [
        { id: "xs1", label: "💋 Kiss", price: 5 },
        { id: "xs2", label: "😈 Tease", price: 10 },
        { id: "xs3", label: "🌹 Rose", price: 25 },
        { id: "xs4", label: "🎁 Gift", price: 50 },
    ];

    const boosts = [
        { id: "xb1", label: "Pin my message (1 min)", price: 25 },
        { id: "xb2", label: "Highlight badge (2 min)", price: 40 },
        { id: "xb3", label: "Priority queue (5 min)", price: 75 },
    ];

    const directAccess = [
        { id: "xa1", label: "Private question", price: 20 },
        { id: "xa2", label: "Voice note reply", price: 35 },
        { id: "xa3", label: "1:1 mini chat (2 min)", price: 60 },
    ];

    const subs = [
        { id: "s1", name: "Basic", price: 9, note: "Member badge + discounted reactions" },
        { id: "s2", name: "Plus", price: 29, note: "Priority queue + sticker pack" },
        { id: "s3", name: "VIP", price: 99, note: "Top placement + monthly private session" },
    ];

    return (
        <ProtectRoute allowedRoles={["fan"]}>
            <div className="min-h-screen bg-black text-white">
                <style>{`
            .vip-glow {
              box-shadow:
                0 0 16px rgba(255, 215, 0, 0.55),
                0 0 44px rgba(255, 215, 0, 0.28),
                0 0 22px rgba(255, 0, 200, 0.20);
            }
          `}</style>
                <div className="max-w-7xl mx-auto px-6 py-6">
                    {toast && (
                        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border border-white/10 bg-black/75 px-4 py-2 text-sm text-gray-100 shadow-[0_0_40px_rgba(200,255,0,0.20)]">
                            {toast}
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="rounded-xl border border-lime-200/25 bg-black/40 px-3 py-2 text-sm text-lime-200 hover:bg-white/5 inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <div>
                                <div className="text-lime-200 text-sm">X Chat — Fan View (Preview)</div>
                                <div className="text-[11px] text-gray-400">Entry free • Metered at $2/min</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-lime-200/30 bg-lime-500/10 px-3 py-2">
                                <div className="text-[10px] text-lime-200">Pricing</div>
                                <div className="text-sm text-lime-100 font-semibold">Entry $0 • $2/min</div>
                            </div>
                            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-3 py-2">
                                <div className="text-[10px] text-yellow-200">Running charge (preview)</div>
                                <div className="text-sm text-yellow-100 font-semibold">${runningCharge}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <NeonCard className="lg:col-span-8 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-lime-200 text-sm">Live X Chat</div>
                                    <span className="text-[10px] px-2 py-[2px] rounded-full border border-lime-200/25 text-lime-200 bg-black/40">
                                        Room
                                    </span>
                                </div>
                                <div className="text-[11px] text-gray-400">Preview meter: adjust minutes</div>
                            </div>

                            <div className="rounded-2xl overflow-hidden border border-lime-200/15 bg-black/40">
                                <div className="relative aspect-video bg-[radial-gradient(circle_at_20%_18%,rgba(200,255,0,0.18),transparent_55%),radial-gradient(circle_at_70%_35%,rgba(0,230,255,0.10),transparent_60%),radial-gradient(circle_at_45%_90%,rgba(255,0,200,0.08),transparent_62%)] flex items-center justify-center">
                                    <div className="flex items-center gap-2 text-cyan-200">
                                        <Video className="w-5 h-5" />
                                        <span className="text-sm">Creator stream (preview)</span>
                                    </div>
                                    <div className="absolute bottom-3 left-3 text-xs text-gray-200 bg-black/45 border border-white/10 rounded-full px-3 py-1">
                                        @BlueMuse • Rising
                                    </div>
                                    <div className="absolute bottom-3 right-3 text-xs text-yellow-200 bg-black/45 border border-yellow-400/30 rounded-full px-3 py-1">
                                        ${PER_MIN}/min metered
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-lime-200/15 bg-black/30 p-3">
                                <div className="text-[11px] text-gray-400">Minutes in room (preview)</div>
                                <div className="mt-1 flex items-center justify-between gap-4">
                                    <div className="text-sm text-gray-100">
                                        Minutes: <span className="text-gray-200">{minsInRoom}</span> • Current:{" "}
                                        <span className="text-yellow-200">${runningCharge}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="px-2 py-1 rounded-lg border border-white/10 bg-black/30 text-xs hover:bg-white/5"
                                            onClick={() => setMinsInRoom((m) => Math.max(0, m - 1))}
                                        >
                                            −
                                        </button>
                                        <button
                                            className="px-2 py-1 rounded-lg border border-white/10 bg-black/30 text-xs hover:bg-white/5"
                                            onClick={() => setMinsInRoom((m) => m + 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 text-[10px] text-gray-400">
                                    Production: meter per-second, handle disconnects, and reconcile via server ledger.
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-lime-200/15 bg-black/35 p-4">
                                    <div className="text-lime-200 text-sm mb-2">Paid Reactions</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {paidReactions.map((r) => (
                                            <button
                                                key={r.id}
                                                className="rounded-xl border border-lime-200/15 bg-black/40 py-2 text-sm hover:bg-white/5"
                                                onClick={() => spend(r.price, `${r.label} • $${r.price}`)}
                                            >
                                                {r.label} <span className="text-gray-300">${r.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-400">One-tap micro-spend to surface in chat.</div>
                                </div>

                                <div className="rounded-2xl border border-lime-200/15 bg-black/35 p-4">
                                    <div className="text-lime-200 text-sm mb-2">Paid Stickers</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {stickers.map((s) => (
                                            <button
                                                key={s.id}
                                                className="rounded-xl border border-lime-200/15 bg-black/40 py-2 text-sm hover:bg-white/5"
                                                onClick={() => spend(s.price, `${s.label} • $${s.price}`)}
                                            >
                                                {s.label} <span className="text-gray-300">${s.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-400">
                                        Stickers can trigger on-stream overlays in production.
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4">
                                    <div className="text-yellow-200 text-sm mb-2">Visibility Boosts</div>
                                    <div className="space-y-2">
                                        {boosts.map((b) => (
                                            <button
                                                key={b.id}
                                                className="w-full rounded-xl border border-yellow-400/25 bg-black/35 px-3 py-2 text-sm hover:bg-white/5 flex items-center justify-between"
                                                onClick={() => spend(b.price, `✅ ${b.label} • $${b.price}`)}
                                            >
                                                <span className="text-gray-100">{b.label}</span>
                                                <span className="text-yellow-200 font-semibold">${b.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-500">Boosts can be time-bound and non-refundable.</div>
                                </div>

                                <div className="rounded-2xl border border-cyan-200/20 bg-black/35 p-4">
                                    <div className="text-cyan-200 text-sm mb-2">Direct Access</div>
                                    <div className="space-y-2">
                                        {directAccess.map((a) => (
                                            <button
                                                key={a.id}
                                                className="w-full rounded-xl border border-cyan-200/15 bg-black/35 px-3 py-2 text-sm hover:bg-white/5 flex items-center justify-between"
                                                onClick={() => spend(a.price, `✅ ${a.label} • $${a.price}`)}
                                            >
                                                <span className="text-gray-100">{a.label}</span>
                                                <span className="text-cyan-200 font-semibold">${a.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-[10px] text-gray-500">
                                        Creates a paid lane that does not depend on chat velocity.
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl border border-violet-300/25 bg-black/40 p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-violet-200 text-sm">Subscription</div>
                                    <span className="text-[10px] text-gray-400">Recurring revenue</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {subs.map((s) => (
                                        <div key={s.id} className="rounded-2xl border border-violet-300/20 bg-black/30 p-3">
                                            <div className="text-sm text-gray-100 font-semibold">{s.name}</div>
                                            <div className="mt-1 text-[11px] text-gray-300">{s.note}</div>
                                            <button
                                                className="mt-3 w-full rounded-xl border border-violet-300/25 bg-violet-600/20 py-2 text-sm hover:bg-violet-600/30"
                                                onClick={() => spend(s.price, `✅ Subscribed: ${s.name} • $${s.price}/mo`)}
                                            >
                                                ${s.price}/mo
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </NeonCard>

                        <div className="lg:col-span-4 space-y-6">
                            <NeonCard className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-lime-200 text-sm">Room Chat</div>
                                    <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                                        Live
                                    </span>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-black/30 p-3 h-[420px] overflow-auto">
                                    {[
                                        "Entry is free. Time is metered at $2/min.",
                                        "Boost your visibility with paid reactions.",
                                        "Priority queue is the fastest path to a reply.",
                                    ].map((m, idx) => (
                                        <div key={idx} className="text-sm text-gray-200 mb-2">
                                            <span className="text-lime-200">@fan{idx + 1}</span>: {m}
                                        </div>
                                    ))}
                                    <div className="text-sm text-gray-200 mb-2">
                                        <span className="text-cyan-200">@BlueMuse</span>: I’ll answer priority questions first.
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        value={chat}
                                        onChange={(e) => setChat(e.target.value)}
                                        className="flex-1 rounded-xl border border-lime-200/15 bg-black/40 px-3 py-2 text-sm outline-none"
                                        placeholder="Type message…"
                                    />
                                    <button
                                        className="rounded-xl border border-lime-200/20 bg-lime-600/20 px-3 py-2 text-sm hover:bg-lime-600/30 inline-flex items-center gap-2"
                                        onClick={() => {
                                            if (chat.trim()) {
                                                spend(0, "💬 Message sent (preview)");
                                                setChat("");
                                            }
                                        }}
                                    >
                                        <Send className="w-4 h-4" /> Send
                                    </button>
                                </div>

                                <div className="mt-4 rounded-2xl border border-lime-200/15 bg-black/35 p-3">
                                    <div className="text-[11px] text-gray-400">Billing rules</div>
                                    <div className="mt-1 text-sm text-gray-100">Entry: $0 • Metered: ${PER_MIN}/min</div>
                                    <div className="mt-2 text-[11px] text-gray-300">
                                        Reactions, stickers, boosts, and direct access are separate add-ons.
                                    </div>
                                </div>
                            </NeonCard>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
}
