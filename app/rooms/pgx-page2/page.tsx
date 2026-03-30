"use client";

import React, { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useBarChat } from "@/hooks/useBarChat";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/app/context/AuthContext";
import WalletPill from "@/components/common/WalletPill";
import InviteModal from "@/components/rooms/InviteModal";
import dynamic from "next/dynamic";
import { Heart, Wine, Crown, Sparkles, ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle, UserPlus } from "lucide-react";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Design tokens — exact from reference index.css
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const BG = "hsl(270,50%,8%)";
const FG = "hsl(45,100%,95%)";
const GOLD = "hsl(42,90%,55%)";
const PINK = "hsl(320,100%,65%)";
const PURPLE = "hsl(280,100%,70%)";
const MUTED = "hsl(270,20%,65%)";

const glassPanel: React.CSSProperties = {
    background: "hsla(270,40%,15%,0.2)",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    border: "1px solid hsla(280,60%,45%,0.25)", borderRadius: "0.75rem",
};
const glowPurple: React.CSSProperties = { boxShadow: "0 0 15px hsla(280,100%,70%,0.4), 0 0 40px hsla(280,100%,70%,0.15), inset 0 0 15px hsla(280,100%,70%,0.05)" };
const glowGold: React.CSSProperties = { boxShadow: "0 0 15px hsla(42,90%,55%,0.4), 0 0 40px hsla(42,90%,55%,0.15)" };
const glowPink: React.CSSProperties = { boxShadow: "0 0 15px hsla(320,100%,65%,0.4), 0 0 40px hsla(320,100%,65%,0.15)" };
const glowTextGold: React.CSSProperties = { textShadow: "0 0 10px hsla(42,90%,55%,0.6), 0 0 30px hsla(42,90%,55%,0.3)" };

const drinkItem: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 12px", borderRadius: "0.5rem", cursor: "pointer",
    transition: "all 0.2s", background: "hsla(270,40%,15%,0.3)",
    border: "1px solid hsla(280,60%,45%,0.2)", marginBottom: "0",
};
const chatMsg: React.CSSProperties = {
    padding: "8px 12px", borderRadius: "0.5rem", marginBottom: "8px",
    background: "hsla(270,40%,15%,0.3)", border: "1px solid hsla(280,60%,45%,0.15)",
};
const tipBtn: React.CSSProperties = {
    padding: "8px 16px", borderRadius: "0.5rem", fontWeight: 600, cursor: "pointer",
    transition: "all 0.2s", background: "hsla(270,40%,15%,0.4)",
    border: "1px solid hsla(280,60%,45%,0.3)", color: FG,
};
const btnGold: React.CSSProperties = {
    background: "linear-gradient(135deg, hsla(42,90%,55%,0.9), hsla(42,80%,45%,0.9))",
    border: "1px solid hsla(42,90%,55%,0.5)", color: BG, fontWeight: 600,
    borderRadius: "0.5rem", cursor: "pointer",
};
const btnGlow: React.CSSProperties = {
    position: "relative", overflow: "hidden", transition: "all 0.3s",
    background: "linear-gradient(135deg, hsla(280,80%,55%,0.8), hsla(320,80%,60%,0.8))",
    border: "1px solid hsla(280,60%,45%,0.5)", borderRadius: "0.5rem",
    cursor: "pointer", color: FG, fontWeight: 700,
};
const liveBadge: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600,
    background: "hsla(140,70%,45%,0.2)", border: "1px solid hsla(140,70%,45%,0.4)",
    color: "hsl(140,70%,55%)",
};

