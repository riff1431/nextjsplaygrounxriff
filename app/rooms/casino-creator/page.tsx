"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ArrowLeft, Video, MessageCircle, BarChart3, Coins, Dices, RefreshCw, Play, X, User } from "lucide-react";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import RoomSessionDashboard from "@/components/rooms/shared/RoomSessionDashboard";
import SessionLiveControls from "@/components/rooms/shared/SessionLiveControls";
import CreatorExitModal from "@/components/rooms/shared/CreatorExitModal";
import MobileStudioTabs, { MobileStudioTab } from "@/components/rooms/shared/MobileStudioTabs";
import { useSessionChat } from "@/hooks/useSessionChat";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

const CASINO_STUDIO_TABS: MobileStudioTab[] = [
    { id: "dealer", label: "Dealer Stage", icon: <Dices className="w-5 h-5" /> },
    { id: "chat", label: "Chat", icon: <MessageCircle className="w-5 h-5" /> },
    { id: "summary", label: "Summary", icon: <BarChart3 className="w-5 h-5" /> },
];

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = [
    { label: "A", val: 1 },
    { label: "2", val: 2 },
    { label: "3", val: 3 },
    { label: "4", val: 4 },
    { label: "5", val: 5 },
    { label: "6", val: 6 },
    { label: "7", val: 7 },
    { label: "8", val: 8 },
    { label: "9", val: 9 },
    { label: "10", val: 0 },
    { label: "J", val: 0 },
    { label: "Q", val: 0 },
    { label: "K", val: 0 }
];

interface VisualCard {
    suit: string;
    label: string;
    value: number;
}

interface BetItem {
    id: string;
    amount: number;
    bet_type: string;
    fan_id: string;
    profiles?: {
        username: string;
        avatar_url: string | null;
        full_name: string | null;
    };
}

