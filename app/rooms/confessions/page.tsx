"use client";

import React, { useState, useEffect, Suspense } from "react";
import {
    ArrowLeft, Video, Lock, Check, X, Mic, UserRound, Menu, Coins,
    MessageSquareText, Flame, Heart, Sparkles, Gift, Search, UserPlus, Loader2,
    Eye, BadgeCheck, Send
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import dynamic from "next/dynamic";
import { toast as sonnerToast } from "sonner";

import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { useWallet } from "@/hooks/useWallet";
import InviteModal from "@/components/rooms/InviteModal";
import InvitationPopup from "@/components/rooms/InvitationPopup";
import BillingOverlay from "@/components/rooms/shared/BillingOverlay";
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const CONFESSIONS_FAN_TABS: MobileStudioTab[] = [
    { id: "chat", label: "Chat", icon: <MessageSquareText className="w-5 h-5" /> },
    { id: "wall", label: "Wall", icon: <Flame className="w-5 h-5" /> },
    { id: "request", label: "Request", icon: <Gift className="w-5 h-5" /> },
    { id: "info", label: "Info", icon: <UserRound className="w-5 h-5" /> },
];

import FloatingHearts from "@/components/rooms/confessions/FloatingHearts";
import CreatorSpotlight from "@/components/rooms/confessions/CreatorSpotlight";
import MyRequests from "@/components/rooms/confessions/MyRequests";
import ConfessionWall from "@/components/rooms/confessions/ConfessionWall";
import RequestConfession from "@/components/rooms/confessions/RequestConfession";
import LiveChatBox from "@/components/rooms/confessions/LiveChatBox";
import { cs } from "@/utils/currency";
import RoomTourHelpButton from "@/components/rooms/shared/RoomTourHelpButton";


/* ----------------------------- Tiny UI helpers ---------------------------- */

function cn(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

/* 
   MODERNIZED ROSE THEME
   - Primary: Rose/Pink/Red with Premium Glassmorphism
   - Bg: Deep Dark Red/Black (#0f0505) with noise texture
   - Borders: Subtle gradients
*/

type BtnVariant = "ghost" | "solid" | "rose" | "chip";

function Btn({
    children,
    className,
    variant = "solid",
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
    const base =
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group";

    const styles: Record<BtnVariant, string> = {
        solid:
            "bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-rose-50 shadow-lg shadow-black/20 backdrop-blur-sm",
        ghost: "bg-transparent hover:bg-rose-500/10 text-rose-200/80 hover:text-white",
        rose:
            "bg-gradient-to-br from-rose-600 to-rose-700 text-white border border-rose-500/30 shadow-[0_4px_20px_rgba(225,29,72,0.3)] hover:shadow-[0_6px_25px_rgba(225,29,72,0.4)] hover:brightness-110",
        chip:
            "bg-rose-950/40 hover:bg-rose-900/50 text-rose-100/90 border border-rose-800/30 px-3 py-1.5 rounded-full backdrop-blur-md hover:border-rose-700/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)]",
    };
    return (
        <button className={cn(base, styles[variant], className)} {...props}>
            {children}
        </button>
    );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-950/40 px-3 py-1 text-[10px] font-bold text-rose-100/90 uppercase tracking-wide backdrop-blur-md shadow-sm",
                className
            )}
        >
            {children}
        </div>
    );
}

function CardShell({
    title,
    right,
    children,
    className,
}: {
    title: string;
    right?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                "group relative overflow-hidden rounded-3xl border border-rose-500/10 bg-[#120205]/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-rose-500/20 hover:bg-[#120205]/80 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1",
                className
            )}
        >
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative flex items-center justify-between px-6 pt-5 pb-3 border-b border-rose-500/10">
                <h3 className="text-sm font-extrabold tracking-tight text-white/90 flex items-center gap-2">
                    {title}
                </h3>
                {right}
            </div>
            <div className="relative p-6">{children}</div>
        </section>
    );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
    const pct = Math.max(0, Math.min(1, max ? value / max : 0));
    return (
        <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden border border-rose-500/10">
            <div
                className="h-full rounded-full bg-gradient-to-r from-rose-600 via-pink-500 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] transition-all duration-1000 ease-out"
                style={{ width: `${pct * 100}%` }}
            />
        </div>
    );
}

// --------------------------------------------------------------------------

// ---- Types -----------------------------------------------------------------

type RequestStatus = 'pending_approval' | 'in_progress' | 'delivered' | 'completed' | 'rejected';

interface ConfessionRequest {
    id: string;
    type: 'Text' | 'Audio' | 'Video' | 'Image';
    amount: number;
    topic: string;
    status: RequestStatus;
    delivery_content?: string;
    delivery_media_url?: string;
    created_at: string;
}

interface CreatorInfo {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
}

interface Confession {
    id: string;
    tier: string;
    title: string;
    teaser: string;
    content?: string;
    media_url?: string;
    type: 'Text' | 'Voice' | 'Video' | 'Image';
    price: number;
    unlocked?: boolean;
    creator?: CreatorInfo;
}

// --------------------------------------------------------------------------

export default function ConfessionsRoomPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-pink-500 font-bold">Loading Room...</div>}>
            <ConfessionsRoom />
        </Suspense>
    );
}

