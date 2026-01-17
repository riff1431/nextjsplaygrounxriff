"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProtectRoute } from "../../../context/AuthContext";
import { createClient } from "@/utils/supabase/client";

// -------------------- helpers --------------------
function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
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

// -------------------- types --------------------
type Lane = "Priority" | "Paid" | "Free";
type Status = "Queued" | "Answered" | "Refunded" | "Pinned";

type Msg = {
    id: string;
    from: string;
    lane: Lane;
    body: string;
    paid?: number;
    ts: string;
    status: Status;
};

// -------------------- component --------------------
export default function XChatCreatorView() {
    const router = useRouter();
    const supabase = createClient();
    const onBack = () => router.push("/home");
    const onFanView = () => router.push("/rooms/x-chat");

    const [toast, setToast] = useState<string | null>(null);
    const [lane, setLane] = useState<Lane>("Priority");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [reply, setReply] = useState("");

    const [busyId, setBusyId] = useState<string | null>(null);
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [roomId, setRoomId] = useState<string | null>(null);

    // 1. Init Room + Fetch + Subscribe
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Find room
            const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('host_id', user.id)
                .limit(1)
                .single();

            let targetRoomId = room?.id;
            if (!targetRoomId) {
                // Auto-create room for demo
                const { data: newRoom } = await supabase
                    .from('rooms')
                    .insert([{ host_id: user.id, title: "X Chat Room", status: "live" }])
                    .select()
                    .single();
                targetRoomId = newRoom?.id;
            }

            if (targetRoomId) {
                setRoomId(targetRoomId);
                fetchMessages(targetRoomId);
                subscribeToMessages(targetRoomId);
            }
        }
        init();
    }, []);

    async function fetchMessages(rid: string) {
        try {
            const res = await fetch(`/api/v1/rooms/${rid}/x-chat/messages`);
            const data = await res.json();
            if (data.messages) {
                setMsgs(data.messages.map(transformMsg));
            }
        } catch (e) {
            console.error(e);
        }
    }

    function subscribeToMessages(rid: string) {
        const channel = supabase.channel(`room_${rid}_xchat`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'x_chat_messages', filter: `room_id=eq.${rid}` }, (payload) => {
                setMsgs(prev => [...prev, transformMsg(payload.new)]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'x_chat_messages', filter: `room_id=eq.${rid}` }, (payload) => {
                const updated = transformMsg(payload.new);
                setMsgs(prev => prev.map(m => m.id === updated.id ? updated : m));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }

    function transformMsg(row: any): Msg {
        return {
            id: row.id,
            from: row.sender_name,
            lane: row.lane as Lane,
            body: row.body,
            paid: row.paid_amount > 0 ? row.paid_amount : undefined,
            ts: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: row.status as Status
        };
    }

    const pushToast = (m: string) => {
        setToast(m);
        window.setTimeout(() => setToast((t) => (t === m ? null : t)), 1400);
    };

    const laneChip = (l: Lane) =>
        l === "Priority"
            ? "border-yellow-400/35 text-yellow-200 bg-yellow-500/10"
            : l === "Paid"
                ? "border-cyan-200/25 text-cyan-200 bg-black/30"
                : "border-white/10 text-gray-200 bg-black/25";

    const visible = useMemo(() => {
        return msgs.filter((m) => m.lane === lane && m.status === "Queued");
    }, [msgs, lane]);

    const stats = useMemo(() => {
        const queued = msgs.filter((m) => m.status === "Queued").length;
        const answered = msgs.filter((m) => m.status === "Answered").length;

        const gross = msgs.reduce(
            (s, m) => s + (m.status === "Answered" ? (m.paid ?? 0) : 0),
            0
        );
        const pendingGross = msgs.reduce(
            (s, m) => s + (m.status === "Queued" ? (m.paid ?? 0) : 0),
            0
        );

        return { queued, answered, gross, pendingGross };
    }, [msgs]);

    const performAction = async (id: string, action: 'answer' | 'refund' | 'pin', replyText?: string) => {
        if (!roomId) return;
        try {
            setBusyId(id);
            // Optimistic update
            const oldStatus = msgs.find(m => m.id === id)?.status;
            setMsgs(prev => prev.map(m => m.id === id ? { ...m, status: action === 'answer' ? 'Answered' : action === 'refund' ? 'Refunded' : 'Pinned' } : m));

            const res = await fetch(`/api/v1/rooms/${roomId}/x-chat/messages/${id}/action`, {
                method: "POST",
                body: JSON.stringify({ action, reply: replyText })
            });
            const data = await res.json();

            if (data.success) {
                pushToast(action === 'answer' ? "✅ Marked answered" : action === 'refund' ? "↩️ Refunded" : "📌 Pinned");
                if (replyTo === id) {
                    setReplyTo(null);
                    setReply("");
                }
            } else {
                // Revert
                pushToast(`❌ Failed to ${action}`);
                if (oldStatus) {
                    setMsgs(prev => prev.map(m => m.id === id ? { ...m, status: oldStatus } : m));
                }
            }
        } catch {
            pushToast(`❌ Failed to ${action}`);
        } finally {
            setBusyId(null);
        }
    };

    const answer = (id: string) => performAction(id, 'answer', reply);
    const refund = (id: string) => performAction(id, 'refund');
    const pin = (id: string) => performAction(id, 'pin');

    // Simulate functionality for verification / demo
    const simulateFanMessage = async () => {
        if (!roomId) return;
        const lanes: Lane[] = ['Priority', 'Paid', 'Free'];
        const randomLane = lanes[Math.floor(Math.random() * lanes.length)];
        const paid = randomLane === 'Priority' ? 50 : randomLane === 'Paid' ? 10 : 0;

        await fetch(`/api/v1/rooms/${roomId}/x-chat/messages`, {
            method: "POST",
            body: JSON.stringify({
                senderName: `Fan_${Math.floor(Math.random() * 1000)}`,
                body: "Simulated incoming message! " + Date.now(),
                lane: randomLane,
                paidAmount: paid
            })
        });
    };

    return (
        <ProtectRoute allowedRoles={["creator"]}>
            <div className="min-h-screen bg-black text-white">
                <style>{`
        .vip-glow {
          box-shadow:
            0 0 16px rgba(255, 215, 0, 0.55),
            0 0 44px rgba(255, 215, 0, 0.28),
            0 0 22px rgba(255, 0, 200, 0.20);
        }
      `}</style>
                {toast && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] rounded-2xl border border-white/10 bg-black/75 px-4 py-2 text-sm text-gray-100 shadow-[0_0_40px_rgba(255,215,0,0.16)]">
                        {toast}
                    </div>
                )}

                <div className="max-w-7xl mx-auto px-6 py-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="rounded-xl border border-lime-200/25 bg-black/40 px-3 py-2 text-sm text-lime-200 hover:bg-white/5 inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>

                            <button
                                onClick={onFanView}
                                className="rounded-xl border border-blue-500/25 bg-black/40 px-3 py-2 text-sm text-blue-200 hover:bg-white/5 inline-flex items-center gap-2"
                                title="Switch to Fan room view"
                            >
                                <Sparkles className="w-4 h-4" /> Fan View
                            </button>

                            <button
                                onClick={simulateFanMessage}
                                className="rounded-xl border border-purple-500/25 bg-purple-600/20 px-3 py-2 text-sm text-purple-200 hover:bg-purple-600/30 inline-flex items-center gap-2"
                            >
                                <Send className="w-4 h-4" /> Sim Fan Msg
                            </button>

                            <div>
                                <div className="text-lime-200 text-sm">
                                    X Chat — Creator View
                                </div>
                                <div className="text-[11px] text-gray-400">
                                    Triage lanes, answer, and refund
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 vip-glow">
                                <div className="text-[10px] text-yellow-200">
                                    Answered gross (preview)
                                </div>
                                <div className="text-sm text-yellow-100 font-semibold">
                                    ${stats.gross.toLocaleString()}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-cyan-200/20 bg-black/35 px-3 py-2">
                                <div className="text-[10px] text-gray-400">Queue</div>
                                <div className="text-sm text-gray-100 font-semibold">
                                    {stats.queued} queued • {stats.answered} answered
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Inbox */}
                        <NeonCard className="lg:col-span-7 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-lime-200 text-sm">Inbox</div>
                                <div className="flex items-center gap-2">
                                    {(["Priority", "Paid", "Free"] as Lane[]).map((l) => (
                                        <button
                                            key={l}
                                            onClick={() => {
                                                setLane(l);
                                                setReplyTo(null);
                                                setReply("");
                                            }}
                                            className={cx(
                                                "rounded-xl border px-3 py-2 text-sm",
                                                lane === l
                                                    ? "border-lime-200/30 bg-lime-600/15"
                                                    : "border-white/10 bg-black/20 hover:bg-white/5"
                                            )}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {visible.length === 0 ? (
                                    <div className="text-sm text-gray-400">
                                        No queued messages in this lane.
                                    </div>
                                ) : (
                                    visible.map((m) => (
                                        <div
                                            key={m.id}
                                            className="rounded-2xl border border-white/10 bg-black/30 p-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-sm text-gray-100 flex items-center gap-2">
                                                        <span className="font-semibold truncate">
                                                            {m.from}
                                                        </span>

                                                        <span
                                                            className={cx(
                                                                "text-[10px] px-2 py-[2px] rounded-full border",
                                                                laneChip(m.lane)
                                                            )}
                                                        >
                                                            {m.lane}
                                                            {typeof m.paid === "number" ? ` • $${m.paid}` : ""}
                                                        </span>

                                                        <span className="text-[10px] px-2 py-[2px] rounded-full border border-white/10 text-gray-300 bg-black/40">
                                                            {m.ts}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1 text-sm text-gray-300 break-words">
                                                        {m.body}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 w-36">
                                                    <button
                                                        className="rounded-xl border border-lime-200/20 bg-lime-600/15 py-2 text-sm hover:bg-lime-600/25 disabled:opacity-60 disabled:cursor-not-allowed"
                                                        onClick={() => {
                                                            setReplyTo(m.id);
                                                            pushToast("✍️ Replying");
                                                        }}
                                                        disabled={busyId === m.id}
                                                    >
                                                        Reply
                                                    </button>

                                                    {typeof m.paid === "number" ? (
                                                        <button
                                                            className="rounded-xl border border-rose-400/25 bg-rose-600/10 py-2 text-sm hover:bg-rose-600/15 disabled:opacity-60 disabled:cursor-not-allowed"
                                                            onClick={() => refund(m.id)}
                                                            title="Refund and remove from queue"
                                                            disabled={busyId === m.id}
                                                        >
                                                            Refund
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="rounded-xl border border-white/10 bg-black/20 py-2 text-sm hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                                                            onClick={() => pin(m.id)}
                                                            disabled={busyId === m.id}
                                                        >
                                                            Pin
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {replyTo === m.id && (
                                                <div className="mt-3 rounded-2xl border border-lime-200/15 bg-black/35 p-3">
                                                    <div className="text-[11px] text-gray-400 mb-2">
                                                        Reply
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            value={reply}
                                                            onChange={(e) => setReply(e.target.value)}
                                                            className="flex-1 rounded-xl border border-lime-200/15 bg-black/40 px-3 py-2 text-sm outline-none text-white placeholder-gray-500"
                                                            placeholder="Type your reply…"
                                                            disabled={busyId === m.id}
                                                        />
                                                        <button
                                                            className="rounded-xl border border-lime-200/20 bg-lime-600/20 px-3 py-2 text-sm hover:bg-lime-600/30 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                                            onClick={() => answer(m.id)}
                                                            disabled={busyId === m.id}
                                                        >
                                                            <Send className="w-4 h-4" /> Send
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </NeonCard>

                        {/* Controls */}
                        <NeonCard className="lg:col-span-5 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-lime-200 text-sm">Controls</div>
                                <span className="text-[10px] px-2 py-[2px] rounded-full border border-yellow-400/30 text-yellow-200 bg-yellow-500/10 vip-glow">
                                    Pending paid: ${stats.pendingGross.toLocaleString()}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-[11px] text-gray-400">
                                        Priority policy
                                    </div>
                                    <div className="mt-1 text-sm text-gray-100">
                                        Auto-sort by: paid amount → age → lane
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3 vip-glow">
                                    <div className="text-yellow-200 text-sm">Quick Actions</div>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <button
                                            className="rounded-xl border border-yellow-400/25 bg-black/35 py-2 text-sm hover:bg-white/5"
                                            onClick={() => pushToast("🔇 Slow mode enabled")}
                                        >
                                            Slow Mode
                                        </button>
                                        <button
                                            className="rounded-xl border border-yellow-400/25 bg-black/35 py-2 text-sm hover:bg-white/5"
                                            onClick={() => pushToast("🧹 Cleared free lane")}
                                        >
                                            Clear Free Lane
                                        </button>
                                        <button
                                            className="rounded-xl border border-yellow-400/25 bg-black/35 py-2 text-sm hover:bg-white/5"
                                            onClick={() => pushToast("📣 Broadcasted prompt")}
                                        >
                                            Prompt Fans
                                        </button>
                                        <button
                                            className="rounded-xl border border-yellow-400/25 bg-black/35 py-2 text-sm hover:bg-white/5"
                                            onClick={() => pushToast("💰 Raised prices")}
                                        >
                                            Raise Prices
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-cyan-200/20 bg-black/35 p-3">
                                    <div className="text-cyan-200 text-sm">Creator Notes</div>
                                    <div className="mt-1 text-sm text-gray-100">
                                        Use Priority lane for paid guarantees; keep Free lane visible
                                        but throttled.
                                    </div>
                                </div>
                            </div>
                        </NeonCard>
                    </div>
                </div>
            </div>
        </ProtectRoute>
    );
}
