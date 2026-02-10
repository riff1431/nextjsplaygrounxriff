"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Trophy,
    Users,
    Clock,
    ShieldCheck,
    ClipboardCopy,
    BarChart3,
    Timer,
    BadgeCheck,
    DollarSign,
    Crown,
    Video,
    Mic,
    MicOff,
    Camera,
    CameraOff,
    FlipHorizontal,
    ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

// Types matching Backend/UI
type Phase = "SETUP" | "TOPIC_VOTING" | "TOPIC_LOCKED" | "LIVE" | "ENDED";

type ActivityItem = {
    id: string;
    ts: number;
    type: "vote" | "tip" | "system";
    text: string;
};

type CreatorStats = {
    creatorId: string;
    registered: boolean;
    ready: boolean;
    votes: number;
    tipsCents: number;
    rank: number | null;
    queueSize: number;
    etaSeconds: number;
};

type EventSummary = {
    eventId: string;
    theme: string;
    phase: Phase;
    remainingSeconds: number;
    fanCountPaid: number;
    prizeSummary: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function formatHMS(seconds: number) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function moneyFromCents(cents: number) {
    const dollars = Math.floor((cents ?? 0) / 100);
    return `$${dollars.toFixed(0)}`;
}

function Badge({
    text,
    tone = "blue",
}: {
    text: string;
    tone?: "pink" | "yellow" | "blue" | "gray" | "green";
}) {
    const toneCls =
        tone === "yellow"
            ? "border-yellow-400/35 text-yellow-200"
            : tone === "blue"
                ? "border-cyan-300/25 text-cyan-200"
                : tone === "green"
                    ? "border-emerald-300/25 text-emerald-200"
                    : tone === "gray"
                        ? "border-white/10 text-gray-200"
                        : "border-pink-500/30 text-pink-200";
    return (
        <span className={cx("text-[10px] px-2 py-[2px] rounded-full border bg-black/40", toneCls)}>
            {text}
        </span>
    );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-cyan-300/15 bg-black",
                "shadow-[0_0_22px_rgba(59,130,246,0.10),0_0_52px_rgba(236,72,153,0.06)]",
                className
            )}
        >
            {children}
        </div>
    );
}

function Btn({
    children,
    onClick,
    disabled,
    variant = "default",
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "default" | "ghost" | "blue" | "green";
}) {
    const cls =
        variant === "blue"
            ? "border-cyan-300/25 text-cyan-200 bg-cyan-600/10 hover:bg-cyan-600/20"
            : variant === "green"
                ? "border-emerald-300/25 text-emerald-200 bg-emerald-600/10 hover:bg-emerald-600/20"
                : variant === "ghost"
                    ? "border-white/10 text-gray-200 bg-black/30 hover:bg-white/5"
                    : "border-white/10 text-gray-200 bg-white/5 hover:bg-white/10";
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={cx(
                "rounded-xl border px-3 py-2 text-sm transition inline-flex items-center justify-center gap-2",
                cls,
                disabled ? "opacity-40 cursor-not-allowed" : ""
            )}
        >
            {children}
        </button>
    );
}