function ConfessionsRoom() {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const { balance: walletBalance, refresh: refreshWallet } = useWallet();

    // URL params (set when coming from confessions-sessions browse)
    const urlRoomId = searchParams?.get('roomId');
    const urlSessionId = searchParams?.get('sessionId') || null; // treat empty string as null

    // Dynamic room discovery
    const [roomId, setRoomId] = useState<string | null>(null);
    const [hostId, setHostId] = useState<string | null>(null);
    const [hostAvatar, setHostAvatar] = useState<string | null>(null);
    const [hostStreamName, setHostStreamName] = useState("Creator");

    // State
    const [requests, setRequests] = useState<ConfessionRequest[]>([]);
    const [confessions, setConfessions] = useState<Confession[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [loadingWall, setLoadingWall] = useState(false);
    const [myWalletBalance, setMyWalletBalance] = useState(0);
    const [isLive, setIsLive] = useState(false);

    // Filter & Search
    const [tierFilter, setTierFilter] = useState<string>('All');
    const [creatorSearch, setCreatorSearch] = useState('');
    const [searchDebounce, setSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [mobileTab, setMobileTab] = useState<string>("chat");

    // Request Form
    const [reqType, setReqType] = useState<'Text' | 'Image' | 'Video'>('Text');
    const [reqAmount, setReqAmount] = useState(10);
    const [reqTopic, setReqTopic] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isAnon, setIsAnon] = useState(true);
    const [confessionMode, setConfessionMode] = useState<'1on1' | 'global'>('1on1');

    // Modals
    const [reviewRequest, setReviewRequest] = useState<ConfessionRequest | null>(null);
    const [purchaseConfession, setPurchaseConfession] = useState<Confession | null>(null);
    const [viewConfession, setViewConfession] = useState<Confession | null>(null);

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wallet'>('wallet');

    // Invite Modal
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Incoming Modal
    const [showIncomingModal, setShowIncomingModal] = useState(false);

    // Session Status Gating
    const [sessionStatus, setSessionStatus] = useState<string | null>(null);

    // Session Status Gating — fetch initial status and subscribe to realtime updates
    useEffect(() => {
        if (!urlSessionId) {
            setSessionStatus('active');
            return;
        }

        const supabase = createClient();

        const fetchSessionStatus = async () => {
            const { data } = await supabase.from('room_sessions').select('status, live_started_at').eq('id', urlSessionId).single();
            if (data) {
                if (data.status === 'ended') setSessionStatus('ended');
                else if (!data.live_started_at) setSessionStatus('pending');
                else setSessionStatus('active');
            }
        };
        fetchSessionStatus();

        const channel = supabase.channel(`session-status-${urlSessionId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_sessions', filter: `id=eq.${urlSessionId}` }, (payload) => {
                const newData = payload.new;
                if (newData.status === 'ended') setSessionStatus('ended');
                else if (!newData.live_started_at) setSessionStatus('pending');
                else setSessionStatus('active');
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [urlSessionId]);

    // Discover room on mount — prefer roomId from URL, then auto-discover
    useEffect(() => {
        if (!user) return;

        async function discoverRoom() {
            const supabase = createClient();

            // ── Case 1: roomId provided via URL (from confessions-sessions browse) ──
            // Always show fan UI — this page is for fan watching regardless of role.
            if (urlRoomId) {
                const { data: room } = await supabase
                    .from('rooms')
                    .select('id, host_id')
                    .eq('id', urlRoomId)
                    .maybeSingle();

                if (room) {
                    setRoomId(room.id);
                    setHostId(room.host_id);
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, username, avatar_url')
                        .eq('id', room.host_id)
                        .single();
                    if (profile) {
                        setHostStreamName(profile.full_name || profile.username || 'Creator');
                        setHostAvatar(profile.avatar_url || null);
                    }
                    return;
                }
            }

            // ── Case 2: No URL roomId — auto-discover any live confessions room ──
            const { data: confRoom } = await supabase
                .from('rooms')
                .select('id, host_id')
                .eq('type', 'confessions')
                .eq('status', 'live')
                .neq('host_id', user.id)   // skip own rooms — creator should use creator page
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (confRoom) {
                setRoomId(confRoom.id);
                setHostId(confRoom.host_id);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, username, avatar_url')
                    .eq('id', confRoom.host_id)
                    .single();
                if (profile) {
                    setHostStreamName(profile.full_name || profile.username || 'Creator');
                    setHostAvatar(profile.avatar_url || null);
                }
                return;
            }

            // Fallback: confessions table
            const { data: confessionRoom } = await supabase.from('confessions').select('room_id').limit(1).maybeSingle();
            if (confessionRoom?.room_id) { setRoomId(confessionRoom.room_id); return; }
            // Last resort — any room (even own, for preview purposes)
            const { data: anyRoom } = await supabase.from('rooms').select('id, host_id').limit(1).maybeSingle();
            if (anyRoom) {
                setRoomId(anyRoom.id);
                setHostId(anyRoom.host_id);
            }
        }
        discoverRoom();
    }, [user, urlRoomId, urlSessionId]);

    useEffect(() => {
        if (user && roomId) {
            fetchRequests();
            fetchWallet();

            const creatorParam = searchParams?.get('creator');
            if (creatorParam) {
                setCreatorSearch(creatorParam);
                setIsSearchMode(true);
                fetchConfessions(creatorParam, tierFilter);
            } else {
                fetchConfessions();
            }

            const supabase = createClient();
            
            // Fetch initial live status
            const fetchLiveStatus = async () => {
                const { data } = await supabase
                    .from('room_sessions')
                    .select('live_started_at')
                    .eq('room_id', roomId)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                setIsLive(!!data?.live_started_at);
            };
            fetchLiveStatus();

            // Realtime: session updates for live status
            const sessionChannel = supabase
                .channel(`room-sessions-${roomId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'room_sessions', filter: `room_id=eq.${roomId}` },
                    (payload) => {
                        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                            if (payload.new.status === 'active') {
                                setIsLive(!!payload.new.live_started_at);
                            } else if (payload.new.status === 'ended') {
                                setIsLive(false);
                            }
                        }
                    }
                )
                .subscribe();

            // Realtime: new confessions on wall
            const confessionChannel = supabase
                .channel('fan-confessions-wall')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' },
                    () => { fetchConfessions(creatorSearch, tierFilter); }
                )
                .subscribe();
            // Realtime: notifications for delivered requests
            const notifChannel = supabase
                .channel('fan-notifications')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                    (payload) => {
                        if (payload.new.type === 'confession_request_update') {
                            const isError = payload.new.message.includes('declined');
                            showToast(payload.new.message, isError ? 'error' : 'success');
                            fetchRequests();
                        }
                    }
                )
                .subscribe();
            // Realtime: direct updates to confession_requests
            const reqsChannel = supabase
                .channel(`fan-requests-${urlSessionId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'confession_requests', filter: `session_id=eq.${urlSessionId}` },
                    (payload) => {
                        if (payload.eventType === 'UPDATE' && payload.new.status === 'delivered' && payload.old?.status !== 'delivered') {
                            if (payload.new.fan_id === user.id) {
                                showToast("Your confession request has been delivered! Check it out.", "success");
                            }
                        }
                        fetchRequests();
                    }
                )
                .subscribe();

            return () => { 
                supabase.removeChannel(sessionChannel);
                supabase.removeChannel(confessionChannel); 
                supabase.removeChannel(notifChannel); 
                supabase.removeChannel(reqsChannel);
            };
        }
    }, [user, roomId, urlSessionId]);

    const fetchWallet = async () => {
        await refreshWallet();
    };

    const fetchRequests = async () => {
        if (!urlSessionId || !user) return;
        setLoadingRequests(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("confession_requests")
                .select("*")
                .eq("session_id", urlSessionId)
                .eq("fan_id", user.id)
                .order("created_at", { ascending: false });
            
            if (error) {
                console.error("DB Fetch Error:", error);
                return;
            }
            if (data) setRequests(data);
        } catch (e) {
            console.error("Failed requests", e);
        } finally {
            setLoadingRequests(false);
        }
    };

    const fetchConfessions = async (searchQuery?: string, tier?: string) => {
        setLoadingWall(true);
        try {
            const q = (searchQuery ?? creatorSearch).trim();
            const t = tier ?? tierFilter;
            const supabase = createClient();

            if (user) {
                const { data: unlocks } = await supabase
                    .from('confession_unlocks')
                    .select('confession_id')
                    .eq('user_id', user.id);
                if (unlocks) {
                    setMyUnlocks(new Set(unlocks.map((u: any) => u.confession_id)));
                }
            }

            let confessionRows: any[] = [];

            if (q) {
                // Creator search mode: cross-room query via Supabase
                setIsSearchMode(true);
                const { data: matchedProfiles } = await supabase.from('profiles').select('id, full_name, username, avatar_url').or(`full_name.ilike.%${q}%,username.ilike.%${q}%`).limit(20);
                if (!matchedProfiles || matchedProfiles.length === 0) { setConfessions([]); return; }

                const creatorIds = matchedProfiles.map((p: any) => p.id);
                const { data: rooms } = await supabase.from('rooms').select('id, host_id').in('host_id', creatorIds);
                if (!rooms || rooms.length === 0) { setConfessions([]); return; }

                const roomIds = rooms.map((r: any) => r.id);
                let confQuery = supabase.from('confessions').select('*').in('room_id', roomIds).eq('status', 'Published').order('created_at', { ascending: false });
                if (t && t !== 'All') confQuery = confQuery.eq('tier', t);
                if (urlSessionId) confQuery = confQuery.eq('session_id', urlSessionId);

                const { data: confData } = await confQuery;
                const roomToCreator = new Map<string, any>();
                for (const room of rooms) {
                    const profile = matchedProfiles.find((p: any) => p.id === room.host_id);
                    if (profile) roomToCreator.set(room.id, profile);
                }
                confessionRows = (confData || []).map((c: any) => ({ ...c, creator: roomToCreator.get(c.room_id) || null }));
            } else if (roomId) {
                // Default + tier filter: use server API endpoint (bypasses client RLS issues)
                setIsSearchMode(true);
                const params = new URLSearchParams();
                if (urlSessionId) params.set('sessionId', urlSessionId);
                const apiUrl = `/api/v1/rooms/${roomId}/confessions${params.toString() ? '?' + params.toString() : ''}`;
                const res = await fetch(apiUrl);
                const data = await res.json();
                
                if (data.confessions) {
                    let rows = data.confessions;
                    // Apply tier filter client-side (API doesn't support tier param)
                    if (t && t !== 'All') {
                        rows = rows.filter((c: any) => c.tier === t);
                    }
                    // Update unlocks from API response
                    if (user) {
                        const unlockedIds = new Set(rows.filter((c: any) => c.is_unlocked).map((c: any) => c.id));
                        setMyUnlocks(prev => {
                            const merged = new Set(prev);
                            unlockedIds.forEach((id: string) => merged.add(id));
                            return merged;
                        });
                    }
                    confessionRows = rows;
                }
            }

            const mapped = confessionRows.map((c: any) => ({
                id: c.id,
                tier: c.tier || 'Spicy',
                title: c.title,
                teaser: c.teaser || c.title,
                content: c.content,
                media_url: c.media_url,
                type: c.type || 'Text',
                price: c.price || 5,
                creator: c.creator || null,
            }));
            setConfessions(mapped);
        } catch (e) {
            console.error("Failed wall", e);
        } finally {
            setLoadingWall(false);
        }
    };

    const handleCreatorSearch = (value: string) => {
        setCreatorSearch(value);
        if (searchDebounce) clearTimeout(searchDebounce);
        const timeout = setTimeout(() => { fetchConfessions(value, tierFilter); }, 400);
        setSearchDebounce(timeout);
    };

    const handleTierFilter = (tier: string) => {
        setTierFilter(tier);
        fetchConfessions(creatorSearch, tier);
    };

    const [myUnlocks, setMyUnlocks] = useState<Set<string>>(new Set());

    const handleOpenConfirm = () => {
        if (!roomId || !reqTopic.trim() || reqAmount <= 0) return;
        setShowConfirmModal(true);
    };

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleConfirmAndPay = async () => {
        if (!roomId) { showToast('Room not found. Please refresh.', 'error'); return; }
        setIsSending(true);



        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/request`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: reqType, amount: reqAmount, topic: reqTopic, paymentMethod: selectedPaymentMethod, is_anonymous: isAnon, confession_mode: confessionMode, sessionId: urlSessionId })
            });
            const data = await res.json();
            if (data.success) {
                if (data.request) { setRequests(prev => [data.request, ...prev]); } else { fetchRequests(); }
                fetchWallet(); setReqTopic(""); setShowConfirmModal(false); showToast("Request Sent! Payment processed.", 'success');
            } else { showToast("Failed: " + data.error, 'error'); }
        } catch (e) { showToast("Error sending request", 'error'); } finally { setIsSending(false); }
    };

    const handleUnlockPurchase = async () => {
        if (!purchaseConfession) return;

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/unlock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confessionId: purchaseConfession.id }) });
            const data = await res.json();
            if (data.success || data.message === "Already unlocked") {
                setMyUnlocks(prev => new Set(prev).add(purchaseConfession!.id)); 
                
                // Update the confession in the state array to include the newly unlocked content and media
                if (data.confession) {
                    setConfessions(prev => prev.map(c => 
                        c.id === purchaseConfession!.id 
                            ? { ...c, content: data.confession.content, media_url: data.confession.media_url } 
                            : c
                    ));
                }

                setPurchaseConfession(null); 
                showToast("Confession Unlocked!", 'success'); 
                fetchWallet();
            } else { showToast("Purchase failed: " + data.error, 'error'); }
        } catch (e) { showToast("Payment error", 'error'); }
    };

    const handleReaction = async (label: string, amount: number, confessionId?: string) => {
        if (!roomId) return;

        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/tip`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confessionId: confessionId || null, reactionType: label, amount, sessionId: urlSessionId })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Sent ${label} reaction!`, 'success');
                fetchWallet();
            } else {
                showToast("Payment failed: " + data.error, 'error');
            }
        } catch (e) {
            showToast("Payment error", 'error');
        }
    };

    const handleApproveDelivery = async (reqId: string) => {
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/request/${reqId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) });
            if (res.ok) { setReviewRequest(null); fetchRequests(); showToast("Approved! Funds Released.", 'success'); }
        } catch (e) { }
    };

    const [spinning, setSpinning] = useState(false);
    const [spinDeg, setSpinDeg] = useState(0);
    const handleSpin = () => {
        if (spinning) return;
        setSpinning(true);
        const extra = 1440 + Math.floor(Math.random() * 360);
        setSpinDeg(d => d + extra);
        setTimeout(() => setSpinning(false), 2200);
    };

    const [bids, setBids] = useState([{ id: "b1", name: "Buzzed_Boi", amount: 50 }, { id: "b2", name: "blurredFan1", amount: 25 }]);
    async function placeBid(amount: number) {
        if (!roomId) return;
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/confessions/bid`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confessionId: confessions[0]?.id, amount }),
            });
            const data = await res.json();
            if (data.success) {
                setBids((prev) => {
                    const next = [...prev];
                    const me = next.find((x) => x.id === 'me');
                    if (me) me.amount += amount; else next.unshift({ id: 'me', name: 'You', amount });
                    return next.sort((a, b) => b.amount - a.amount);
                });
                fetchWallet();
                showToast(`Bid of ${cs()}${amount} placed!`, 'success');
            } else { showToast(data.error || 'Bid failed', 'error'); }
        } catch (e) { showToast('Bid error', 'error'); }
    }

    // ========================================================================
    // RENDER
    // ========================================================================

    // Session Status Gating — Waiting for Creator
    if (sessionStatus === 'pending') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center text-white relative" style={{ background: '#0f0505' }}>
                <div className="absolute inset-0 pointer-events-none">
                    <img src="/assets/bg-flames.png" alt="" className="w-full h-full object-cover opacity-20" />
                    <div className="absolute inset-0 bg-black/50" />
                </div>
                
                <button onClick={() => router.push('/home')} className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all z-20">
                    <ArrowLeft size={18} />
                </button>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-8" style={{ boxShadow: '0 0 30px hsla(350, 80%, 55%, 0.4)' }} />
                    <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-[0.2em] mb-3 text-center px-4" style={{ textShadow: '0 0 20px hsla(350, 80%, 55%, 0.5)' }}>
                        Waiting for Creator
                    </h1>
                    <p className="text-white/60 text-sm font-medium tracking-wide">
                        The confession session will begin shortly.
                    </p>
                </div>
            </div>
        );
    }

    // Session Status Gating — Session Ended
    if (sessionStatus === 'ended') {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center text-white relative" style={{ background: '#0f0505' }}>
                <div className="absolute inset-0 pointer-events-none">
                    <img src="/assets/bg-flames.png" alt="" className="w-full h-full object-cover opacity-10 grayscale" />
                    <div className="absolute inset-0 bg-black/80" />
                </div>
                
                <div className="relative z-10 flex flex-col items-center bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-md">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
                        <span className="text-2xl">💔</span>
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-3">
                        Session Ended
                    </h1>
                    <p className="text-white/50 text-sm font-medium mb-8">
                        This confession session has concluded.
                    </p>
                    <button onClick={() => router.push('/home')} className="px-8 py-3 rounded-xl text-white font-bold tracking-widest uppercase hover:brightness-110 transition-all text-sm" style={{ background: 'linear-gradient(135deg, hsl(350, 80%, 50%), hsl(350, 80%, 60%))' }}>
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <ProtectRoute allowedRoles={["fan", "creator"]}>
            <div className="h-screen relative text-foreground font-sans selection:bg-primary/30 overflow-hidden">
                {/* BACKGROUND — Vibrant pink flames */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <img src="/assets/bg-flames.png" alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/40" />
                </div>
                <FloatingHearts />

                {/* ── DESKTOP VIEW ── */}
                <div className="hidden md:flex relative z-10 h-full flex-col overflow-hidden">
                    {/* Header */}
                    <header className="shrink-0 z-30 border-b border-border bg-background/60 backdrop-blur-xl">
                        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
                            <button className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-secondary hover:bg-secondary/80 text-sm font-bold transition-all" onClick={() => router.push("/home")}>
                                <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
                            </button>

                            <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform">
                                <Heart className="h-5 w-5 fill-primary text-primary drop-shadow-[0_0_8px_rgba(255,42,109,0.5)]" />
                                <div className="text-xl font-black tracking-tighter text-foreground font-display">
                                    PlayGround<span className="text-primary drop-shadow-[0_0_10px_rgba(255,42,109,0.5)]">X</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3" data-tour="confession-invite-incoming">
                                <RoomTourHelpButton tourType="confession_fan" accentHsl="350, 80%, 55%" />
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 bg-primary/15 hover:bg-primary/25 text-primary text-sm font-bold transition-all border border-primary/30 hover:scale-105"
                                    title="Invite Friends"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Invite</span>
                                </button>
                                
                                {(() => {
                                    const unreadCount = requests.filter(r => r.status === 'delivered').length;
                                    return (
                                        <button onClick={() => setShowIncomingModal(true)} className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-secondary hover:bg-secondary/80 text-sm font-bold transition-all hidden sm:flex border border-transparent hover:border-border/50">
                                            <UserRound className="h-4 w-4 text-primary" /> Incoming
                                            {unreadCount > 0 && (
                                                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    </header>

                    {/* Main grid */}
                    <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex flex-col lg:flex-row gap-4 xl:gap-6 h-full">

                            {/* Left Column */}
                            <div className="flex flex-col gap-4 xl:gap-6 w-full lg:w-[480px] shrink-0 lg:h-full overflow-hidden" data-tour="confession-creator-spotlight">
                                <CreatorSpotlight
                                    liveStreamNode={
                                        roomId && user && hostId ? (
                                            isLive ? (
                                                <LiveStreamWrapper
                                                    role="fan"
                                                    appId={APP_ID}
                                                    roomId={roomId}
                                                    uid={user.id}
                                                    hostId={hostId}
                                                    hostAvatarUrl={hostAvatar || ""}
                                                    hostName={hostStreamName}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-black/80 rounded-2xl relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-20 mix-blend-overlay"></div>
                                                    <div className="relative z-10 flex flex-col items-center">
                                                        <div className="w-20 h-20 rounded-full border-2 border-rose-500/30 p-1 mb-4 relative">
                                                            <div className="absolute inset-0 border-2 border-rose-500 rounded-full animate-ping opacity-20"></div>
                                                            <img src={hostAvatar || "/default-avatar.png"} alt="Creator" className="w-full h-full rounded-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                                                        </div>
                                                        <h3 className="text-xl font-black text-white tracking-tight mb-2">Waiting for {hostStreamName}</h3>
                                                        <p className="text-rose-200/60 text-sm font-medium">Session will begin shortly...</p>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-black/50 text-rose-200/40 text-sm">
                                                {roomId ? "Connecting to stream..." : "No active session"}
                                            </div>
                                        )
                                    }
                                />
                                <LiveChatBox roomId={roomId} sessionId={urlSessionId} className="flex-1 min-h-0 w-full" />
                            </div>

                            {/* Center Column - wider, independently scrollable */}
                            <div className="flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-rose-500/20 scrollbar-track-transparent" data-tour="confession-all-creator-confessions">
                                <ConfessionWall
                                    confessions={confessions}
                                    myUnlocks={myUnlocks}
                                    loadingWall={loadingWall}
                                    tierFilter={tierFilter}
                                    handleTierFilter={handleTierFilter}
                                    setViewConfession={setViewConfession}
                                    setPurchaseConfession={setPurchaseConfession}
                                    handleReaction={handleReaction}
                                />
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4 xl:space-y-6 w-full lg:w-[320px] shrink-0 lg:h-full overflow-y-auto scrollbar-thin scrollbar-thumb-rose-500/20 scrollbar-track-transparent" data-tour="confession-request-builder">
                                <RequestConfession
                                    reqType={reqType}
                                    setReqType={setReqType}
                                    reqAmount={reqAmount}
                                    setReqAmount={setReqAmount}
                                    reqTopic={reqTopic}
                                    setReqTopic={setReqTopic}
                                    isAnon={isAnon}
                                    setIsAnon={setIsAnon}
                                    confessionMode={confessionMode}
                                    setConfessionMode={setConfessionMode}
                                    handleOpenConfirm={handleOpenConfirm}
                                    isSending={isSending}
                                />
                                <MyRequests
                                    requests={requests}
                                    setReviewRequest={setReviewRequest}
                                />
                            </div>
                        </div>
                    </main>
                </div>

                {/* ── MOBILE REDESIGN VIEW (matches reference image) ── */}
                <div className="flex md:hidden relative z-10 h-full flex-col overflow-hidden bg-[#070102]">
                    {/* Header */}
                    <header className="shrink-0 z-30 border-b border-[#22070c] bg-[#0c0204] px-4 py-3 flex items-center justify-between">
                        <button onClick={() => router.push("/home")} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition">
                            <ArrowLeft size={18} />
                        </button>
                        
                        <div className="flex items-center gap-1.5">
                            <Heart className="h-4.5 w-4.5 fill-primary text-primary drop-shadow-[0_0_8px_rgba(255,42,109,0.5)]" />
                            <span className="text-base font-black tracking-tight text-white display-font uppercase">
                                PlayGround<span className="text-primary drop-shadow-[0_0_10px_rgba(255,42,109,0.5)]">X</span>
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#d50057] text-white text-xs font-bold active:scale-[0.98] transition shadow-[0_0_12px_rgba(213,0,87,0.4)]"
                            >
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Invite</span>
                            </button>
                            <button 
                                onClick={() => setShowMobileMenu(true)} 
                                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 transition relative"
                            >
                                <span className="font-extrabold text-sm tracking-widest leading-none">...</span>
                                {requests.filter(r => r.status === 'delivered').length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                                )}
                            </button>
                        </div>
                    </header>

                    {/* Stream & Reactions fixed at top */}
                    <div className="shrink-0 px-4 pt-3 pb-2 space-y-3 flex flex-col bg-[#0c0204]">
                        {/* Live Video Spotlight */}
                        <div className="relative rounded-2xl overflow-hidden aspect-video border border-white/5 shadow-2xl bg-black/60 shrink-0">
                            {roomId && user && hostId ? (
                                isLive ? (
                                    <LiveStreamWrapper
                                        role="fan"
                                        appId={APP_ID}
                                        roomId={roomId}
                                        uid={user.id}
                                        hostId={hostId}
                                        hostAvatarUrl={hostAvatar || ""}
                                        hostName={hostStreamName}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-10 mix-blend-overlay"></div>
                                        <div className="relative z-10 flex flex-col items-center p-4">
                                            <div className="w-14 h-14 rounded-full border border-rose-500/30 p-0.5 mb-2 relative">
                                                <div className="absolute inset-0 border border-rose-500 rounded-full animate-ping opacity-25"></div>
                                                <img src={hostAvatar || "/default-avatar.png"} alt="Creator" className="w-full h-full rounded-full object-cover grayscale" />
                                            </div>
                                            <h4 className="text-sm font-bold text-white mb-1">Waiting for {hostStreamName}</h4>
                                            <p className="text-rose-200/40 text-[10px] font-medium">Session will begin shortly...</p>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-rose-200/40 text-xs">
                                    {roomId ? "Connecting to stream..." : "No active session"}
                                </div>
                            )}

                            {/* Overlays on Player */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 pointer-events-none">
                                <span className="flex items-center gap-1 bg-[#d50057] px-2 py-0.5 rounded-md text-[9px] font-extrabold text-white uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                                </span>
                                <span className="flex items-center gap-1 bg-black/50 border border-white/10 px-2 py-0.5 rounded-md text-[9px] font-extrabold text-white/90">
                                    <Eye className="w-3 h-3 text-white/70" /> 123
                                </span>
                            </div>

                            <button className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/85 z-20 transition">
                                <span className="text-sm">⛶</span>
                            </button>

                            {/* Neon glowing heart overlay bottom left */}
                            <button 
                                onClick={() => handleReaction('LOVE', 10)}
                                className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-black/40 border border-rose-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(225,29,72,0.4)] z-20 transition active:scale-95 group"
                            >
                                <Heart className="w-5 h-5 fill-[#ff2a6d] text-[#ff2a6d] drop-shadow-[0_0_5px_#ff2a6d] group-hover:scale-110 transition-transform" />
                            </button>
                        </div>

                        {/* Reactions & Tips Row */}
                        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                            {[
                                { icon: "💋", label: "KISS", price: 5 },
                                { icon: "💖", label: "LOVE", price: 10 },
                                { icon: "🔥", label: "SPICY", price: 20 },
                                { icon: "💎", label: "DIAMOND", price: 50 },
                            ].map((tip, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleReaction(tip.label, tip.price)}
                                    className="flex flex-col items-center justify-center min-w-[70px] py-1.5 rounded-xl border border-white/5 bg-[#140407] hover:border-rose-500/30 transition active:scale-[0.97]"
                                >
                                    <span className="text-base">{tip.icon}</span>
                                    <span className="text-[8px] font-black text-white/90 uppercase tracking-wider">{tip.label}</span>
                                    <span className="text-[8px] text-[#ff2a6d] font-bold">€{tip.price}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => handleReaction('GIFT', 10)}
                                className="flex flex-col items-center justify-center min-w-[70px] py-1.5 rounded-xl border border-dashed border-rose-500/30 bg-[#140407] hover:bg-rose-950/20 transition active:scale-[0.97] group"
                            >
                                <Gift className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform mb-0.5" />
                                <span className="text-[8px] font-black text-rose-300 uppercase tracking-wider">Gift</span>
                            </button>
                        </div>
                    </div>

                    {/* Active Tab panel - takes remaining height */}
                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-20">
                        {mobileTab === "chat" && (
                            <div className="h-full flex flex-col bg-[#0f0407]/40 border border-white/5 rounded-2xl overflow-hidden p-2.5">
                                <LiveChatBox roomId={roomId} sessionId={urlSessionId} variant="mobile" />
                            </div>
                        )}

                        {mobileTab === "wall" && (
                            <div className="w-full flex flex-col gap-3">
                                <div className="flex justify-between items-center px-1">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">All Confessions</h4>
                                    <button onClick={() => handleTierFilter('All')} className="text-[10px] text-[#ff2a6d] font-bold hover:underline">Clear Filter</button>
                                </div>

                                {/* Filter Tabs */}
                                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                                    {['All', 'Spicy', 'Dirty', 'Bedroom', 'Forbidden'].map((tier) => {
                                        const isActive = tierFilter === tier;
                                        return (
                                            <button
                                                key={tier}
                                                onClick={() => handleTierFilter(tier)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap",
                                                    isActive
                                                        ? "bg-[#d50057] text-white border-transparent shadow-[0_0_12px_rgba(213,0,87,0.4)]"
                                                        : "bg-white/5 text-white/50 border-white/10"
                                                )}
                                            >
                                                {tier}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Grid of Confessions */}
                                <div className="grid grid-cols-2 gap-3 pb-4">
                                    {loadingWall && (
                                        <div className="col-span-2 flex items-center justify-center py-6">
                                            <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                                        </div>
                                    )}
                                    {!loadingWall && confessions.length === 0 && (
                                        <div className="col-span-2 text-center py-6 text-white/30 text-xs italic">No secrets available</div>
                                    )}
                                    {!loadingWall && confessions.length > 0 && confessions.map((c, i) => {
                                        const isUnlocked = myUnlocks.has(c.id);
                                        const likesCount = (c.price * 13 + (c.title?.charCodeAt(0) || 7)) % 140 + 20;

                                        return (
                                            <div
                                                key={c.id || i}
                                                onClick={() => isUnlocked ? setViewConfession(c) : setPurchaseConfession(c)}
                                                className="p-3 rounded-2xl bg-[#110103]/60 border border-rose-500/20 flex flex-col justify-between h-[155px] shadow-[0_0_12px_rgba(225,29,72,0.06)] relative group cursor-pointer transition active:scale-[0.98]"
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-rose-950 border border-rose-500/30 flex items-center justify-center text-[8px] font-bold text-rose-300">
                                                            👤
                                                        </div>
                                                        <span className="text-[10px] font-bold text-white/90 truncate max-w-[70px]">
                                                            {c.creator?.full_name || "Anonymous"}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-white/60 leading-normal line-clamp-3 font-medium">
                                                        {isUnlocked ? (c.content || c.teaser) : c.teaser}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                                                    <span className="flex items-center gap-1 text-[9px] text-rose-400 font-bold">
                                                        💖 {likesCount}
                                                    </span>
                                                    {!isUnlocked ? (
                                                        <span className="text-[9px] bg-[#d50057]/20 text-[#ff4c8a] border border-[#d50057]/30 px-1.5 py-0.5 rounded-md font-extrabold">
                                                            €{c.price}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] text-green-400 font-extrabold flex items-center gap-0.5">
                                                            ✓ Open
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {mobileTab === "request" && (
                            <div className="w-full flex flex-col gap-4">
                                <div className="bg-[#0e0204] border border-white/5 rounded-2xl p-4 space-y-4">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-wider">What should they confess?</span>
                                        <textarea
                                            value={reqTopic}
                                            onChange={(e) => setReqTopic(e.target.value)}
                                            placeholder="Describe what you'd like to see..."
                                            maxLength={200}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-xs focus:outline-none focus:border-rose-500/40 transition-all resize-none h-20"
                                        />
                                        <div className="text-right text-[9px] text-white/30">{reqTopic.length}/200</div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-1.5">
                                            <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-wider">Your Offer</span>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#ff2a6d]">€</span>
                                                <input
                                                    type="number"
                                                    value={reqAmount || ''}
                                                    onChange={(e) => setReqAmount(Number(e.target.value))}
                                                    className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-rose-500/40 transition"
                                                />
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-end">
                                            <button 
                                                onClick={() => handleReaction('GIFT', reqAmount)}
                                                className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 active:scale-95 transition"
                                            >
                                                <Gift className="w-4 h-4 text-[#ff2a6d]" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                                        <div>
                                            <div className="text-[8px] text-white/30 font-bold uppercase tracking-wider mb-1">Identity</div>
                                            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10 text-[9px]">
                                                <button onClick={() => setIsAnon(false)} className={`flex-1 py-1 rounded-md text-center font-bold transition-all ${!isAnon ? 'bg-[#d50057] text-white' : 'text-white/50'}`}>Public</button>
                                                <button onClick={() => setIsAnon(true)} className={`flex-1 py-1 rounded-md text-center font-bold transition-all ${isAnon ? 'bg-[#d50057] text-white' : 'text-white/50'}`}>Anon</button>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[8px] text-white/30 font-bold uppercase tracking-wider mb-1">Send mode</div>
                                            <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10 text-[9px]">
                                                <button onClick={() => setConfessionMode("1on1")} className={`flex-1 py-1 rounded-md text-center font-bold transition-all ${confessionMode === "1on1" ? 'bg-[#d50057] text-white' : 'text-white/50'}`}>1on1</button>
                                                <button onClick={() => setConfessionMode("global")} className={`flex-1 py-1 rounded-md text-center font-bold transition-all ${confessionMode === "global" ? 'bg-[#d50057] text-white' : 'text-white/50'}`}>Global</button>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleOpenConfirm}
                                        disabled={isSending || !reqTopic.trim() || reqAmount <= 0}
                                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d50057] to-[#ff2a6d] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(213,0,87,0.3)] disabled:opacity-50 disabled:active:scale-100"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        {isSending ? "Processing..." : "Send Request"}
                                    </button>
                                </div>

                                {/* Active Requests List */}
                                <div className="space-y-2.5">
                                    <h5 className="text-xs font-extrabold text-white/40 uppercase tracking-widest px-1">My Requests Status</h5>
                                    <div className="space-y-2">
                                        {requests.length === 0 ? (
                                            <div className="text-center text-white/30 text-xs py-4 bg-white/5 border border-white/10 rounded-2xl italic">No requests placed</div>
                                        ) : (
                                            requests.map((req, i) => (
                                                <div key={req.id || i} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-white truncate">{req.topic}</div>
                                                        <div className="text-[10px] text-white/40 uppercase font-semibold mt-0.5 tracking-wider">{req.status.replace('_', ' ')}</div>
                                                    </div>
                                                    {req.status === 'delivered' ? (
                                                        <button onClick={() => { setReviewRequest(req); }} className="px-2.5 py-1 rounded-lg bg-[#d50057] hover:opacity-95 text-[10px] text-white font-bold transition">Review</button>
                                                    ) : (
                                                        <span className="font-bold text-amber-400">{cs()}{req.amount}</span>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {mobileTab === "info" && (
                            <div className="w-full flex flex-col gap-4">
                                <div className="bg-[#0f0407] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center overflow-hidden border border-white/20">
                                            {hostAvatar ? (
                                                <img src={hostAvatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-white">{hostStreamName[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-white flex items-center gap-1">
                                                {hostStreamName} <BadgeCheck className="w-4 h-4 text-[#ff2a6d] fill-[#ff2a6d] text-white shrink-0" />
                                            </h4>
                                            <span className="text-[9px] text-[#ff2a6d] uppercase tracking-widest font-black">Lounge Host</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/60 leading-relaxed">Join {hostStreamName}'s confessions lounge. Share secrets, order dares, or ask for private video/voice responses!</p>
                                </div>

                                <div className="bg-[#0f0407] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Coins className="text-amber-400 w-5 h-5" />
                                        <div>
                                            <h5 className="text-[9px] text-gray-500 uppercase font-black">Wallet Balance</h5>
                                            <span className="font-bold text-sm text-white">{cs()}{walletBalance}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0f0407] border border-white/5 rounded-2xl p-4 space-y-2">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Rules & Details</h4>
                                    <div className="text-xs text-white/60 space-y-1">
                                        <p>• Be respectful and kind to the host and other fans.</p>
                                        <p>• Respect private 1-on-1 response agreements.</p>
                                        <p>• No harassment or vulgar language in general chat.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile Navigation */}
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0204]/95 border-t border-[#22070c] backdrop-blur-md">
                        <MobileStudioTabs
                            tabs={CONFESSIONS_FAN_TABS}
                            activeTab={mobileTab}
                            onTabChange={setMobileTab}
                            accentHsl="350, 80%, 55%"
                        />
                    </div>

                    {/* Mobile Sidebar / Drawer Options Menu */}
                    {showMobileMenu && (
                        <div className="fixed inset-0 z-[60] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowMobileMenu(false)}>
                            <div className="w-72 h-full bg-[#120205] border-l border-rose-500/10 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                        <h4 className="text-base font-black text-white uppercase tracking-wider">Room Options</h4>
                                        <button onClick={() => setShowMobileMenu(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10"><X size={16} /></button>
                                    </div>
                                    
                                    {/* Wallet balance */}
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1">My Wallet Balance</div>
                                        <div className="flex items-center gap-2">
                                            <Coins className="text-amber-400 w-5 h-5" />
                                            <span className="text-xl font-black text-white">{cs()}{walletBalance}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Inbox deliveries */}
                                    <button
                                        onClick={() => { setShowIncomingModal(true); setShowMobileMenu(false); }}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <UserRound className="text-primary w-5 h-5" />
                                            <span className="text-sm font-bold text-white">Incoming Deliveries</span>
                                        </div>
                                        {requests.filter(r => r.status === 'delivered').length > 0 && (
                                            <span className="px-2 py-0.5 rounded-full bg-primary text-[10px] font-black text-white animate-pulse">
                                                {requests.filter(r => r.status === 'delivered').length}
                                            </span>
                                        )}
                                    </button>
                                    
                                    {/* Active Requests List */}
                                    <div className="space-y-2.5">
                                        <h5 className="text-xs font-extrabold text-white/40 uppercase tracking-widest px-1">My Requests Status</h5>
                                        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                                            {requests.length === 0 ? (
                                                <div className="text-center text-white/30 text-xs py-4 italic">No requests placed</div>
                                            ) : (
                                                requests.map((req, i) => (
                                                    <div key={req.id || i} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-bold text-white truncate">{req.topic}</div>
                                                            <div className="text-[10px] text-white/40 uppercase font-semibold mt-0.5 tracking-wider">{req.status.replace('_', ' ')}</div>
                                                        </div>
                                                        {req.status === 'delivered' ? (
                                                            <button onClick={() => { setReviewRequest(req); setShowMobileMenu(false); }} className="px-2.5 py-1 rounded-lg bg-[#d50057] hover:opacity-95 text-[10px] text-white font-bold transition">Review</button>
                                                        ) : (
                                                            <span className="font-bold text-amber-400">{cs()}{req.amount}</span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button onClick={() => router.push("/home")} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white font-bold text-xs uppercase tracking-widest text-center transition">
                                    Exit Room
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── MODALS (Stripe, Toast, Confirm, Unlock, View, Review) ── */}
                {/* Same logic, just modernized styles */}



                {/* Toast */}
                {toast && (
                    <div className="fixed bottom-10 left-1/2 z-[70] -translate-x-1/2 px-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <div className={cn("flex items-center gap-3 rounded-2xl border px-6 py-4 text-sm backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] font-bold",
                            toast.type === 'success' ? "border-green-500/30 bg-[#0a200f]/90 text-green-400" : "border-red-500/30 bg-[#2b0808]/90 text-red-400")}>
                            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            {toast.message}
                        </div>
                    </div>
                )}

                {/* ── MODAL: Confirm Request ── */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-[360px] rounded-[32px] border border-rose-500/20 bg-[#120205] p-6 shadow-[0_0_50px_rgba(225,29,72,0.25)] relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-rose-900/10 to-transparent pointer-events-none" />
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                                    <h3 className="text-lg font-black text-white tracking-tight">Confirm Request</h3>
                                    <button onClick={() => setShowConfirmModal(false)} className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"><X className="w-4 h-4" /></button>
                                </div>

                                <div className="bg-black/20 rounded-2xl p-4 border border-white/5 mb-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] text-rose-200/40 uppercase tracking-widest font-extrabold">Message</span>
                                        <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">{reqType}</span>
                                    </div>
                                    <div className="text-rose-50 font-medium italic text-sm leading-relaxed">"{reqTopic}"</div>
                                </div>

                                <div className="flex items-center justify-between mb-6 px-1">
                                    <span className="text-sm font-medium text-rose-200/60">Total to pay</span>
                                    <span className="text-2xl font-black text-white tracking-tight">{cs()}{reqAmount}</span>
                                </div>

                                <Btn variant="rose" onClick={handleConfirmAndPay} disabled={isSending} className="w-full py-4 text-sm rounded-2xl shadow-lg">
                                    {isSending ? "Processing..." : "Confirm & Pay"}
                                </Btn>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODAL: Unlock Confession ── */}
                <SpendConfirmModal
                    isOpen={!!purchaseConfession}
                    onClose={() => setPurchaseConfession(null)}
                    title="Unlock Confession"
                    itemLabel={purchaseConfession?.title || 'Secret Confession'}
                    description="See the full spicy details of this secret."
                    amount={purchaseConfession?.price || 0}
                    walletBalance={walletBalance}
                    onConfirm={handleUnlockPurchase}
                />

                {/* ── MODAL: View Confession ── */}
                {viewConfession && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in zoom-in-95 duration-200">
                        <div className="w-full max-w-lg rounded-[32px] border border-rose-500/20 bg-[#120205] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setViewConfession(null)} className="absolute top-6 right-6 h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 z-10"><X className="w-4 h-4" /></button>
                            <h3 className="text-2xl font-black text-white mb-1.5">{viewConfession.title}</h3>
                            <Pill className="mb-6 bg-green-500/10 text-green-400 border-green-500/20 animate-pulse">Unlocked Secret</Pill>

                            {viewConfession.media_url && (
                                <div className="mb-6 rounded-2xl overflow-hidden border border-rose-500/20 bg-black/50">
                                    {viewConfession.type === 'Video' || viewConfession.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                        <video src={viewConfession.media_url} controls autoPlay className="w-full max-h-[40vh] object-contain" />
                                    ) : viewConfession.type === 'Voice' || viewConfession.media_url.match(/\.(mp3|wav|ogg)$/i) ? (
                                        <div className="p-4 flex justify-center">
                                            <audio src={viewConfession.media_url} controls autoPlay className="w-full" />
                                        </div>
                                    ) : (
                                        <img src={viewConfession.media_url} alt="Media" className="w-full max-h-[40vh] object-contain" />
                                    )}
                                </div>
                            )}

                            <div className="text-lg font-serif font-medium italic text-rose-50/90 leading-loose border-l-2 border-rose-500/30 pl-6 py-2">
                                {viewConfession.content || viewConfession.teaser}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── MODAL: Review Delivery ── */}
                {reviewRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
                        <div className="w-full max-w-lg rounded-[32px] border border-rose-500/20 bg-[#120205] p-8 relative">
                            <button onClick={() => setReviewRequest(null)} className="absolute top-6 right-6 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                            <h3 className="text-xl font-black text-green-400 mb-6 flex items-center gap-2">
                                <Check className="w-6 h-6" />
                                {reviewRequest.status === 'completed' ? 'Delivery Content' : 'Review Delivery'}
                            </h3>
                            <div className="bg-black/30 rounded-2xl p-6 border border-white/5 mb-6 text-center">
                                {reviewRequest.delivery_media_url && (
                                    <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/50">
                                        {reviewRequest.type === 'Video' || reviewRequest.delivery_media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                            <video src={reviewRequest.delivery_media_url} controls autoPlay className="w-full max-h-[30vh] object-contain" />
                                        ) : reviewRequest.type === 'Audio' || reviewRequest.delivery_media_url.match(/\.(mp3|wav|ogg)$/i) ? (
                                            <div className="p-4 flex justify-center">
                                                <audio src={reviewRequest.delivery_media_url} controls autoPlay className="w-full" />
                                            </div>
                                        ) : (
                                            <img src={reviewRequest.delivery_media_url} alt="Delivery Media" className="w-full max-h-[30vh] object-contain" />
                                        )}
                                    </div>
                                )}
                                <p className="text-rose-100 text-lg">{reviewRequest.delivery_content}</p>
                            </div>
                            {reviewRequest.status === 'completed' ? (
                                <Btn variant="solid" onClick={() => setReviewRequest(null)} className="w-full py-4 bg-white/5 text-white/70 border-white/10 hover:bg-white/10 rounded-2xl font-black">
                                    Close
                                </Btn>
                            ) : (
                                <Btn variant="solid" onClick={() => handleApproveDelivery(reviewRequest.id)} className="w-full py-4 bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30 rounded-2xl font-black">
                                    Completed!
                                </Btn>
                            )}
                        </div>
                    </div>
                )}

                {/* ── MODAL: Incoming Requests ── */}
                {showIncomingModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
                        <div className="w-full max-w-md rounded-[32px] border border-primary/20 bg-[#120205] p-8 shadow-[0_0_50px_rgba(255,42,109,0.15)] relative">
                            <button onClick={() => setShowIncomingModal(false)} className="absolute top-6 right-6 text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                <UserRound className="w-6 h-6 text-primary" /> Incoming Deliveries
                            </h3>
                            
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {requests.filter(r => r.status === 'delivered' || r.status === 'completed').length === 0 ? (
                                    <div className="text-center py-8 text-white/40 italic">
                                        No incoming deliveries right now.
                                    </div>
                                ) : (
                                    requests.filter(r => r.status === 'delivered' || r.status === 'completed').map((req, i) => (
                                        <div key={req.id || i} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border gap-4 ${req.status === 'completed' ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${req.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-primary/20 text-primary border-primary/30'}`}>
                                                    {req.status === 'completed' ? '✅' : '💌'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white mb-0.5">{req.topic}</p>
                                                    <p className={`text-xs ${req.status === 'completed' ? 'text-green-400' : 'text-primary'}`}>
                                                        {req.status === 'completed' ? 'Completed' : 'Delivered'} • {cs()}{req.amount}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setReviewRequest(req);
                                                    setShowIncomingModal(false);
                                                }}
                                                className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-bold text-white hover:scale-105 transition-all ${
                                                    req.status === 'completed'
                                                        ? 'bg-green-600/20 border border-green-500/30 hover:bg-green-600/30'
                                                        : 'gradient-pink shadow-[0_0_15px_rgba(255,42,109,0.4)]'
                                                }`}
                                            >
                                                {req.status === 'completed' ? 'View Again' : 'Review'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Invite Modal */}
                <InviteModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    roomId={roomId}
                />

                {/* Invitation Popup (receiver side) */}
                <InvitationPopup />

                {/* Per-minute billing overlay */}
                <BillingOverlay
                    sessionId={urlSessionId}
                    accentHsl="350, 80%, 55%"
                    exitRoute="/home"
                />

            </div>
        </ProtectRoute>
    );
}