const DEFAULT_DRINKS = [
    { id: "d1", name: "VIP Bottle", price: 550, icon: "🍾" },
    { id: "d2", name: "Champagne", price: 250, icon: "🥂" },
    { id: "d3", name: "69 Bar Shot", price: 50, icon: "♋" },
    { id: "d4", name: "Blowjob Shot", price: 50, icon: "😮\u200d💨" },
    { id: "d5", name: "Pornstar Shot", price: 50, icon: "🌟" },
    { id: "d6", name: "Quickie Shot", price: 50, icon: "⏱️" },
    { id: "d7", name: "Liquid Lust Shot", price: 50, icon: "❤️\u200d🔥" },
    { id: "d8", name: "Cream & Scream Shot", price: 50, icon: "🍦" },
    { id: "d9", name: "Temptation Shot", price: 50, icon: "🍎" },
    { id: "d10", name: "Devil's Kiss Shot", price: 50, icon: "💋" },
];

/* ── Toast system ─────────────────────────────────────────────────── */
type ToastKind = "success" | "error" | "info";
interface Toast { id: number; msg: string; kind: ToastKind; }

function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const push = useCallback((msg: string, kind: ToastKind = "success") => {
        const id = Date.now() + Math.random();
        setToasts(p => [...p, { id, msg, kind }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    }, []);
    return { toasts, push };
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
    if (!toasts.length) return null;
    return (
        <div style={{ position: "fixed", top: "80px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px", pointerEvents: "none" }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "12px 18px", borderRadius: "0.75rem",
                    backdropFilter: "blur(16px)",
                    background: t.kind === "success" ? "hsla(140,60%,20%,0.95)" : t.kind === "error" ? "hsla(0,60%,20%,0.95)" : "hsla(270,60%,20%,0.95)",
                    border: t.kind === "success" ? "1px solid hsla(140,70%,45%,0.5)" : t.kind === "error" ? "1px solid hsla(0,70%,55%,0.5)" : "1px solid hsla(280,70%,55%,0.5)",
                    boxShadow: t.kind === "success" ? "0 0 20px hsla(140,70%,45%,0.3)" : t.kind === "error" ? "0 0 20px hsla(0,70%,55%,0.3)" : "0 0 20px hsla(280,70%,55%,0.3)",
                    color: FG, fontFamily: "'Montserrat', sans-serif", fontSize: "14px", fontWeight: 500,
                    animation: "pg2-slideIn 0.3s ease",
                    minWidth: "280px", maxWidth: "360px",
                }}>
                    {t.kind === "success" && <CheckCircle style={{ width: "18px", height: "18px", color: "hsl(140,70%,55%)", flexShrink: 0 }} />}
                    {t.kind === "error" && <XCircle style={{ width: "18px", height: "18px", color: "hsl(0,80%,65%)", flexShrink: 0 }} />}
                    {t.kind === "info" && <AlertCircle style={{ width: "18px", height: "18px", color: PURPLE, flexShrink: 0 }} />}
                    <span>{t.msg}</span>
                </div>
            ))}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════ */
