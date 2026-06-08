"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { useWallet } from "@/hooks/useWallet";
import dynamic from "next/dynamic";
import { Loader2, ArrowLeft, Send, Sparkles, Gift, Coins, Eye, PanelRightClose, PanelRightOpen, Power, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cs } from "@/utils/currency";
import BrandLogo from "@/components/common/BrandLogo";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });

type LoungeData = {
    id: string;
    room_id: string;
    creator_id: string;
    creator_name: string;
    table_name: string;
    game_type: string;
    casino_game_id: string;
    min_bet: number;
    max_bet: number;
    start_time: string;
    duration_minutes: number;
    cover_image_url: string;
    creator_avatar_url: string;
    description: string;
    vip_only: boolean;
    status: string;
};

type ChatMessage = {
    id: string;
    sender_name: string;
    sender_id: string;
    message: string;
    created_at: string;
};

const TIP_OPTIONS = [
    { label: "$20", amount: 20, icon: "💰" },
    { label: "$50", amount: 50, icon: "💰" },
    { label: "$100", amount: 100, icon: "💰" },
];

const GIFT_OPTIONS = [
    { label: "Rose", amount: 100, icon: "🌹" },
    { label: "Kiss", amount: 250, icon: "💋" },
    { label: "Diamond", amount: 500, icon: "💎" },
];

const getRoomIframeSrc = (lounge: LoungeData, isCreator: boolean) => {
    const typeLower = lounge.game_type.toLowerCase().replace(/\s+/g, "");
    let prefix = "";
    if (typeLower.includes("xchat")) prefix = "x-chat";
    else if (typeLower.includes("suga")) prefix = "suga4u";
    else if (typeLower.includes("flash")) prefix = "flash-drop";
    else if (typeLower.includes("confession")) prefix = "confessions";
    else if (typeLower.includes("truth")) prefix = "truth-or-dare";
    else if (typeLower.includes("bar")) prefix = "bar-lounge";

    if (!prefix) {
        return `/rooms/casino/mock-pgxcasino/game/${lounge.casino_game_id}?roomId=${lounge.room_id}`;
    }
    const path = isCreator ? `/rooms/${prefix}-creator` : `/rooms/${prefix}`;
    return `${path}?sessionId=${lounge.casino_game_id}&roomId=${lounge.room_id}`;
};

