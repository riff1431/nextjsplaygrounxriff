"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, MessageCircle, BarChart3, Coins, Dices, RefreshCw, Send, Gift, HelpCircle, User, Star } from "lucide-react";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";
import { ProtectRoute, useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useSessionChat } from "@/hooks/useSessionChat";
import { toast } from "sonner";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });
const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

interface VisualCard {
    suit: string;
    label: string;
    value: number;
}

interface RoundHistoryItem {
    id: string;
    round_number: number;
    winner: string;
    player_cards: VisualCard[];
    banker_cards: VisualCard[];
}

const CasinoRoomInner = () => {
    const router = useRouter();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sessionId");
    const urlRoomId = searchParams.get("roomId");
    const supabase = createClient();

    // Session / Host Profile
    const [roomId, setRoomId] = useState<string | undefined>(urlRoomId || undefined);
    const [hostId, setHostId] = useState<string | null>(null);
    const [hostProfile, setHostProfile] = useState<any>(null);
    const [sessionTitle, setSessionTitle] = useState<string | undefined>(undefined);

    // Wallet Hook
    const { balance: walletBalance, pay, refresh: refreshWallet } = useWallet();

    // Game state
    const [gameStatus, setGameStatus] = useState<"idle" | "betting" | "dealing" | "resolved">("idle");
    const [playerCards, setPlayerCards] = useState<VisualCard[]>([]);
    const [bankerCards, setBankerCards] = useState<VisualCard[]>([]);
    const [winner, setWinner] = useState<string | null>(null);
    const [roadmap, setRoadmap] = useState<RoundHistoryItem[]>([]);

    // Betting states
    const [selectedChip, setSelectedChip] = useState<number>(10);
    const [unconfirmedBets, setUnconfirmedBets] = useState<Record<string, number>>({ player: 0, banker: 0, tie: 0 });
    const [confirmedBets, setConfirmedBets] = useState<Record<string, number>>({ player: 0, banker: 0, tie: 0 });
    const [betHistory, setBetHistory] = useState<Array<{ type: string; amount: number }>>([]);
    const [placingBets, setPlacingBets] = useState(false);

    // Tip state
    const [tipAmount, setTipAmount] = useState<string>("");
    const [tipping, setTipping] = useState(false);
    const [tipGoal, setTipGoal] = useState({ current: 240, target: 500 }); // Demo goal

    // Chat
    const { messages, sendMessage, isLoading: chatLoading } = useSessionChat(sessionId);
    const [chatInput, setChatInput] = useState("");
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Scroll chat to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Fetch initial host & session details
    useEffect(() => {
        if (!sessionId) return;
        async function fetchSession() {
            const { data: session } = await supabase
                .from("room_sessions")
                .select("creator_id, title, room_id")
                .eq("id", sessionId)
                .single();
            if (session) {
                setHostId(session.creator_id);
                setSessionTitle(session.title);
                if (session.room_id) setRoomId(session.room_id);

                // Fetch creator profile
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("username, avatar_url, full_name")
                    .eq("id", session.creator_id)
                    .single();
                if (profile) setHostProfile(profile);
            }
        }
        fetchSession();
    }, [sessionId]);

    // Fetch Baccarat roadmap history
    useEffect(() => {
        if (!sessionId) return;
        const fetchHistory = async () => {
            const { data } = await supabase
                .from("casino_rounds")
                .select("*")
                .eq("session_id", sessionId)
                .order("created_at", { ascending: true });
            if (data) setRoadmap(data as RoundHistoryItem[]);
        };
        fetchHistory();

        // Subscribe to new rounds resolving
        const channel = supabase
            .channel(`casino-rounds-${sessionId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "casino_rounds", filter: `session_id=eq.${sessionId}` },
                (payload: any) => {
                    if (payload.new) {
                        setRoadmap(prev => [...prev, payload.new as RoundHistoryItem]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    // Subscribe to active game state changes
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
            .channel(`casino-game-state-fan-${sessionId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "casino_game_states", filter: `session_id=eq.${sessionId}` },
                (payload: any) => {
                    if (payload.new) {
                        setGameStatus(payload.new.status);
                        setPlayerCards(payload.new.player_cards || []);
                        setBankerCards(payload.new.banker_cards || []);
                        setWinner(payload.new.winner);

                        if (payload.new.status === "betting") {
                            // New round starting: clear bets locally
                            setConfirmedBets({ player: 0, banker: 0, tie: 0 });
                            setUnconfirmedBets({ player: 0, banker: 0, tie: 0 });
                            setBetHistory([]);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    // Baccarat scores
    const playerTotal = playerCards.reduce((sum, c) => sum + c.value, 0) % 10;
    const bankerTotal = bankerCards.reduce((sum, c) => sum + c.value, 0) % 10;

    // Betting actions
    const handleAddChip = (betType: string) => {
        if (gameStatus !== "betting") {
            toast.error("Betting is currently closed!");
            return;
        }

        const totalUnconfirmed = unconfirmedBets.player + unconfirmedBets.banker + unconfirmedBets.tie;
        const totalConfirmed = confirmedBets.player + confirmedBets.banker + confirmedBets.tie;
        const newTotal = totalUnconfirmed + totalConfirmed + selectedChip;

        if (newTotal > walletBalance) {
            toast.error("Insufficient wallet balance!");
            return;
        }

        setUnconfirmedBets(prev => ({
            ...prev,
            [betType]: prev[betType] + selectedChip
        }));
        setBetHistory(prev => [...prev, { type: betType, amount: selectedChip }]);
    };

    const handleUndo = () => {
        if (betHistory.length === 0) return;
        const historyCopy = [...betHistory];
        const lastAction = historyCopy.pop()!;
        setBetHistory(historyCopy);
        setUnconfirmedBets(prev => ({
            ...prev,
            [lastAction.type]: Math.max(0, prev[lastAction.type] - lastAction.amount)
        }));
    };

    const handleClear = () => {
        setUnconfirmedBets({ player: 0, banker: 0, tie: 0 });
        setBetHistory([]);
    };

    const handleDouble = () => {
        if (gameStatus !== "betting") return;

        const totalUnconfirmed = unconfirmedBets.player + unconfirmedBets.banker + unconfirmedBets.tie;
        const totalConfirmed = confirmedBets.player + confirmedBets.banker + confirmedBets.tie;
        const doubledUnconfirmed = totalUnconfirmed * 2;
        const newTotal = totalConfirmed + doubledUnconfirmed;

        if (newTotal > walletBalance) {
            toast.error("Doubling exceeds wallet balance!");
            return;
        }

        const doubleHistory = betHistory.map(h => ({ ...h }));
        setBetHistory(prev => [...prev, ...doubleHistory]);
        setUnconfirmedBets(prev => ({
            player: prev.player * 2,
            banker: prev.banker * 2,
            tie: prev.tie * 2
        }));
    };

    const handleConfirmBets = async () => {
        if (!sessionId || !user) return;
        if (gameStatus !== "betting") {
            toast.error("Betting is closed!");
            return;
        }

        const playerBet = unconfirmedBets.player;
        const bankerBet = unconfirmedBets.banker;
        const tieBet = unconfirmedBets.tie;

        if (playerBet === 0 && bankerBet === 0 && tieBet === 0) {
            toast.error("Please place chips on the board first!");
            return;
        }

        setPlacingBets(true);
        try {
            if (playerBet > 0) {
                const { error } = await supabase.rpc("place_casino_bet", {
                    p_session_id: sessionId,
                    p_fan_id: user.id,
                    p_bet_type: "player",
                    p_amount: playerBet
                });
                if (error) throw error;
            }
            if (bankerBet > 0) {
                const { error } = await supabase.rpc("place_casino_bet", {
                    p_session_id: sessionId,
                    p_fan_id: user.id,
                    p_bet_type: "banker",
                    p_amount: bankerBet
                });
                if (error) throw error;
            }
            if (tieBet > 0) {
                const { error } = await supabase.rpc("place_casino_bet", {
                    p_session_id: sessionId,
                    p_fan_id: user.id,
                    p_bet_type: "tie",
                    p_amount: tieBet
                });
                if (error) throw error;
            }

            setConfirmedBets(prev => ({
                player: prev.player + playerBet,
                banker: prev.banker + bankerBet,
                tie: prev.tie + tieBet
            }));
            setUnconfirmedBets({ player: 0, banker: 0, tie: 0 });
            setBetHistory([]);
            toast.success("Bets placed successfully!");
            refreshWallet();
        } catch (err: any) {
            toast.error(err.message || "Failed to place bets.");
        } finally {
            setPlacingBets(false);
        }
    };

    // Chat Actions
    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        await sendMessage(chatInput);
        setChatInput("");
    };

    // Tip Action
    const handleSendTip = async () => {
        const amt = Number(tipAmount);
        if (!hostId || !amt || amt <= 0) return;
        if (amt > walletBalance) {
            toast.error("Insufficient wallet balance!");
            return;
        }

        setTipping(true);
        try {
            const res = await pay(hostId, amt, "Session Tip", roomId || undefined);
            if (res.success) {
                toast.success(`Tipped $${amt} successfully!`);
                setTipAmount("");
                setTipGoal(prev => ({ ...prev, current: prev.current + amt }));
                refreshWallet();
            } else {
                toast.error(res.error || "Tipping failed.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTipping(false);
        }
    };

    const creatorName = hostProfile?.full_name || hostProfile?.username || "Creator";

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col relative overflow-hidden select-none">
            {/* Visual cards/chips CSS */}
            <style>{`
                .chip-selected {
                    transform: scale(1.15) translateY(-4px);
                    box-shadow: 0 0 16px rgba(234, 179, 8, 0.6);
                    border: 2px solid #fbbf24;
                }
                .casino-card {
                    background: linear-gradient(135deg, #ffffff 0%, #e5e5e5 100%);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.8);
                    border: 2px solid #ea580c;
                    aspect-ratio: 2.5/3.5;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 6px;
                    border-radius: 6px;
                    width: 55px;
                    height: 77px;
                }
                .card-red { color: #f43f5e; }
                .card-black { color: #000000; }
                .bead {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 950;
                    color: white;
                }
                .bead-banker { background-color: #ef4444; }
                .bead-player { background-color: #3b82f6; }
                .bead-tie { background-color: #22c55e; }
                .custom-scroll::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: #3f3f46;
                    border-radius: 4px;
                }
            `}</style>

            {/* Header */}
            <header className="flex items-center px-4 py-3 bg-neutral-900 border-b border-white/5 relative z-10 shrink-0">
                <button
                    onClick={() => router.push("/rooms/casino-sessions")}
                    className="flex items-center gap-1 text-gray-400 hover:text-white transition absolute left-4"
                >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-sm font-semibold hidden sm:inline">Lobby</span>
                </button>

                <div className="mx-auto text-center">
                    <h1 className="text-base font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-300">
                        Casino Club
                    </h1>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{sessionTitle || "Live Dealer"}</p>
                </div>

                <div className="absolute right-4 flex items-center gap-2 bg-yellow-950/40 border border-yellow-500/30 px-3 py-1.5 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.1)]">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span className="font-mono font-bold text-yellow-200 text-xs">${walletBalance}</span>
                </div>
            </header>

            {/* Layout Grid */}
            <div className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 min-h-0 overflow-y-auto lg:overflow-hidden pb-4">
                {/* Left side - Stream, Cards, Betting Board */}
                <div className="flex flex-col gap-4 min-h-0 h-full">
                    {/* Agora Video Stream Stage */}
                    <div className="flex-1 min-h-[220px] bg-black/60 rounded-3xl border border-white/5 overflow-hidden relative shadow-2xl">
                        {roomId && hostId ? (
                            <LiveStreamWrapper
                                role="fan"
                                appId={APP_ID}
                                roomId={roomId}
                                uid={user?.id || ""}
                                hostId={hostId}
                                hostAvatarUrl={hostProfile?.avatar_url || ""}
                                hostName={creatorName}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/40 text-gray-500 text-xs">
                                Connecting to stream...
                            </div>
                        )}
                        <div className="absolute top-4 left-4 bg-red-600/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-red-500 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                            Live Dealer
                        </div>

                        {/* Visual cards overlay on stream */}
                        {gameStatus === "dealing" && (playerCards.length > 0 || bankerCards.length > 0) && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 p-3 px-6 shadow-2xl z-20">
                                {/* Player overlay cards */}
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Player ({playerTotal})</span>
                                    <div className="flex gap-1.5">
                                        {playerCards.map((card, i) => (
                                            <div key={i} className={`casino-card ${["♥","♦"].includes(card.suit) ? "card-red" : "card-black"}`}>
                                                <span className="text-[10px] font-bold font-mono leading-none">{card.label}</span>
                                                <span className="text-xl text-center leading-none">{card.suit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-[1px] h-10 bg-white/10" />
                                {/* Banker overlay cards */}
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Banker ({bankerTotal})</span>
                                    <div className="flex gap-1.5">
                                        {bankerCards.map((card, i) => (
                                            <div key={i} className={`casino-card ${["♥","♦"].includes(card.suit) ? "card-red" : "card-black"}`}>
                                                <span className="text-[10px] font-bold font-mono leading-none">{card.label}</span>
                                                <span className="text-xl text-center leading-none">{card.suit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Game settled overlay */}
                        {gameStatus === "resolved" && winner && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-25">
                                <div className="text-center space-y-2">
                                    <h4 className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Round Winner</h4>
                                    <h2 className="text-4xl font-black text-yellow-400 uppercase drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] tracking-wider">
                                        {winner}
                                    </h2>
                                    <div className="flex gap-6 mt-4 justify-center bg-black/40 p-3 rounded-2xl border border-white/5">
                                        <div className="text-xs text-blue-400 font-bold">Player: {playerTotal}</div>
                                        <div className="text-xs text-red-400 font-bold">Banker: {bankerTotal}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Baccarat Betting Board */}
                    <div className="bg-neutral-900 border border-white/5 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
                        <div className="grid grid-cols-3 gap-3">
                            {/* Player area */}
                            <button
                                onClick={() => handleAddChip("player")}
                                disabled={gameStatus !== "betting"}
                                className={`h-28 sm:h-32 rounded-2xl border relative flex flex-col items-center justify-center transition duration-300 ${
                                    gameStatus === "betting"
                                        ? "bg-blue-950/20 border-blue-500/30 hover:border-blue-400 hover:bg-blue-950/35"
                                        : "bg-neutral-950/40 border-white/5 opacity-55 cursor-not-allowed"
                                }`}
                            >
                                <span className="absolute top-2 left-3 text-[9px] font-bold text-blue-400 uppercase">Player</span>
                                <span className="absolute top-2 right-3 text-[9px] font-bold text-gray-500 uppercase">1:1</span>
                                <span className="text-base sm:text-lg font-black tracking-wide text-blue-300">PLAYER</span>
                                {/* Bets summary */}
                                <div className="mt-2 flex flex-col items-center gap-0.5">
                                    {confirmedBets.player > 0 && (
                                        <span className="text-[10px] font-mono font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                            Confirmed: ${confirmedBets.player}
                                        </span>
                                    )}
                                    {unconfirmedBets.player > 0 && (
                                        <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 animate-pulse">
                                            Pending: +${unconfirmedBets.player}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {/* Tie area */}
                            <button
                                onClick={() => handleAddChip("tie")}
                                disabled={gameStatus !== "betting"}
                                className={`h-28 sm:h-32 rounded-2xl border relative flex flex-col items-center justify-center transition duration-300 ${
                                    gameStatus === "betting"
                                        ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/35"
                                        : "bg-neutral-950/40 border-white/5 opacity-55 cursor-not-allowed"
                                }`}
                            >
                                <span className="absolute top-2 left-3 text-[9px] font-bold text-emerald-400 uppercase">Tie</span>
                                <span className="absolute top-2 right-3 text-[9px] font-bold text-gray-500 uppercase">8:1</span>
                                <span className="text-base sm:text-lg font-black tracking-wide text-emerald-300">TIE</span>
                                <div className="mt-2 flex flex-col items-center gap-0.5">
                                    {confirmedBets.tie > 0 && (
                                        <span className="text-[10px] font-mono font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                            Confirmed: ${confirmedBets.tie}
                                        </span>
                                    )}
                                    {unconfirmedBets.tie > 0 && (
                                        <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 animate-pulse">
                                            Pending: +${unconfirmedBets.tie}
                                        </span>
                                    )}
                                </div>
                            </button>

                            {/* Banker area */}
                            <button
                                onClick={() => handleAddChip("banker")}
                                disabled={gameStatus !== "betting"}
                                className={`h-28 sm:h-32 rounded-2xl border relative flex flex-col items-center justify-center transition duration-300 ${
                                    gameStatus === "betting"
                                        ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/35"
                                        : "bg-neutral-950/40 border-white/5 opacity-55 cursor-not-allowed"
                                }`}
                            >
                                <span className="absolute top-2 left-3 text-[9px] font-bold text-amber-400 uppercase">Banker</span>
                                <span className="absolute top-2 right-3 text-[9px] font-bold text-gray-500 uppercase">0.95:1</span>
                                <span className="text-base sm:text-lg font-black tracking-wide text-amber-300">BANKER</span>
                                <div className="mt-2 flex flex-col items-center gap-0.5">
                                    {confirmedBets.banker > 0 && (
                                        <span className="text-[10px] font-mono font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                            Confirmed: ${confirmedBets.banker}
                                        </span>
                                    )}
                                    {unconfirmedBets.banker > 0 && (
                                        <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 animate-pulse">
                                            Pending: +${unconfirmedBets.banker}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Chips selection row & action buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
                            {/* Chips */}
                            <div className="flex gap-2 sm:gap-3 overflow-x-auto py-1">
                                {[10, 25, 100, 250, 500, 1000].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => setSelectedChip(val)}
                                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex flex-col items-center justify-center font-mono font-black text-[10px] transition cursor-pointer select-none ${
                                            selectedChip === val ? "chip-selected" : "bg-neutral-950 border border-white/10 text-gray-400 hover:text-white"
                                        }`}
                                        style={selectedChip === val ? {
                                            backgroundColor: val <= 25 ? "#1d4ed8" : val <= 250 ? "#047857" : val <= 500 ? "#b45309" : "#be123c",
                                            color: "#fff"
                                        } : undefined}
                                    >
                                        <span>${val}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Control action buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleUndo}
                                    disabled={betHistory.length === 0}
                                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold transition disabled:opacity-40 disabled:hover:bg-transparent"
                                >
                                    Undo
                                </button>
                                <button
                                    onClick={handleClear}
                                    disabled={betHistory.length === 0}
                                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold transition disabled:opacity-40 disabled:hover:bg-transparent"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={handleDouble}
                                    disabled={gameStatus !== "betting" || (unconfirmedBets.player === 0 && unconfirmedBets.banker === 0 && unconfirmedBets.tie === 0)}
                                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold transition disabled:opacity-40"
                                >
                                    Double
                                </button>
                                <button
                                    onClick={handleConfirmBets}
                                    disabled={placingBets || gameStatus !== "betting" || (unconfirmedBets.player === 0 && unconfirmedBets.banker === 0 && unconfirmedBets.tie === 0)}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black uppercase text-xs tracking-wider transition active:scale-[0.98] disabled:opacity-40 disabled:hover:from-amber-500"
                                >
                                    {placingBets ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : "Confirm Bet"}
                                </button>
                            </div>
                        </div>

                        {/* Baccarat Bead Plate Roadmap */}
                        <div className="border-t border-white/5 pt-4">
                            <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Roadmap (History)</h4>
                            <div className="flex gap-1.5 overflow-x-auto py-1 pr-2 custom-scroll max-w-full">
                                {roadmap.length === 0 ? (
                                    <span className="text-[10px] text-gray-600">Waiting for first round outcome...</span>
                                ) : (
                                    roadmap.map((item, i) => (
                                        <div
                                            key={item.id || i}
                                            className={`bead ${
                                                item.winner === "banker" ? "bead-banker" :
                                                item.winner === "player" ? "bead-player" :
                                                "bead-tie"
                                            }`}
                                            title={`Round ${item.round_number}: ${item.winner}`}
                                        >
                                            {item.winner[0].toUpperCase()}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side - Chat & Tipping Panel */}
                <div className="bg-neutral-900 border border-white/5 rounded-3xl p-4 flex flex-col h-full lg:h-[calc(100vh-140px)] min-h-[450px]">
                    {/* Host Profile Capsule */}
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                        {hostProfile?.avatar_url ? (
                            <img src={hostProfile.avatar_url} className="w-10 h-10 rounded-full border border-yellow-500/30" alt="" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                                <User className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            <div className="text-xs font-black text-yellow-400 uppercase tracking-wide">Dealer/Host</div>
                            <div className="text-sm font-bold text-gray-200">{creatorName}</div>
                        </div>
                    </div>

                    {/* Chat Panel */}
                    <div className="flex-1 flex flex-col min-h-0 mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" /> Live Chat
                        </h3>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll space-y-2.5 pr-1 mb-3">
                            {messages.map((m) => (
                                <div key={m.id} className="text-xs bg-black/40 border border-white/5 rounded-xl p-2.5">
                                    <span className="font-bold text-yellow-400 block mb-0.5">{m.username}</span>
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
                                className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500/50"
                                placeholder="Send message..."
                            />
                            <button
                                onClick={handleSendChat}
                                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-rose-500 hover:text-rose-400 transition"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Tip Stage Panel */}
                    <div className="border-t border-white/5 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <Gift className="w-4 h-4 text-rose-500 animate-bounce" /> Tip Dealer
                            </h4>
                            <div className="text-[10px] text-gray-500 font-mono">Goal: ${tipGoal.current}/${tipGoal.target}</div>
                        </div>

                        {/* Goal Progress bar */}
                        <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, (tipGoal.current / tipGoal.target) * 100)}%` }}
                            />
                        </div>

                        {/* Preset Tipping buttons */}
                        <div className="grid grid-cols-4 gap-2">
                            {[5, 10, 25, 50].map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => setTipAmount(amt.toString())}
                                    className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition ${
                                        tipAmount === amt.toString()
                                            ? "bg-rose-500/10 border-rose-500 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                                            : "bg-black/30 border-white/5 text-gray-400 hover:bg-white/5"
                                    }`}
                                >
                                    ${amt}
                                </button>
                            ))}
                        </div>

                        {/* Custom Tip input */}
                        <div className="flex gap-2">
                            <div className="flex-1 flex items-center bg-black border border-white/10 rounded-xl px-3 py-2">
                                <span className="text-xs text-gray-500 font-mono mr-1">$</span>
                                <input
                                    type="number"
                                    value={tipAmount}
                                    onChange={(e) => setTipAmount(e.target.value)}
                                    className="w-full bg-transparent border-none outline-none text-xs text-gray-200 font-mono"
                                    placeholder="Custom amount"
                                />
                            </div>
                            <button
                                onClick={handleSendTip}
                                disabled={tipping || !tipAmount}
                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black uppercase text-xs tracking-wider transition active:scale-[0.98] disabled:opacity-40"
                            >
                                {tipping ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Tip"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function CasinoRoomPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-neutral-950">
                <div className="w-8 h-8 border-3 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
            </div>
        }>
            <CasinoRoomInner />
        </Suspense>
    );
}