const CasinoCreatorInner = () => {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const urlRoomId = searchParams.get("roomId");
    const supabase = createClient();

    const [roomId, setRoomId] = useState<string | undefined>(urlRoomId || undefined);
    const [sessionTitle, setSessionTitle] = useState<string | undefined>(undefined);
    const [showExitModal, setShowExitModal] = useState(false);
    const [mobileTab, setMobileTab] = useState("dealer");
    const [chatUnread, setChatUnread] = useState(0);

    // Baccarat Game State
    const [gameStatus, setGameStatus] = useState<"idle" | "betting" | "dealing" | "resolved">("idle");
    const [playerCards, setPlayerCards] = useState<VisualCard[]>([]);
    const [bankerCards, setBankerCards] = useState<VisualCard[]>([]);
    const [dealStep, setDealStep] = useState(0);
    const [winner, setWinner] = useState<string | null>(null);
    const [houseProfit, setHouseProfit] = useState<number | null>(null);

    // Bets placed
    const [bets, setBets] = useState<BetItem[]>([]);
    const [resolving, setResolving] = useState(false);
    const [startingRound, setStartingRound] = useState(false);

    // Chat
    const { messages, sendMessage, isLoading: chatLoading } = useSessionChat(sessionId);
    const [chatInput, setChatInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mobileTab === "chat") {
            setChatUnread(0);
        }
    }, [mobileTab]);

    // Scroll chat to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Fetch initial session & room ID
    useEffect(() => {
        if (!sessionId) return;
        async function fetchSession() {
            const { data } = await supabase
                .from("room_sessions")
                .select("room_id, title")
                .eq("id", sessionId)
                .single();
            if (data) {
                setSessionTitle(data.title);
                if (data.room_id) setRoomId(data.room_id);
            }
        }
        fetchSession();
    }, [sessionId]);

    // Real-time bets subscription
    useEffect(() => {
        if (!sessionId) return;

        const fetchBets = async () => {
            const { data } = await supabase
                .from("casino_bets")
                .select(`
                    id,
                    amount,
                    bet_type,
                    fan_id,
                    profiles:fan_id (username, avatar_url, full_name)
                `)
                .eq("session_id", sessionId)
                .eq("status", "pending");
            if (data) setBets(data as any[]);
        };
        fetchBets();

        const channel = supabase
            .channel(`casino-bets-${sessionId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "casino_bets", filter: `session_id=eq.${sessionId}` },
                () => {
                    fetchBets();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    // Real-time game state subscription to stay in sync
    useEffect(() => {
        if (!sessionId) return;
        const fetchGameState = async () => {
            const { data } = await supabase
                .from("casino_game_states")
                .select("*")
                .eq("session_id", sessionId)
                .single();
            if (data) {
                setGameStatus(data.status);
                setPlayerCards(data.player_cards || []);
                setBankerCards(data.banker_cards || []);
                setWinner(data.winner);
            }
        };
        fetchGameState();

        const channel = supabase
            .channel(`casino-state-${sessionId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "casino_game_states", filter: `session_id=eq.${sessionId}` },
                (payload: any) => {
                    if (payload.new) {
                        setGameStatus(payload.new.status);
                        setPlayerCards(payload.new.player_cards || []);
                        setBankerCards(payload.new.banker_cards || []);
                        setWinner(payload.new.winner);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    // Calculations
    const playerTotal = playerCards.reduce((sum, c) => sum + c.value, 0) % 10;
    const bankerTotal = bankerCards.reduce((sum, c) => sum + c.value, 0) % 10;

    const betSummary = {
        player: bets.filter(b => b.bet_type === "player").reduce((sum, b) => sum + Number(b.amount), 0),
        banker: bets.filter(b => b.bet_type === "banker").reduce((sum, b) => sum + Number(b.amount), 0),
        tie: bets.filter(b => b.bet_type === "tie").reduce((sum, b) => sum + Number(b.amount), 0)
    };
    const totalBetsCount = bets.length;
    const totalBetsAmount = betSummary.player + betSummary.banker + betSummary.tie;

    // Baccarat rules helpers
    const needsPlayerThirdCard = () => {
        if (playerCards.length !== 2 || bankerCards.length !== 2) return false;
        // Natural check
        if (playerTotal >= 8 || bankerTotal >= 8) return false;
        return playerTotal <= 5;
    };

    const needsBankerThirdCard = (playerThirdCardVal?: number) => {
        if (playerCards.length < 2 || bankerCards.length !== 2) return false;
        if (playerTotal >= 8 || bankerTotal >= 8) return false;

        // If player didn't draw a third card
        if (playerCards.length === 2) {
            return bankerTotal <= 5;
        }

        // If player drew a third card
        if (playerThirdCardVal !== undefined) {
            if (bankerTotal <= 2) return true;
            if (bankerTotal === 3) return playerThirdCardVal !== 8;
            if (bankerTotal === 4) return [2, 3, 4, 5, 6, 7].includes(playerThirdCardVal);
            if (bankerTotal === 5) return [4, 5, 6, 7].includes(playerThirdCardVal);
            if (bankerTotal === 6) return [6, 7].includes(playerThirdCardVal);
        }
        return false;
    };

    const drawCard = (): VisualCard => {
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const cardObj = VALUES[Math.floor(Math.random() * VALUES.length)];
        return {
            suit,
            label: cardObj.label,
            value: cardObj.val
        };
    };

    // Actions
    const handleStartBetting = async () => {
        if (!sessionId) return;
        setStartingRound(true);
        try {
            await supabase.rpc("start_new_casino_round", { p_session_id: sessionId });
            setPlayerCards([]);
            setBankerCards([]);
            setWinner(null);
            setHouseProfit(null);
            setDealStep(0);
        } catch (e) {
            console.error(e);
        } finally {
            setStartingRound(false);
        }
    };

    const handleCloseBetting = async () => {
        if (!sessionId) return;
        try {
            await supabase
                .from("casino_game_states")
                .update({ status: "dealing" })
                .eq("session_id", sessionId);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDealNextCard = () => {
        if (dealStep === 0) {
            // Player Card 1
            setPlayerCards([drawCard()]);
            setDealStep(1);
        } else if (dealStep === 1) {
            // Banker Card 1
            setBankerCards([drawCard()]);
            setDealStep(2);
        } else if (dealStep === 2) {
            // Player Card 2
            setPlayerCards(prev => [...prev, drawCard()]);
            setDealStep(3);
        } else if (dealStep === 3) {
            // Banker Card 2
            const initialBanker2 = drawCard();
            const newBankerCards = [...bankerCards, initialBanker2];
            setBankerCards(newBankerCards);

            // Baccarat rules check
            const pHasNatural = playerTotal >= 8;
            const bHasNatural = (bankerTotal + initialBanker2.value) % 10 >= 8;

            if (pHasNatural || bHasNatural) {
                setDealStep(6); // Skip to resolve
            } else {
                setDealStep(4);
            }
        } else if (dealStep === 4) {
            // Check if player draws third card
            if (playerTotal <= 5) {
                const thirdCard = drawCard();
                setPlayerCards(prev => [...prev, thirdCard]);
                setDealStep(5); // Go to banker third card check
            } else {
                // Player stands, check if Banker draws (only based on Banker score)
                if (bankerTotal <= 5) {
                    setBankerCards(prev => [...prev, drawCard()]);
                }
                setDealStep(6);
            }
        } else if (dealStep === 5) {
            // Banker draws based on Player third card
            const playerThirdCard = playerCards[2];
            if (playerThirdCard && needsBankerThirdCard(playerThirdCard.value)) {
                setBankerCards(prev => [...prev, drawCard()]);
            }
            setDealStep(6);
        }
    };

    const handleResolveRound = async () => {
        if (!sessionId) return;
        setResolving(true);

        const finalWinner = playerTotal > bankerTotal 
            ? "player" 
            : bankerTotal > playerTotal 
                ? "banker" 
                : "tie";

        try {
            const { data, error } = await supabase.rpc("resolve_casino_bets", {
                p_session_id: sessionId,
                p_winner: finalWinner,
                p_player_cards: playerCards,
                p_banker_cards: bankerCards
            });

            if (error) throw error;
            if (data) {
                setWinner(finalWinner);
                setHouseProfit(data.house_profit);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setResolving(false);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        await sendMessage(chatInput);
        setChatInput("");
    };

    // If no session created yet
    if (!sessionId) {
        return (
            <ProtectRoute allowedRoles={["creator"]}>
                <RoomSessionDashboard
                    roomType="casino"
                    roomEmoji="🎰"
                    roomLabel="Casino Lounge"
                    creatorPageRoute="/rooms/casino-creator"
                    accentHsl="0, 90%, 55%"
                    accentHslSecondary="45, 90%, 55%"
                    backgroundImage="/rooms/casino/casino-bg.jpg"
                />
            </ProtectRoute>
        );
    }

    return (
        <ProtectRoute allowedRoles={["creator"]}>
            <div className="min-h-[100dvh] lg:h-screen w-full bg-neutral-950 text-white flex flex-col relative overflow-hidden select-none">
                {/* Background style */}
                <style>{`
                    .card-red { color: #f43f5e; }
                    .card-black { color: #ffffff; }
                    .casino-card {
                        background: linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%);
                        box-shadow: 0 4px 10px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.8);
                        border: 2px solid #ea580c;
                        aspect-ratio: 2.5/3.5;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        padding: 8px;
                        border-radius: 8px;
                        width: 70px;
                        height: 98px;
                    }
                    .neon-gold-border {
                        border: 2px solid #d97706;
                        box-shadow: 0 0 15px rgba(217, 119, 6, 0.4);
                    }
                    .neon-red-border {
                        border: 2px solid #dc2626;
                        box-shadow: 0 0 15px rgba(220, 38, 38, 0.4);
                    }
                    .custom-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scroll::-webkit-scrollbar-thumb {
                        background: #3f3f46;
                        border-radius: 4px;
                    }
                `}</style>

                {/* Top Header */}
                <header className="flex items-center px-4 py-3 bg-neutral-900 border-b border-white/5 relative z-10 shrink-0">
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="flex items-center gap-1 text-gray-400 hover:text-white transition absolute left-4"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm font-semibold hidden sm:inline">Studio</span>
                    </button>

                    <h1 className="mx-auto text-xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-300">
                        Casino Lounge Studio
                    </h1>

                    <div className="absolute right-4 flex items-center gap-3">
                        <SessionLiveControls
                            sessionId={sessionId}
                            onEnd={() => router.push("/rooms/casino-creator")}
                            accentHsl="0, 90%, 55%"
                        />
                    </div>
                </header>

                {/* Main Content Grid */}
                <div className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-4 min-h-0 overflow-y-auto lg:overflow-hidden pb-20 lg:pb-4">
                    {/* Desktop layout */}
                    <div className="hidden lg:grid grid-cols-[360px_1fr_360px] gap-4 h-full">
                        {/* Left panel - Chat */}
                        <div className="bg-neutral-900/60 border border-white/5 rounded-3xl p-4 flex flex-col h-full min-h-[450px]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" /> Live Chat
                            </h3>
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scroll space-y-3 pr-2 mb-4">
                                {messages.map((m) => (
                                    <div key={m.id} className="text-xs bg-white/5 border border-white/5 rounded-xl p-2.5">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {m.avatar_url ? (
                                                <img src={m.avatar_url} className="w-4 h-4 rounded-full" alt="" />
                                            ) : (
                                                <User className="w-4 h-4 rounded-full bg-white/10 p-0.5 text-gray-400" />
                                            )}
                                            <span className="font-bold text-yellow-400">{m.username}</span>
                                        </div>
                                        <p className="text-gray-300">{m.message}</p>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                    className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500/50"
                                    placeholder="Type chat message..."
                                />
                                <button
                                    onClick={handleSendChat}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-90 font-bold text-xs text-white"
                                >
                                    Send
                                </button>
                            </div>
                        </div>

                        {/* Center panel - Dealer Stage */}
                        <div className="flex flex-col gap-4 min-h-0 h-full">
                            {/* Video stream container */}
                            <div className="flex-1 min-h-[200px] bg-black/60 rounded-3xl border border-white/5 overflow-hidden relative shadow-2xl">
                                {roomId && user ? (
                                    <LiveStreamWrapper
                                        role="host"
                                        appId={APP_ID}
                                        roomId={roomId}
                                        uid={user.id}
                                        hostId={user.id}
                                        hostAvatarUrl={user.user_metadata?.avatar_url || ""}
                                        hostName={user.user_metadata?.full_name || "Creator"}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-black/40 text-gray-500 text-xs">
                                        Initializing Broadcaster...
                                    </div>
                                )}
                                <div className="absolute top-4 left-4 bg-red-600/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-red-500 animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                                    Live Stream
                                </div>
                            </div>

                            {/* Dealer stage console */}
                            <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-white/5 rounded-3xl p-5 shadow-2xl">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                                    <h2 className="text-base font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-200">
                                        Baccarat Table Control
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                            gameStatus === "betting" ? "bg-green-600/20 text-green-400 border border-green-500/30" :
                                            gameStatus === "dealing" ? "bg-yellow-600/20 text-yellow-400 border border-yellow-500/30" :
                                            "bg-zinc-800 text-zinc-400"
                                        }`}>
                                            {gameStatus}
                                        </span>
                                    </div>
                                </div>

                                {gameStatus === "idle" || gameStatus === "resolved" ? (
                                    <div className="flex flex-col items-center justify-center py-6 gap-3">
                                        {winner && (
                                            <div className="text-center mb-2">
                                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Last Round Winner</div>
                                                <div className="text-2xl font-black text-yellow-400 uppercase drop-shadow-[0_0_12px_rgba(234,179,8,0.3)]">{winner}</div>
                                                {houseProfit !== null && (
                                                    <div className="text-xs text-green-400 font-mono mt-1">House Profit: ${houseProfit}</div>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            onClick={handleStartBetting}
                                            disabled={startingRound}
                                            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black uppercase text-xs tracking-wider transition active:scale-[0.98] shadow-xl shadow-yellow-500/10 flex items-center gap-2"
                                        >
                                            {startingRound ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                            Start Betting Round
                                        </button>
                                    </div>
                                ) : gameStatus === "betting" ? (
                                    <div className="flex flex-col items-center justify-center py-6 gap-4">
                                        <div className="text-center space-y-1">
                                            <div className="text-gray-400 text-xs">Waiting for bets...</div>
                                            <div className="text-lg font-mono font-bold text-yellow-200">${totalBetsAmount} total bet</div>
                                        </div>
                                        <button
                                            onClick={handleCloseBetting}
                                            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black uppercase text-xs tracking-wider transition active:scale-[0.98] shadow-xl shadow-red-500/10"
                                        >
                                            Close Betting & Deal Cards
                                        </button>
                                    </div>
                                ) : (
                                    /* Dealing Phase */
                                    <div className="space-y-6">
                                        {/* Baccarat cards stage */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Player cards stage */}
                                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 relative flex flex-col items-center">
                                                <div className="absolute top-2 left-3 text-[10px] font-black uppercase tracking-wider text-rose-400">Player</div>
                                                <div className="absolute top-2 right-3 font-mono font-bold text-rose-400 text-xs">{playerTotal}</div>
                                                <div className="flex gap-2 justify-center py-4 min-h-[100px]">
                                                    {playerCards.map((card, i) => (
                                                        <div key={i} className={`casino-card ${["♥","♦"].includes(card.suit) ? "card-red" : "card-black"}`}>
                                                            <div className="text-xs font-bold font-mono leading-none">{card.label}</div>
                                                            <div className="text-2xl text-center leading-none">{card.suit}</div>
                                                            <div className="text-xs font-bold font-mono leading-none text-right rotate-180">{card.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Banker cards stage */}
                                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 relative flex flex-col items-center">
                                                <div className="absolute top-2 left-3 text-[10px] font-black uppercase tracking-wider text-amber-400">Banker</div>
                                                <div className="absolute top-2 right-3 font-mono font-bold text-amber-400 text-xs">{bankerTotal}</div>
                                                <div className="flex gap-2 justify-center py-4 min-h-[100px]">
                                                    {bankerCards.map((card, i) => (
                                                        <div key={i} className={`casino-card ${["♥","♦"].includes(card.suit) ? "card-red" : "card-black"}`}>
                                                            <div className="text-xs font-bold font-mono leading-none">{card.label}</div>
                                                            <div className="text-2xl text-center leading-none">{card.suit}</div>
                                                            <div className="text-xs font-bold font-mono leading-none text-right rotate-180">{card.label}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex justify-center gap-3">
                                            {dealStep < 6 ? (
                                                <button
                                                    onClick={handleDealNextCard}
                                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black uppercase text-xs tracking-wider transition active:scale-[0.98]"
                                                >
                                                    {dealStep === 0 && "Deal Player 1st Card"}
                                                    {dealStep === 1 && "Deal Banker 1st Card"}
                                                    {dealStep === 2 && "Deal Player 2nd Card"}
                                                    {dealStep === 3 && "Deal Banker 2nd Card"}
                                                    {dealStep === 4 && "Check Player 3rd Card"}
                                                    {dealStep === 5 && "Check Banker 3rd Card"}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleResolveRound}
                                                    disabled={resolving}
                                                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black uppercase text-xs tracking-wider transition active:scale-[0.98] shadow-xl shadow-yellow-500/10 flex items-center gap-2"
                                                >
                                                    {resolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                                                    Resolve Bets & Complete Round
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right panel - Live bets overview */}
                        <div className="bg-neutral-900/60 border border-white/5 rounded-3xl p-4 flex flex-col h-full min-h-[450px]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                                <Coins className="w-4 h-4" /> Active Round Bets
                            </h3>

                            {/* Summary boxes */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-2.5 text-center">
                                    <div className="text-[9px] text-gray-500 font-bold uppercase">Player</div>
                                    <div className="text-sm font-mono font-bold text-rose-400">${betSummary.player}</div>
                                </div>
                                <div className="bg-zinc-950/20 border border-zinc-500/20 rounded-2xl p-2.5 text-center">
                                    <div className="text-[9px] text-gray-500 font-bold uppercase">Tie</div>
                                    <div className="text-sm font-mono font-bold text-zinc-300">${betSummary.tie}</div>
                                </div>
                                <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-2.5 text-center">
                                    <div className="text-[9px] text-gray-500 font-bold uppercase">Banker</div>
                                    <div className="text-sm font-mono font-bold text-amber-400">${betSummary.banker}</div>
                                </div>
                            </div>

                            {/* Bets list */}
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scroll space-y-2 pr-1">
                                {bets.length === 0 ? (
                                    <div className="text-center py-12 text-xs text-gray-500">No bets placed this round.</div>
                                ) : (
                                    bets.map((b) => (
                                        <div key={b.id} className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 rounded-xl text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                                    {b.profiles?.username?.[0]?.toUpperCase() || "F"}
                                                </div>
                                                <div>
                                                    <div className="font-bold">{b.profiles?.username || "Fan"}</div>
                                                    <div className="text-[9px] text-gray-500">Bet on: {b.bet_type}</div>
                                                </div>
                                            </div>
                                            <span className="font-mono font-bold text-yellow-400">${b.amount}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="lg:hidden flex flex-col gap-3 pt-2">
                        {/* Video — always visible at top */}
                        <div className="w-full shrink-0 aspect-square max-h-[360px] mx-auto rounded-xl overflow-hidden relative">
                            {roomId && user ? (
                                <LiveStreamWrapper
                                    role="host"
                                    appId={APP_ID}
                                    roomId={roomId}
                                    uid={user.id}
                                    hostId={user.id}
                                    hostAvatarUrl={user.user_metadata?.avatar_url || ""}
                                    hostName={user.user_metadata?.full_name || "Creator"}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-black/40 text-gray-500 text-xs">
                                    Initializing Broadcaster...
                                </div>
                            )}
                        </div>

                        {/* Tab content below stream */}
                        {mobileTab === "dealer" && (
                            <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl p-4">
                                {gameStatus === "idle" || gameStatus === "resolved" ? (
                                    <div className="flex flex-col items-center justify-center py-4 gap-3">
                                        {winner && (
                                            <div className="text-center mb-1">
                                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Last Round Winner</div>
                                                <div className="text-xl font-black text-yellow-400 uppercase">{winner}</div>
                                                {houseProfit !== null && (
                                                    <div className="text-[10px] text-green-400 font-mono mt-0.5">House Profit: ${houseProfit}</div>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            onClick={handleStartBetting}
                                            disabled={startingRound}
                                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black uppercase text-xs tracking-wider transition"
                                        >
                                            Start Betting Round
                                        </button>
                                    </div>
                                ) : gameStatus === "betting" ? (
                                    <div className="flex flex-col items-center justify-center py-4 gap-3">
                                        <div className="text-center">
                                            <div className="text-gray-400 text-[10px]">Waiting for bets...</div>
                                            <div className="text-base font-mono font-bold text-yellow-200">${totalBetsAmount} total bet</div>
                                        </div>
                                        <button
                                            onClick={handleCloseBetting}
                                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-black uppercase text-xs tracking-wider transition"
                                        >
                                            Close Betting & Deal
                                        </button>
                                    </div>
                                ) : (
                                    /* Dealing Phase */
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-black/40 rounded-xl border border-white/5 relative flex flex-col items-center">
                                                <div className="absolute top-1 left-2 text-[9px] font-black uppercase text-rose-400">Player ({playerTotal})</div>
                                                <div className="flex gap-1.5 justify-center py-2 min-h-[60px]">
                                                    {playerCards.map((card, i) => (
                                                        <div key={i} className="bg-white text-black text-xs p-1 rounded font-bold border border-zinc-300">
                                                            {card.label}{card.suit}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-3 bg-black/40 rounded-xl border border-white/5 relative flex flex-col items-center">
                                                <div className="absolute top-1 left-2 text-[9px] font-black uppercase text-amber-400">Banker ({bankerTotal})</div>
                                                <div className="flex gap-1.5 justify-center py-2 min-h-[60px]">
                                                    {bankerCards.map((card, i) => (
                                                        <div key={i} className="bg-white text-black text-xs p-1 rounded font-bold border border-zinc-300">
                                                            {card.label}{card.suit}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-center">
                                            {dealStep < 6 ? (
                                                <button
                                                    onClick={handleDealNextCard}
                                                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-black uppercase text-[10px] tracking-wider transition"
                                                >
                                                    {dealStep === 0 && "Deal Player 1st"}
                                                    {dealStep === 1 && "Deal Banker 1st"}
                                                    {dealStep === 2 && "Deal Player 2nd"}
                                                    {dealStep === 3 && "Deal Banker 2nd"}
                                                    {dealStep === 4 && "Check Player 3rd"}
                                                    {dealStep === 5 && "Check Banker 3rd"}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleResolveRound}
                                                    disabled={resolving}
                                                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-black uppercase text-xs tracking-wider transition"
                                                >
                                                    Resolve Round
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {mobileTab === "chat" && (
                            <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4 flex flex-col h-[320px]">
                                <div className="flex-1 overflow-y-auto custom-scroll space-y-2 pr-1 mb-3">
                                    {messages.map((m) => (
                                        <div key={m.id} className="text-xs bg-white/5 border border-white/5 rounded-lg p-2">
                                            <span className="font-bold text-yellow-400">{m.username}: </span>
                                            <span className="text-gray-300">{m.message}</span>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                        className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none"
                                        placeholder="Type message..."
                                    />
                                    <button
                                        onClick={handleSendChat}
                                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}

                        {mobileTab === "summary" && (
                            <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4 space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-white/5 rounded-xl p-2 text-center">
                                        <div className="text-[8px] text-gray-500 font-bold uppercase">Player Bets</div>
                                        <div className="text-xs font-bold text-rose-400">${betSummary.player}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-2 text-center">
                                        <div className="text-[8px] text-gray-500 font-bold uppercase">Tie Bets</div>
                                        <div className="text-xs font-bold text-zinc-300">${betSummary.tie}</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-2 text-center">
                                        <div className="text-[8px] text-gray-500 font-bold uppercase">Banker Bets</div>
                                        <div className="text-xs font-bold text-amber-400">${betSummary.banker}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Tab Bar */}
                <MobileStudioTabs
                    tabs={CASINO_STUDIO_TABS}
                    activeTab={mobileTab}
                    onTabChange={setMobileTab}
                    accentHsl="0, 90%, 55%"
                />

                <CreatorExitModal
                    isOpen={showExitModal}
                    onClose={() => setShowExitModal(false)}
                    onEndSession={async () => {
                        const res = await fetch(`/api/v1/rooms/sessions/${sessionId}/end`, { method: "POST" });
                        if (res.ok) router.push("/rooms/casino-creator");
                    }}
                    onMinimizeSession={() => router.push("/rooms/casino-creator")}
                    roomName="Casino Lounge"
                    accentHsl="0, 90%, 55%"
                />
            </div>
        </ProtectRoute>
    );
};

export default function CasinoCreatorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-neutral-950">
                <div className="w-8 h-8 border-3 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            </div>
        }>
            <CasinoCreatorInner />
        </Suspense>
    );
}