function CreatorSelfPreview({
    disabled,
    ready,
    onToggleReady,
}: {
    disabled?: boolean;
    ready: boolean;
    onToggleReady: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [started, setStarted] = useState(false);
    const [camOn, setCamOn] = useState(true);
    const [micOn, setMicOn] = useState(false);
    const [mirror, setMirror] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const stop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setStarted(false);
    };

    const start = async () => {
        setErr(null);
        if (disabled) return;
        if (!navigator?.mediaDevices?.getUserMedia) {
            setErr("Camera preview is not supported in this browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: camOn,
                audio: micOn,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setStarted(true);
        } catch (e: any) {
            setErr(e?.message || "Could not start camera preview.");
            stop();
        }
    };

    useEffect(() => {
        const s = streamRef.current;
        if (!s) return;
        s.getVideoTracks().forEach((t) => (t.enabled = camOn));
        s.getAudioTracks().forEach((t) => (t.enabled = micOn));
    }, [camOn, micOn]);

    useEffect(() => {
        return () => stop();
    }, []);

    return (
        <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-cyan-200 text-sm inline-flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Self Preview
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">
                        Check lighting, framing, and audio before you appear in the rotation.
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Btn
                        variant={ready ? "ghost" : "green"}
                        onClick={onToggleReady}
                        disabled={disabled || !started}
                    >
                        <ShieldCheck className="w-4 h-4" /> {ready ? "Ready" : "Looks Good / Ready"}
                    </Btn>

                    {!started ? (
                        <Btn variant="blue" onClick={start} disabled={disabled}>
                            <Video className="w-4 h-4" /> Start Preview
                        </Btn>
                    ) : (
                        <Btn variant="ghost" onClick={stop}>
                            Stop
                        </Btn>
                    )}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                    <div className="aspect-video rounded-xl border border-white/10 bg-black/30 overflow-hidden relative">
                        {!started ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-gray-300 inline-flex items-center gap-2">
                                    <Video className="w-4 h-4 text-cyan-200" />
                                    <span className="text-sm">Preview is off</span>
                                </div>
                            </div>
                        ) : null}

                        <video
                            ref={videoRef}
                            playsInline
                            muted
                            className={cx("w-full h-full object-cover", mirror ? "scale-x-[-1]" : "")}
                        />
                    </div>

                    {err ? <div className="mt-2 text-[11px] text-red-300">{err}</div> : null}
                    <div className="mt-2 text-[11px] text-gray-500">
                        Note: This is a preview-only camera feed; it is not broadcast.
                    </div>
                </div>

                <div className="md:col-span-4 space-y-2">
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400">Controls</div>
                        <div className="mt-2 flex flex-col gap-2">
                            <Btn variant="ghost" onClick={() => setCamOn((v) => !v)} disabled={disabled}>
                                {camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                                Camera: {camOn ? "On" : "Off"}
                            </Btn>
                            <Btn variant="ghost" onClick={() => setMicOn((v) => !v)} disabled={disabled}>
                                {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                                Mic: {micOn ? "On" : "Off"}
                            </Btn>
                            <Btn variant="ghost" onClick={() => setMirror((v) => !v)}>
                                <FlipHorizontal className="w-4 h-4" /> Mirror: {mirror ? "On" : "Off"}
                            </Btn>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                        <div className="text-[10px] text-gray-400">Quick checks</div>
                        <ul className="mt-2 text-[11px] text-gray-300 list-disc pl-5 space-y-1">
                            <li>Face centered, good lighting</li>
                            <li>Background clean</li>
                            <li>Audio clear (if using mic)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default function CompetitionsCreatorStudio() {
    const router = useRouter();
    const supabase = createClient();
    const [roomId, setRoomId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [event, setEvent] = useState<EventSummary>({
        eventId: "",
        theme: "Loading...",
        phase: "SETUP",
        remainingSeconds: 0,
        fanCountPaid: 0,
        prizeSummary: "Fetching prizes...",
    });

    const [me, setMe] = useState<CreatorStats>({
        creatorId: "",
        registered: false,
        ready: false,
        votes: 0,
        tipsCents: 0,
        rank: null,
        queueSize: 0,
        etaSeconds: 0,
    });

    const [activity, setActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Find room
            const { data: room } = await supabase
                .from('rooms')
                .select('id')
                .eq('host_id', user.id)
                .limit(1)
                .single();

            if (room) {
                setRoomId(room.id);
                loadData(room.id);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!event.eventId) return;

        // Subscribe to changes
        const channel = supabase.channel(`comp_live_${event.eventId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'competitions', filter: `id=eq.${event.eventId}` }, (payload: any) => {
                const updatedComp = payload.new;
                setEvent(prev => ({
                    ...prev,
                    theme: updatedComp.theme,
                    phase: updatedComp.status,
                    fanCountPaid: updatedComp.fan_count_paid || 0,
                    // Simple logic for remaining time
                    remainingSeconds: updatedComp.phase_end_time ? Math.max(0, Math.floor((new Date(updatedComp.phase_end_time).getTime() - Date.now()) / 1000)) : 0
                }));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_participants', filter: `competition_id=eq.${event.eventId}` }, () => {
                // Refresh "me" data if something changed
                if (roomId) loadData(roomId);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [event.eventId, roomId]);


    const loadData = async (rid: string) => {
        try {
            const res = await fetch(`/api/v1/rooms/${rid}/competition/state`);
            const data = await res.json();
            if (data.competition) {
                const c = data.competition;
                setEvent({
                    eventId: c.id,
                    theme: c.theme,
                    phase: c.status,
                    remainingSeconds: c.phase_end_time ? Math.max(0, Math.floor((new Date(c.phase_end_time).getTime() - Date.now()) / 1000)) : 0,
                    fanCountPaid: c.fan_count_paid || 0,
                    prizeSummary: `Entry Fee: $${c.entry_fee}. Tips split 90/10.`,
                });
            }
            if (data.me) {
                setMe(data.me);
            }
            if (data.activity) {
                setActivity(data.activity.map((a: any) => ({
                    id: a.id,
                    ts: new Date(a.created_at).getTime(),
                    type: a.type as "vote" | "tip" | "system",
                    text: a.message
                })));
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load competition data");
        } finally {
            setLoading(false);
        }
    };


    // Countdown
    useEffect(() => {
        if (event.phase !== "LIVE") return;
        const t = setInterval(() => {
            setEvent((e) => ({ ...e, remainingSeconds: Math.max(0, e.remainingSeconds - 1) }));
        }, 1000);
        return () => clearInterval(t);
    }, [event.phase]);

    const performAction = async (action: string, payload: any = {}) => {
        if (!roomId || !event.eventId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/competition/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    competitionId: event.eventId,
                    action,
                    payload
                })
            });
            if (!res.ok) throw new Error("Action failed");
            return true;
        } catch (e) {
            toast.error("Action error");
            return false;
        }
    };

    const joinAsCreator = async () => {
        const success = await performAction('REGISTER');
        if (success) {
            setMe((m) => ({ ...m, registered: true, ready: false }));
            setActivity((a) => [
                { id: `sys_${Date.now()}`, ts: Date.now(), type: "system" as const, text: "You are registered for this event." },
                ...a,
            ].slice(0, 12));
            if (roomId) loadData(roomId); // Reload to get IDs correctly
        }
    };

    const toggleReady = async () => {
        const nextState = !me.ready;
        const success = await performAction('TOGGLE_READY', { ready: nextState });
        if (success) {
            setMe((m) => {
                setActivity((a) => [
                    {
                        id: `sys_${Date.now()}`,
                        ts: Date.now(),
                        type: "system" as const,
                        text: nextState ? "You are marked READY for rotation." : "You are marked NOT READY.",
                    },
                    ...a,
                ].slice(0, 12));
                return { ...m, ready: nextState };
            });
        }
    };

    const copyShareLink = async () => {
        const link = `https://playgroundx.app/competitions/event/${event.eventId}?creator=${me.creatorId}`;
        try {
            await navigator.clipboard.writeText(link);
            setActivity((a) => [
                { id: `sys_${Date.now()}`, ts: Date.now(), type: "system" as const, text: "Share link copied to clipboard." },
                ...a,
            ].slice(0, 12));
            toast.success("Link copied!");
        } catch {
            setActivity((a) => [
                { id: `sys_${Date.now()}`, ts: Date.now(), type: "system" as const, text: "Could not copy link." },
                ...a,
            ].slice(0, 12));
        }
    };

    const statusLabel = useMemo(() => {
        if (!me.registered) return "Join the event to appear in rotation.";
        if (me.ready) return "Status: Ready for rotation.";
        return "Status: Not ready — you will not be rotated.";
    }, [me.ready, me.registered]);

    if (loading && !event.eventId) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Studio...</div>;


    return (
        <div className="min-h-screen bg-black text-white">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-300/15">
                <div className="flex items-center gap-2">
                    <button onClick={() => router.back()} className="mr-2 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-pink-500 text-2xl font-semibold">PlayGround</span>
                    <span className="text-blue-400 text-2xl font-extrabold">X</span>
                    <span className="ml-3 text-[11px] px-2 py-[2px] rounded-full border border-white/10 text-gray-200 bg-black/40">
                        Creator Studio
                    </span>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatHMS(event.remainingSeconds)} left
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {event.fanCountPaid} fans paid
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> {event.theme}
                    </span>
                    <Badge text={event.phase} tone="gray" />
                </div>
            </div>

            <main className="p-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main column */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-cyan-200 text-sm inline-flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" /> Creator Studio
                                    </div>
                                    <div className="mt-2 text-[11px] text-gray-400">
                                        Monitor your rank, votes, and tips during the event. Encourage fans to vote each round.
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[11px] text-gray-400">Event remaining</div>
                                    <div className="text-yellow-200 font-semibold">{formatHMS(event.remainingSeconds)}</div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {me.registered ? (
                                    <Btn
                                        variant={me.ready ? "ghost" : "green"}
                                        onClick={toggleReady}
                                        disabled={event.phase !== "LIVE" && event.phase !== 'SETUP'} // Allow setup testing
                                    >
                                        <ShieldCheck className="w-4 h-4" /> {me.ready ? "Ready" : "Looks Good / Ready"}
                                    </Btn>
                                ) : null}

                                {!me.registered ? (
                                    <Btn variant="blue" onClick={joinAsCreator}>
                                        <BadgeCheck className="w-4 h-4" /> Join as Creator (Free)
                                    </Btn>
                                ) : (
                                    <Btn variant="blue" onClick={copyShareLink}>
                                        <ClipboardCopy className="w-4 h-4" /> Copy my share link
                                    </Btn>
                                )}
                            </div>
                        </Card>

                        <CreatorSelfPreview disabled={!me.registered} ready={me.ready} onToggleReady={toggleReady} />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="p-5">
                                <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                                    <BarChart3 className="w-3 h-3" /> Your votes
                                </div>
                                <div className="mt-1 text-xl text-gray-100 font-semibold">{me.votes}</div>
                                <div className="mt-2 text-[11px] text-gray-400">Votes determine ranking.</div>
                            </Card>
                            <Card className="p-5">
                                <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> Your tips
                                </div>
                                <div className="mt-1 text-xl text-gray-100 font-semibold">{moneyFromCents(me.tipsCents)}</div>
                                <div className="mt-2 text-[11px] text-gray-400">Tips pay out 90% to you.</div>
                            </Card>
                            <Card className="p-5">
                                <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                                    <Crown className="w-3 h-3" /> Your rank
                                </div>
                                <div className="mt-1 text-xl text-gray-100 font-semibold">{me.rank ?? "—"}</div>
                                <div className="mt-2 text-[11px] text-gray-400">Tie-breaker: tips (optional).</div>
                            </Card>
                        </div>

                        <Card className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-cyan-200 text-sm">Live activity</div>
                                    <div className="text-[11px] text-gray-400 mt-1">Votes, tips, and system updates.</div>
                                </div>
                                <Badge text={me.registered ? "Registered" : "Not registered"} tone={me.registered ? "green" : "gray"} />
                            </div>

                            <div className="mt-4 space-y-2">
                                {activity.map((a) => (
                                    <div
                                        key={a.id}
                                        className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-start justify-between gap-3"
                                    >
                                        <div>
                                            <div className="text-sm text-gray-100">{a.text}</div>
                                            <div className="mt-1 text-[11px] text-gray-500">{new Date(a.ts).toLocaleTimeString()}</div>
                                        </div>
                                        <Badge
                                            text={a.type.toUpperCase()}
                                            tone={a.type === "tip" ? "yellow" : a.type === "vote" ? "blue" : "gray"}
                                        />
                                    </div>
                                ))}
                                {activity.length === 0 && <div className="text-center text-xs text-gray-500 py-4">No recent activity.</div>}
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="p-5">
                            <div className="text-cyan-200 text-sm">Your next appearance</div>
                            <div className="mt-2 text-[11px]">
                                {me.registered ? (
                                    me.ready ? (
                                        <span className="text-emerald-200">{statusLabel}</span>
                                    ) : (
                                        <span className="text-yellow-200">{statusLabel}</span>
                                    )
                                ) : (
                                    <span className="text-gray-400">{statusLabel}</span>
                                )}
                            </div>

                            <div className="mt-3 text-[11px] text-gray-400">The server decides rotation order.</div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                                        <Timer className="w-3 h-3" /> Est. time
                                    </div>
                                    <div className="mt-1 text-sm text-gray-100">~{Math.max(1, Math.round(me.etaSeconds / 60))} min</div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                                    <div className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                                        <Users className="w-3 h-3" /> Queue size
                                    </div>
                                    <div className="mt-1 text-sm text-gray-100">{me.queueSize.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="mt-4 text-[11px] text-gray-400">
                                Recommendation: remind fans to vote every round—fans get 2 free votes per round.
                            </div>
                        </Card>

                        <Card className="p-5">
                            <div className="text-cyan-200 text-sm">Rules summary</div>
                            <ul className="mt-3 text-[11px] text-gray-300 space-y-2 list-disc pl-5">
                                <li>Creators join free; one event at a time.</li>
                                <li>Ranking based on votes (tips can break ties).</li>
                                <li>Tips split: 90% creator / 10% house.</li>
                                <li>Suspicious votes may be throttled or excluded.</li>
                            </ul>
                        </Card>

                        <Card className="p-5">
                            <div className="text-cyan-200 text-sm">Prize rules</div>
                            <div className="mt-2 text-[11px] text-gray-400">{event.prizeSummary}</div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