export default function CasinoLoungeRoomPage() {
    const { roomId } = useParams() as { roomId: string };
    const router = useRouter();
    const { user, role, isLoading: authLoading } = useAuth();
    const { balance: walletBalance, pay } = useWallet();
    const supabase = createClient();

    const [lounge, setLounge] = useState<LoungeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [panelOpen, setPanelOpen] = useState(true);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [viewerCount, setViewerCount] = useState(1);

    // Chat
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Summary Cards (simulation)
    const [fansWatching, setFansWatching] = useState(128);
    const [totalTips, setTotalTips] = useState(250);
    const [totalGifts, setTotalGifts] = useState(15);
    const [reactions, setReactions] = useState(240);

    // Profile info
    interface UserProfile {
        full_name?: string;
        username?: string;
    }
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        }
    }, [user, authLoading, router]);

    // Fetch Profile
    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (data) setProfile(data);
        };
        fetchProfile();
    }, [user]);

    // Fetch Lounge details
    useEffect(() => {
        const fetchLounge = async () => {
            try {
                // Find by room_id and status = live or scheduled
                const { data, error } = await supabase
                    .from("casino_lounges")
                    .select("*")
                    .eq("room_id", roomId)
                    .in("status", ["live", "scheduled"])
                    .limit(1)
                    .maybeSingle();

                if (error || !data) {
                    setLounge(null);
                    setSessionEnded(true);
                } else {
                    setLounge(data);
                    setSessionEnded(data.status === "ended");
                }
            } catch (err) {
                console.error("Fetch lounge error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLounge();

        // Subscribe to lounge changes
        const channel = supabase
            .channel(`casino-lounge-changes-${roomId}`)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "casino_lounges", filter: `room_id=eq.${roomId}` }, (payload) => {
                const updated = payload.new as LoungeData;
                if (updated) {
                    setLounge(updated);
                    if (updated.status === "ended") {
                        setSessionEnded(true);
                        setPanelOpen(false); // Auto collapse right side panel
                        toast.info("Creator has ended the live stream. You can continue playing at the casino.");
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId]);

    // Fetch Chat messages & setup realtime listener
    useEffect(() => {
        if (!lounge) return;

        const fetchChat = async () => {
            const { data } = await supabase
                .from("casino_chat_messages")
                .select("*")
                .eq("lounge_id", lounge.id)
                .order("created_at", { ascending: true })
                .limit(50);
            if (data) setChatMessages(data);
        };

        fetchChat();

        const channel = supabase
            .channel(`casino-chat-realtime-${lounge.id}`)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "casino_chat_messages", filter: `lounge_id=eq.${lounge.id}` }, (payload) => {
                const newMsg = payload.new as ChatMessage;
                setChatMessages((prev) => [...prev, newMsg]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [lounge]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // Simulated stats updating in the background
    useEffect(() => {
        if (sessionEnded) return;
        const interval = setInterval(() => {
            setFansWatching((prev) => Math.max(10, prev + Math.floor(Math.random() * 5) - 2));
            setReactions((prev) => prev + Math.floor(Math.random() * 3));
        }, 8000);
        return () => clearInterval(interval);
    }, [sessionEnded]);

    const handleSendChat = async () => {
        if (!chatInput.trim() || !lounge || !user) return;

        const senderName = profile?.full_name || profile?.username || user.email?.split("@")[0] || "User";
        const messageText = chatInput;
        setChatInput("");

        try {
            const { error } = await supabase.from("casino_chat_messages").insert({
                lounge_id: lounge.id,
                sender_id: user.id,
                sender_name: senderName,
                message: messageText,
            });
            if (error) throw error;
        } catch (err) {
            console.error("Failed to send chat:", err);
            toast.error("Could not send message.");
        }
    };

    const handleSendTip = async (amount: number) => {
        if (!user || !lounge) return;

        if (walletBalance < amount) {
            toast.error("Insufficient wallet balance!");
            return;
        }

        try {
            const payRes = await pay(
                lounge.creator_id,
                amount,
                `Tipped creator @${lounge.creator_name} in Casino Lounge`,
                roomId,
                "tip"
            );
            if (!payRes.success) throw new Error(payRes.error || "Payment failed");
            toast.success(`Sent $${amount} tip to @${lounge.creator_name}!`);
            setTotalTips(prev => prev + amount);

            // Send notification tip to host
            await supabase.from("notifications").insert({
                user_id: lounge.creator_id,
                type: "tip_received",
                message: `${profile?.full_name || user.email?.split("@")[0]} tipped you $${amount}!`,
                metadata: { amount, room_id: roomId },
            });

            // Put a message in the chat
            await supabase.from("casino_chat_messages").insert({
                lounge_id: lounge.id,
                sender_name: "System",
                message: `💸 ${profile?.full_name || user.email?.split("@")[0]} tipped $${amount} to the creator!`,
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to process tip";
            toast.error(errorMsg);
        }
    };

    const handleSendGift = async (giftName: string, diamonds: number) => {
        if (!user || !lounge) return;

        // Diamonds/Tokens are treated as coins, lets assume 1 coin = $1 dollar equivalent for simulation, or divide by 100
        const cashValue = diamonds / 100;
        if (walletBalance < cashValue) {
            toast.error(`Insufficient wallet balance! Gift costs ${diamonds} 💎 ($${cashValue.toFixed(2)})`);
            return;
        }

        try {
            const payRes = await pay(
                lounge.creator_id,
                cashValue,
                `Gifted ${giftName} to @${lounge.creator_name} in Casino Lounge`,
                roomId,
                "gift"
            );
            if (!payRes.success) throw new Error(payRes.error || "Payment failed");
            toast.success(`Gifted ${giftName} to @${lounge.creator_name}!`);
            setTotalGifts(prev => prev + 1);

            // Put a message in the chat
            await supabase.from("casino_chat_messages").insert({
                lounge_id: lounge.id,
                sender_name: "System",
                message: `🎁 ${profile?.full_name || user.email?.split("@")[0]} sent a ${giftName} to the creator!`,
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to send gift";
            toast.error(errorMsg);
        }
    };

    const handleEndSession = async () => {
        if (!confirm("Are you sure you want to end this live casino session?") || !lounge) return;

        try {
            // Update table status to ended in DB
            const { error: loungeError } = await supabase
                .from("casino_lounges")
                .update({ status: "ended" })
                .eq("id", lounge.id);

            // Update parent room status to ended or offline
            await supabase
                .from("rooms")
                .update({ status: "offline" })
                .eq("id", lounge.room_id);

            if (loungeError) throw loungeError;

            setSessionEnded(true);
            setPanelOpen(false);
            toast.success("Live hosting session ended.");
            router.push("/rooms/casino/host-lobby");
        } catch (err) {
            console.error("End session error:", err);
            toast.error("Failed to end session.");
        }
    };

    if (authLoading || loading) {
        return (
            <div className="h-screen bg-black flex flex-col items-center justify-center text-pink-500 font-bold">
                <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-4" />
                <span>Entering Room...</span>
            </div>
        );
    }

    const isCreator = user?.id === lounge?.creator_id;

    return (
        <div className="h-screen w-full flex flex-col bg-black text-white overflow-hidden select-none">
            {/* Header */}
            <header className="h-[76px] border-b border-purple-500/10 bg-[#07020d] flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => {
                            if (isCreator) router.push("/rooms/casino/host-lobby");
                            else router.push("/rooms/casino/lounges");
                        }}
                        className="p-2 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:bg-purple-950/20 text-purple-400 hover:text-purple-300 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <BrandLogo showBadge={false} />
                        <span className="text-white text-xs font-normal border-l border-white/10 pl-3 uppercase tracking-wider">
                            Casino Lounge Room
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    {lounge && (
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-purple-800 to-pink-700 flex items-center justify-center font-bold text-sm border border-pink-500/20">
                                🎰
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white leading-tight">{lounge.table_name}</div>
                                <div className="text-[10px] text-gray-500">{lounge.game_type} • limits {cs()}{lounge.min_bet} - {cs()}{lounge.max_bet}</div>
                            </div>
                        </div>
                    )}

                    {!sessionEnded && (
                        <div className="flex items-center gap-3 border-l border-white/10 pl-5">
                            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                            <span className="text-xs uppercase tracking-widest text-red-500 font-bold">Live Now</span>
                        </div>
                    )}

                    {isCreator && !sessionEnded && (
                        <button
                            onClick={handleEndSession}
                            className="px-5 py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <Power className="w-3.5 h-3.5" /> End Session
                        </button>
                    )}

                    {!isCreator && (
                        <button
                            onClick={() => setPanelOpen(!panelOpen)}
                            className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-300 hover:bg-purple-950/20 transition cursor-pointer"
                            title={panelOpen ? "Collapse creator panel" : "Expand creator panel"}
                        >
                            {panelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </header>

            {/* Split Arena */}
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
                {/* Left Panel: Iframe casino table */}
                <section className="flex-1 h-full bg-[#0a0514] relative border-r border-purple-500/10">
                    {lounge ? (
                        <iframe
                            src={getRoomIframeSrc(lounge, isCreator)}
                            className="w-full h-full border-0 z-10 relative"
                            allow="fullscreen; autoplay; camera; microphone"
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                            Table Lounge not found or expired.
                        </div>
                    )}
                </section>

                {/* Right Panel: Interactive stream/chat */}
                {panelOpen && lounge && (
                    <aside className="w-[430px] bg-[#07010a] flex flex-col shrink-0 h-full z-20 overflow-y-auto custom-scrollbar">
                        {/* Live Stream Stage */}
                        <div className="p-4 border-b border-white/5 flex flex-col shrink-0">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h2 className="text-sm font-black uppercase text-pink-400">Creator Stream</h2>
                                    <p className="text-[10px] text-gray-400">Host: @{lounge.creator_name}</p>
                                </div>
                                {!sessionEnded && (
                                    <span className="text-[10px] font-mono bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> {fansWatching} watching
                                    </span>
                                )}
                            </div>

                            <div className="h-[210px] rounded-2xl border border-purple-500/20 overflow-hidden bg-black flex items-center justify-center relative shadow-[inset_0_0_24px_rgba(0,0,0,0.9)]">
                                {!sessionEnded ? (
                                                                    <LiveStreamWrapper
                                        role={isCreator ? "host" : "fan"}
                                        roomId={roomId}
                                        uid={isCreator ? 1000 : 2000 + Math.floor(Math.random() * 1000)}
                                        hostId={lounge.creator_id}
                                        appId={process.env.NEXT_PUBLIC_AGORA_APP_ID || undefined}
                                        hostName={lounge.creator_name}
                                        hostAvatarUrl={lounge.creator_avatar_url}
                                    />
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="text-4xl mb-2">🎥</div>
                                        <div className="text-sm font-bold text-gray-400">Stream Ended</div>
                                        <p className="text-[10px] text-gray-600 mt-1">Lounge table is currently running on autoplay.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Interactive Widgets (Tips & Gifts) */}
                        {!isCreator && !sessionEnded && (
                            <div className="p-4 border-b border-white/5 space-y-4 shrink-0">
                                {/* Tip options */}
                                <div>
                                    <span className="block text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-2">Send Tip</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {TIP_OPTIONS.map((tip) => (
                                            <button
                                                key={tip.label}
                                                onClick={() => handleSendTip(tip.amount)}
                                                className="py-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs font-bold text-purple-200 hover:bg-purple-600 hover:text-white transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                                            >
                                                <span>{tip.icon}</span> <span>{tip.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Gift options */}
                                <div>
                                    <span className="block text-[10px] font-bold text-pink-300 uppercase tracking-widest mb-2">Send Gift</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {GIFT_OPTIONS.map((gift) => (
                                            <button
                                                key={gift.label}
                                                onClick={() => handleSendGift(gift.label, gift.amount)}
                                                className="py-2 rounded-xl border border-pink-500/20 bg-pink-500/5 text-xs hover:bg-pink-600 hover:text-white transition duration-200 cursor-pointer flex flex-col items-center active:scale-95"
                                            >
                                                <span className="text-lg">{gift.icon}</span>
                                                <span className="font-bold text-[10px] mt-0.5">{gift.label}</span>
                                                <span className="text-[8px] text-pink-300/80 font-mono mt-0.5">{gift.amount} 💎</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RLS live info stats (Host View Only) */}
                        {isCreator && (
                            <div className="p-4 border-b border-white/5 shrink-0 grid grid-cols-4 gap-2">
                                <div className="p-2.5 rounded-xl border border-purple-500/10 bg-purple-950/10 text-center">
                                    <div className="text-purple-300 text-sm">👥</div>
                                    <div className="text-[9px] text-gray-500 mt-1 uppercase">Fans</div>
                                    <div className="text-xs font-black mt-1">{fansWatching}</div>
                                </div>
                                <div className="p-2.5 rounded-xl border border-purple-500/10 bg-purple-950/10 text-center">
                                    <div className="text-purple-300 text-sm">💰</div>
                                    <div className="text-[9px] text-gray-500 mt-1 uppercase">Tips</div>
                                    <div className="text-xs font-black mt-1">${totalTips}</div>
                                </div>
                                <div className="p-2.5 rounded-xl border border-purple-500/10 bg-purple-950/10 text-center">
                                    <div className="text-purple-300 text-sm">🎁</div>
                                    <div className="text-[9px] text-gray-500 mt-1 uppercase">Gifts</div>
                                    <div className="text-xs font-black mt-1">{totalGifts}</div>
                                </div>
                                <div className="p-2.5 rounded-xl border border-purple-500/10 bg-purple-950/10 text-center">
                                    <div className="text-purple-300 text-sm">🔥</div>
                                    <div className="text-[9px] text-gray-500 mt-1 uppercase">Reacts</div>
                                    <div className="text-xs font-black mt-1">{reactions}</div>
                                </div>
                            </div>
                        )}

                        {/* Live Chat Panel */}
                        <div className="flex-1 flex flex-col min-h-[250px] p-4">
                            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 shrink-0">
                                <span className="text-[10px] font-bold uppercase text-purple-300 tracking-widest">Live Chat Lounge</span>
                                <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400">Realtime</span>
                            </div>

                            {/* Chat scroll block */}
                            <div className="flex-1 overflow-y-auto bg-black/30 border border-white/5 rounded-2xl p-3 space-y-3 bl-chat-scroll min-h-0">
                                {chatMessages.map((msg, index) => {
                                    const isSystem = msg.sender_name === "System";
                                    return (
                                        <div key={msg.id || index} className="text-xs">
                                            {isSystem ? (
                                                <span className="text-yellow-400/90 italic font-semibold">{msg.message}</span>
                                            ) : (
                                                <>
                                                    <span className={`font-bold ${msg.sender_id === lounge.creator_id ? 'text-pink-400' : 'text-purple-300'}`}>
                                                        {msg.sender_name}:{" "}
                                                    </span>
                                                    <span className="text-gray-200">{msg.message}</span>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Send Input */}
                            <div className="mt-3 flex gap-2 shrink-0">
                                <input
                                    placeholder={sessionEnded ? "Lobby is archived" : "Say something..."}
                                    disabled={sessionEnded}
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                    className="flex-1 rounded-xl border border-white/10 bg-[#0d0614] px-4 py-3 text-xs outline-none focus:border-purple-500/50 disabled:opacity-40 transition"
                                />
                                <button
                                    onClick={handleSendChat}
                                    disabled={sessionEnded}
                                    className="px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase transition disabled:opacity-40 flex items-center justify-center cursor-pointer"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </aside>
                )}

                {/* Collapsed Panel Toggle */}
                {!panelOpen && (
                    <button
                        onClick={() => setPanelOpen(true)}
                        className="absolute right-4 top-4 z-40 p-3 rounded-2xl bg-pink-600 text-white hover:bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)] transition flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                    >
                        <PanelRightOpen className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}