function PgxPage2Inner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { refresh: refreshWallet } = useWallet();
    const { toasts, push: showToast } = useToasts();

    const roomId = searchParams.get("roomId");
    const hostId = searchParams.get("hostId");

    const [hostProfile, setHostProfile] = useState<{ full_name?: string; username?: string; avatar_url?: string } | null>(null);
    const [drinks, setDrinks] = useState<any[]>(DEFAULT_DRINKS);
    const [vipPrice, setVipPrice] = useState(150);
    const [isLoading, setIsLoading] = useState(true);
    const [tipAmount, setTipAmount] = useState<number | string>("");
    const [buying, setBuying] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [showInviteModal, setShowInviteModal] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const { messages, sendMessage } = useBarChat(roomId);

    /* ── Fetch session data ─── */
    useEffect(() => {
        if (!roomId) { setIsLoading(false); return; }
        let mounted = true;
        (async () => {
            try {
                if (hostId) {
                    const { data: p } = await supabase.from("profiles").select("full_name, username, avatar_url").eq("id", hostId).single();
                    if (mounted && p) setHostProfile(p);
                }
                const { data: cfg } = await supabase.from("admin_bar_config").select("*").eq("id", 1).single();
                if (mounted && cfg) {
                    if (cfg.menu_items?.length) setDrinks(cfg.menu_items);
                    if (cfg.vip_price) setVipPrice(cfg.vip_price);
                }
            } finally { if (mounted) setIsLoading(false); }
        })();
        return () => { mounted = false; };
    }, [roomId, hostId]);

    /* ── Viewer count ─── */
    useEffect(() => {
        if (!roomId) return;
        supabase.rpc("increment_viewer_count", { p_room_id: roomId, p_amount: 1 });
        return () => { supabase.rpc("increment_viewer_count", { p_room_id: roomId, p_amount: -1 }); };
    }, [roomId]);

    /* ── Auto-scroll chat ─── */
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    /* ── INSTANT PURCHASE ─── */
    const doPurchase = useCallback(async (type: string, label: string, price: number, itemId: string) => {
        if (!roomId || buying) return;
        setBuying(itemId);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/bar-lounge/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, label, amount: price }),
            });
            const data = await res.json();
            if (data.success) {
                const emoji = type === "drink" ? "🍸" : type === "tip" ? "💰" : type === "vip" ? "👑" : type === "booth" ? "🛋️" : type === "pin" ? "📌" : "⚡";
                showToast(`${emoji} ${label} sent! -$${price} from your wallet`, "success");
                await refreshWallet();
            } else {
                showToast(data.error === "Insufficient balance" ? "💸 Not enough balance. Top up your wallet!" : `Purchase failed: ${data.error || "Unknown error"}`, "error");
            }
        } catch {
            showToast("Network error. Please try again.", "error");
        } finally {
            setBuying(null);
        }
    }, [roomId, buying, showToast, refreshWallet]);

    const handleTip = (amount: number) => doPurchase("tip", `$${amount} Tip`, amount, `tip-${amount}`);
    const handleCustomTip = () => {
        const a = Number(tipAmount);
        if (a > 0) { doPurchase("tip", `$${a} Tip`, a, `tip-custom`); setTipAmount(""); }
        else showToast("Enter a valid tip amount", "info");
    };
    const handleSendChat = () => {
        if (!chatInput.trim()) return;
        sendMessage(chatInput, user?.id, user?.user_metadata?.full_name || "Guest");
        setChatInput("");
    };

    const creatorName = hostProfile?.full_name || hostProfile?.username || "[CreatorName]";

    /* ── No session fallback ─── */
    if (!isLoading && !roomId) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG, fontFamily: "'Montserrat', sans-serif" }}>
                <div style={{ ...glassPanel, padding: "48px", textAlign: "center", maxWidth: "400px" }}>
                    <Wine style={{ width: "48px", height: "48px", color: `${GOLD}66`, margin: "0 auto 16px" }} />
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 700, color: GOLD, ...glowTextGold, marginBottom: "8px" }}>No Session Selected</h2>
                    <p style={{ color: MUTED, fontSize: "14px", marginBottom: "24px" }}>Pick an active Bar Lounge session from the lobby.</p>
                    <button onClick={() => router.push("/rooms/bar-lounge")} style={{ ...btnGold, padding: "12px 24px", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                        <ArrowLeft style={{ width: "16px", height: "16px" }} /> Go to Lobby
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
                <Loader2 style={{ width: "32px", height: "32px", color: PURPLE, animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    return (
        <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", fontFamily: "'Montserrat', sans-serif", color: FG }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
                @keyframes glow-pulse    { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
                @keyframes float         { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                @keyframes sparkle       { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
                @keyframes neon-flicker  { 0%, 100% { opacity:1; } 92%{opacity:1;} 93%{opacity:0.7;} 94%{opacity:1;} 96%{opacity:0.8;} 97%{opacity:1;} }
                @keyframes pg2-slideIn   { from { opacity:0; transform: translateX(24px); } to { opacity:1; transform: translateX(0); } }
                .pg2-glow-pulse   { animation: glow-pulse   2s ease-in-out infinite; }
                .pg2-float        { animation: float         4s ease-in-out infinite; }
                .pg2-sparkle      { animation: sparkle       2s ease-in-out infinite; }
                .pg2-neon-flicker { animation: neon-flicker  3s ease-in-out infinite; }
                .pg2-drink-item:hover:not(:disabled) { background: hsla(280,60%,45%,0.2) !important; box-shadow: 0 0 10px hsla(280,100%,70%,0.2); }
                .pg2-tip-btn:hover:not(:disabled)    { background: hsla(280,60%,45%,0.3) !important; box-shadow: 0 0 15px hsla(280,100%,70%,0.3); }
                .pg2-btn-glow:hover  { box-shadow: 0 0 20px hsla(280,100%,70%,0.5), 0 0 50px hsla(280,100%,70%,0.2); transform: translateY(-1px); }
                .pg2-btn-gold:hover  { box-shadow: 0 0 20px hsla(42,90%,55%,0.5), 0 0 50px hsla(42,90%,55%,0.2); transform: translateY(-1px); }
                .pg2-scroll::-webkit-scrollbar       { width: 4px; }
                .pg2-scroll::-webkit-scrollbar-track { background: transparent; }
                .pg2-scroll::-webkit-scrollbar-thumb { background: hsla(280,60%,45%,0.3); border-radius: 10px; }
            `}</style>

            {/* Toasts */}
            <ToastStack toasts={toasts} />

            {/* Background */}
            <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "url(/rooms/pgx-page2/lounge-bg.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
            <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "hsla(270,50%,8%,0.6)" }} />

            {/* Sparkles */}
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="pg2-sparkle" style={{ position: "fixed", width: "4px", height: "4px", borderRadius: "9999px", background: GOLD, zIndex: 10, pointerEvents: "none", left: `${(i * 13 + 7) % 100}%`, top: `${(i * 17 + 11) % 100}%`, animationDelay: `${(i * 0.3) % 4}s`, animationDuration: `${2 + (i % 3)}s` }} />
            ))}

            {/* Header */}
            <div style={{ position: "relative", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={() => router.push("/rooms/bar-lounge")} style={{ ...glassPanel, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: `${GOLD}cc`, cursor: "pointer" }}>
                        <ArrowLeft style={{ width: "14px", height: "14px" }} /> Exit Lounge
                    </button>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        style={{ ...glassPanel, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: PINK, cursor: "pointer", border: "1px solid hsla(320,80%,55%,0.35)", background: "hsla(320,60%,30%,0.2)", transition: "all 0.3s" }}
                    >
                        <UserPlus style={{ width: "14px", height: "14px" }} /> Invite
                    </button>
                </div>
                <WalletPill />
            </div>

            {/* Main grid */}
            <div style={{ position: "relative", zIndex: 20, padding: "0 16px 16px" }}>
                <div style={{ maxWidth: "80rem", margin: "0 auto", display: "grid", gridTemplateColumns: "320px 1fr 350px", gap: "24px", height: "calc(100vh - 3rem)" }}>

                    {/* ═══ LEFT: Drink Menu ═══ */}
                    <div className="pg2-scroll" style={{ overflowY: "auto" }}>
                        <div style={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%", border: "1px solid hsla(280,40%,30%,0.2)", borderRadius: "0.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <Wine className="pg2-glow-pulse" style={{ width: "20px", height: "12px", color: PURPLE }} />
                                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: GOLD, ...glowTextGold, margin: 0 }}>Buy a Drink</h2>
                            </div>
                            <p style={{ color: MUTED, fontSize: "14px", margin: "0 0 0 0" }}>for {creatorName}</p>

                            {/* Drink list */}
                            <div style={{ borderTop: "1px solid hsla(280,40%,30%,0.3)", paddingTop: "8px" }}>
                                <h3 style={{ fontSize: "12px", fontWeight: 600, color: MUTED, marginBottom: "8px", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 0 }}>Drink Menu</h3>
                                <div>
                                    {drinks.map((drink: any) => {
                                        const id = drink.id || drink.name;
                                        const isThisBuying = buying === id;
                                        return (
                                            <div
                                                key={id}
                                                className="pg2-drink-item"
                                                style={{ ...drinkItem, opacity: buying && !isThisBuying ? 0.6 : 1, marginBottom: "4px" }}
                                                onClick={() => !buying && doPurchase("drink", drink.name, drink.price, id)}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <span style={{ fontSize: "18px" }}>{drink.icon}</span>
                                                    <span style={{ color: FG, fontWeight: 500, fontSize: "14px" }}>{drink.name}</span>
                                                </div>
                                                {isThisBuying
                                                    ? <Loader2 style={{ width: "14px", height: "14px", color: GOLD, animation: "spin 1s linear infinite" }} />
                                                    : <span style={{ color: GOLD, fontWeight: 600 }}>${drink.price}</span>
                                                }
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* VIP section */}
                            <div style={{ borderTop: "1px solid hsla(280,40%,30%,0.3)", paddingTop: "12px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: 700, color: FG, textAlign: "center", margin: 0 }}>VIP Lounge</h3>

                                <div style={{ ...glassPanel, ...glowGold, padding: "12px", cursor: buying ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", gap: "8px", opacity: buying ? 0.7 : 1 }}
                                    onClick={() => !buying && doPurchase("vip", "VIP Upgrade", vipPrice, "vip")}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <Crown className="pg2-glow-pulse" style={{ width: "20px", height: "20px", color: GOLD }} />
                                        {buying === "vip"
                                            ? <Loader2 style={{ width: "16px", height: "16px", color: GOLD, animation: "spin 1s linear infinite" }} />
                                            : <span style={{ fontWeight: 700, color: GOLD, ...glowTextGold }}>Upgrade to VIP - ${vipPrice}</span>}
                                    </div>
                                    <ul style={{ fontSize: "14px", color: MUTED, marginLeft: "28px", margin: "0", padding: 0, listStyle: "none" }}>
                                        <li style={{ display: "flex", alignItems: "center", gap: "4px" }}><Sparkles style={{ width: "12px", height: "12px", color: PINK }} /> Exclusive Content</li>
                                    </ul>
                                </div>

                                <div style={{ ...glassPanel, padding: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: buying ? "not-allowed" : "pointer", opacity: buying ? 0.7 : 1 }}
                                    onClick={() => !buying && doPurchase("booth", "Booth Reservation", 300, "booth")}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontSize: "18px" }}>🛋️</span>
                                        <div>
                                            <span style={{ fontWeight: 700, color: FG, fontSize: "14px" }}>Reserve a Booth</span>
                                            <span style={{ color: GOLD, fontWeight: 700, marginLeft: "8px" }}>$300</span>
                                            <p style={{ fontSize: "12px", color: MUTED, margin: 0 }}>🎉 Private (5 mins)</p>
                                        </div>
                                        {buying === "booth" && <Loader2 style={{ width: "14px", height: "14px", color: GOLD, animation: "spin 1s linear infinite", marginLeft: "8px" }} />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ CENTER: Live Stream + Tips ═══ */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden", justifyContent: "flex-end" }}>

                        {/* Live stream — adjusted aspect ratio */}
                        <div style={{ position: "relative", ...glassPanel, ...glowPurple, overflow: "hidden", borderRadius: "0.75rem", aspectRatio: "16/9", minHeight: "0", width: "100%" }}>

                            {/* Real Agora fan stream */}
                            {roomId && user ? (
                                <div style={{ width: "100%", height: "100%", borderRadius: "0.75rem", overflow: "hidden" }}>
                                    <LiveStreamWrapper
                                        role="fan"
                                        appId={APP_ID}
                                        roomId={roomId}
                                        uid={user.id || 0}
                                        hostId={hostId || ""}
                                        hostAvatarUrl={hostProfile?.avatar_url || null}
                                        hostName={creatorName}
                                    />
                                </div>
                            ) : (
                                <div style={{ width: "100%", aspectRatio: "4/3", background: "linear-gradient(135deg, hsla(270,50%,15%,0.8), hsla(280,60%,10%,0.9))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", borderRadius: "0.75rem" }}>
                                    <Wine style={{ width: "60px", height: "60px", color: `${GOLD}33` }} />
                                    <span style={{ fontSize: "13px", color: MUTED }}>Connecting to stream...</span>
                                </div>
                            )}

                            {/* Floating hearts */}
                            <div className="pg2-float" style={{ position: "absolute", top: "40px", right: "16px", zIndex: 10, pointerEvents: "none" }}>
                                <Heart className="pg2-glow-pulse" style={{ width: "40px", height: "40px", color: PINK, fill: "hsla(320,100%,65%,0.5)", filter: "drop-shadow(0 0 10px hsla(320,100%,65%,0.6))" }} />
                            </div>
                            <div className="pg2-float" style={{ position: "absolute", top: "48px", right: "64px", animationDelay: "1s", zIndex: 10, pointerEvents: "none" }}>
                                <Heart className="pg2-glow-pulse" style={{ width: "24px", height: "24px", color: PINK, fill: "hsla(320,100%,65%,0.3)", filter: "drop-shadow(0 0 8px hsla(320,100%,65%,0.4))" }} />
                            </div>

                            {/* Bottom gradient */}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "64px", background: "linear-gradient(to top, hsla(270,50%,8%,0.8), transparent)", zIndex: 5, pointerEvents: "none" }} />

                            {/* LIVE badge */}
                            <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 10, display: "flex", alignItems: "center", gap: "6px", background: "hsla(0,80%,45%,0.9)", border: "1px solid hsla(0,80%,60%,0.5)", borderRadius: "9999px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, color: "#fff", backdropFilter: "blur(8px)", letterSpacing: "0.08em" }}>
                                <span className="pg2-glow-pulse" style={{ width: "6px", height: "6px", borderRadius: "9999px", background: "#fff", display: "inline-block" }} />
                                LIVE
                            </div>

                            {/* Creator name badge */}
                            {creatorName !== "[CreatorName]" && (
                                <div style={{ position: "absolute", bottom: "12px", left: "12px", zIndex: 10, background: "hsla(270,50%,8%,0.75)", backdropFilter: "blur(8px)", borderRadius: "0.5rem", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: FG }}>
                                    {creatorName}
                                </div>
                            )}
                        </div>

                        {/* Tips — pinned below the stream, matches reference */}
                        <div style={{ flexShrink: 0, borderRadius: "0.75rem", border: "1px solid hsla(280,40%,30%,0.2)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            {/* Preset tip amounts */}
                            <div style={{ display: "flex", gap: "10px" }}>
                                {[10, 25, 50].map((amount) => (
                                    <button key={amount} className="pg2-tip-btn" disabled={!!buying}
                                        style={{ ...tipBtn, flex: 1, fontSize: "14px", textAlign: "center", opacity: buying ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                                        onClick={() => handleTip(amount)}>
                                        {buying === `tip-${amount}` ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : `$${amount}`}
                                    </button>
                                ))}
                            </div>
                            {/* Custom tip row — matches reference */}
                            <div style={{ display: "flex", gap: "10px" }}>
                                <div style={{ ...tipBtn, flex: 1, display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", cursor: "text" }}>
                                    <span style={{ color: MUTED, fontSize: "14px", whiteSpace: "nowrap" }}>Custom</span>
                                    <span style={{ color: GOLD, fontSize: "14px", fontWeight: 700 }}>$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Amount"
                                        value={tipAmount}
                                        onChange={(e) => setTipAmount(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleCustomTip()}
                                        style={{ background: "transparent", border: "none", outline: "none", color: FG, fontFamily: "'Montserrat', sans-serif", fontSize: "14px", flex: 1, minWidth: 0, width: "100%" }}
                                    />
                                </div>
                                <button
                                    className="pg2-btn-gold"
                                    disabled={!!buying || !tipAmount || Number(tipAmount) <= 0}
                                    style={{ ...btnGold, flexShrink: 0, padding: "10px 24px", fontSize: "14px", opacity: (buying || !tipAmount || Number(tipAmount) <= 0) ? 0.6 : 1 }}
                                    onClick={handleCustomTip}>
                                    {buying === "tip-custom" ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : "Tip Now"}
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* ═══ RIGHT: Lounge Chat ═══ */}
                    <div style={{ paddingBottom: "112px", padding: "16px", display: "flex", flexDirection: "column", height: "100%", border: "1px solid hsla(280,40%,30%,0.2)", borderRadius: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", fontWeight: 700, color: GOLD, ...glowTextGold, margin: 0 }}>Lounge Chat</h2>
                            <span style={liveBadge}>
                                <span className="pg2-glow-pulse" style={{ width: "8px", height: "8px", borderRadius: "9999px", background: "hsl(140,70%,55%)", display: "inline-block" }} />
                                Live
                            </span>
                        </div>

                        <div className="pg2-scroll" style={{ flex: 1, overflowY: "auto", paddingRight: "4px", marginBottom: "12px", minHeight: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                            {messages.length === 0 && (
                                <div style={{ textAlign: "center", color: MUTED, fontSize: "13px", padding: "24px 0" }}>No messages yet. Say hello! 👋</div>
                            )}
                            {messages.map((msg: any, i: number) => (
                                <div key={msg.id ?? i} style={{ ...chatMsg, display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                    <span style={{ fontSize: "18px", flexShrink: 0 }}>{msg.is_system ? "🔔" : "🧑"}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ fontWeight: 700, fontSize: "14px", color: FG }}>{msg.handle || "Anonymous"}</span>
                                        {msg.handle?.includes("VIP") && <Crown style={{ width: "12px", height: "12px", color: GOLD, display: "inline", marginLeft: "4px", marginBottom: "2px" }} />}
                                        <span style={{ fontSize: "14px", color: MUTED, marginLeft: "4px" }}>{msg.content}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Pin Name */}
                        <div style={{ ...chatMsg, ...glowPink, display: "flex", alignItems: "center", gap: "8px", cursor: buying ? "not-allowed" : "pointer", marginBottom: "8px", opacity: buying ? 0.7 : 1 }}
                            onClick={() => !buying && doPurchase("pin", "Pin Name to Top", 25, "pin")}>
                            <span style={{ fontSize: "18px" }}>🔥</span>
                            <span className="pg2-neon-flicker" style={{ fontSize: "14px", fontWeight: 700, color: PINK }}>PIN NAME TO TOP 10 mins</span>
                            {buying === "pin"
                                ? <Loader2 style={{ width: "14px", height: "14px", color: GOLD, animation: "spin 1s linear infinite", marginLeft: "auto" }} />
                                : <span style={{ color: GOLD, fontWeight: 700, marginLeft: "auto" }}>+$25</span>}
                        </div>

                        {/* Chat input */}
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" placeholder="Send a message..." value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                style={{ flex: 1, borderRadius: "0.5rem", padding: "8px 12px", fontSize: "14px", background: "hsla(270,30%,18%,0.3)", border: "1px solid hsla(280,40%,30%,0.3)", color: FG, outline: "none", fontFamily: "'Montserrat', sans-serif" }}
                            />
                            <button className="pg2-btn-glow" style={{ ...btnGlow, padding: "8px 16px", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }} onClick={handleSendChat}>
                                SEND
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Invite Modal */}
            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                roomId={roomId}
            />
        </div>
    );
}

export default function PgxPage2Room() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
                <div style={{ width: "32px", height: "32px", border: "3px solid hsla(280,100%,70%,0.3)", borderTopColor: PURPLE, borderRadius: "9999px", animation: "spin 1s linear infinite" }} />
            </div>
        }>
            <PgxPage2Inner />
        </Suspense>
    );
}
