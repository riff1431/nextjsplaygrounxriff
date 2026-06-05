"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Loader2, Coins, Play, RotateCcw, AlertTriangle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { cs } from "@/utils/currency";

interface CasinoLoungeData {
    id: string;
    room_id: string;
    min_bet: number;
    max_bet: number;
}

interface ProfileDetails {
    full_name?: string;
}

export default function MockCasinoGamePage() {
    const { gameId } = useParams() as { gameId: string };
    const searchParams = useSearchParams();
    const roomId = searchParams.get("roomId");
    const router = useRouter();

    const { user, isLoading: authLoading } = useAuth();
    const { balance: walletBalance, refresh: refreshWallet } = useWallet();
    const supabase = createClient();

    // Game states
    const [gameState, setGameState] = useState<"idle" | "spinning" | "result">("idle");
    const [selectedChip, setSelectedChip] = useState<number>(50);
    const [currentBet, setCurrentBet] = useState<number>(0);
    const [betType, setBetType] = useState<string>("");
    const [outcome, setOutcome] = useState<{ win: boolean; message: string; payout: number } | null>(null);
    const [lounge, setLounge] = useState<CasinoLoungeData | null>(null);
    const [profile, setProfile] = useState<ProfileDetails | null>(null);

    // Graphic states for simulation
    const [rouletteColor, setRouletteColor] = useState<string>("bg-zinc-800");
    const [rouletteNumber, setRouletteNumber] = useState<number | null>(null);
    const [cards, setCards] = useState<{ player: string[]; dealer: string[] }>({ player: [], dealer: [] });

    // Fetch lounge and profile details
    useEffect(() => {
        if (!user) return;

        const fetchProfile = async () => {
            const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (data) setProfile(data);
        };

        const fetchLoungeDetails = async () => {
            if (!roomId) return;
            const { data } = await supabase
                .from("casino_lounges")
                .select("*")
                .eq("room_id", roomId)
                .eq("status", "live")
                .maybeSingle();
            if (data) setLounge(data);
        };

        fetchProfile();
        fetchLoungeDetails();
    }, [user, roomId]);

    const handlePlaceBet = (type: string) => {
        if (gameState === "spinning") return;

        if (walletBalance < selectedChip) {
            toast.error("Insufficient wallet balance!");
            return;
        }

        // Limit to table stakes if inside a lounge
        if (lounge) {
            if (selectedChip < lounge.min_bet) {
                toast.error(`Minimum bet for this table is ${cs()}${lounge.min_bet}`);
                return;
            }
            if (selectedChip > lounge.max_bet) {
                toast.error(`Maximum bet for this table is ${cs()}${lounge.max_bet}`);
                return;
            }
        }

        setCurrentBet(selectedChip);
        setBetType(type);
        setOutcome(null);
        toast.success(`Placed ${cs()}${selectedChip} bet on ${type}`);
    };

    const handleClearBet = () => {
        if (gameState === "spinning") return;
        setCurrentBet(0);
        setBetType("");
        setOutcome(null);
    };

    const runGameSimulation = async () => {
        if (currentBet <= 0 || !betType || !user) {
            toast.error("Place a bet first!");
            return;
        }

        setGameState("spinning");
        setOutcome(null);

        // Deduct bet from database
        try {
            await supabase.rpc("add_funds", {
                user_uuid: user.id,
                amount_val: -currentBet,
                desc_text: `Casino Bet: ${betType} on ${gameId === "roulette_live_001" ? "Roulette" : gameId === "blackjack_live_001" ? "Blackjack" : "Baccarat"}`
            });
            await refreshWallet();
        } catch (err) {
            console.error("Deduct bet failed:", err);
            toast.error("Could not place bet.");
            setGameState("idle");
            return;
        }

        // Notify chat if in a lounge
        if (lounge) {
            const name = profile?.full_name || user.email?.split("@")[0] || "Player";
            await supabase.from("casino_chat_messages").insert({
                lounge_id: lounge.id,
                sender_name: "System",
                message: `🎲 ${name} placed a ${cs()}${currentBet} bet on ${betType}!`,
            });
        }

        // Simulate delay (e.g. wheel spin or card deal)
        setTimeout(async () => {
            let win = false;
            let message = "";
            let winAmount = 0;

            if (gameId === "roulette_live_001") {
                const num = Math.floor(Math.random() * 37); // 0 to 36
                setRouletteNumber(num);
                const isRed = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num);
                const color = num === 0 ? "green" : isRed ? "red" : "black";
                setRouletteColor(num === 0 ? "bg-green-600" : isRed ? "bg-red-600" : "bg-black");

                if (betType === "Red" && color === "red") {
                    win = true;
                    winAmount = currentBet * 2;
                } else if (betType === "Black" && color === "black") {
                    win = true;
                    winAmount = currentBet * 2;
                } else if (betType === "Even" && num !== 0 && num % 2 === 0) {
                    win = true;
                    winAmount = currentBet * 2;
                } else if (betType === "Odd" && num % 2 !== 0) {
                    win = true;
                    winAmount = currentBet * 2;
                } else if (betType === "Single Number (17)" && num === 17) {
                    win = true;
                    winAmount = currentBet * 36;
                }
                message = `Ball landed on ${num} (${color.toUpperCase()})`;
            } else if (gameId === "blackjack_live_001") {
                const playerScore = Math.floor(Math.random() * 10) + 12; // 12-21
                const dealerScore = Math.floor(Math.random() * 10) + 12; // 12-21
                setCards({
                    player: [`Card ${Math.floor(Math.random() * 10) + 2}`, `Card ${Math.floor(Math.random() * 10) + 2}`],
                    dealer: [`Card ${Math.floor(Math.random() * 10) + 2}`, `Card ${Math.floor(Math.random() * 10) + 2}`]
                });

                if (playerScore > 21) {
                    win = false;
                    message = `Bust! Player score was ${playerScore}`;
                } else if (dealerScore > 21 || playerScore > dealerScore) {
                    win = true;
                    winAmount = currentBet * 2;
                    message = `Player wins! ${playerScore} vs ${dealerScore}`;
                } else if (playerScore === dealerScore) {
                    win = true;
                    winAmount = currentBet; // Push
                    message = `Push! Both scored ${playerScore}`;
                } else {
                    win = false;
                    message = `Dealer wins! ${dealerScore} vs ${playerScore}`;
                }
            } else {
                // Baccarat
                const playerPoints = Math.floor(Math.random() * 10);
                const bankerPoints = Math.floor(Math.random() * 10);
                const outcomeResult = playerPoints > bankerPoints ? "Player" : playerPoints < bankerPoints ? "Banker" : "Tie";

                if (betType === outcomeResult) {
                    win = true;
                    if (outcomeResult === "Tie") {
                        winAmount = currentBet * 9;
                    } else {
                        winAmount = currentBet * 2;
                    }
                }
                message = `Result: Player ${playerPoints} - Banker ${bankerPoints} (${outcomeResult})`;
            }

            if (win) {
                setOutcome({ win: true, message, payout: winAmount });
                try {
                    await supabase.rpc("add_funds", {
                        user_uuid: user.id,
                        amount_val: winAmount,
                        desc_text: `Casino Win Payout: ${gameId}`
                    });
                    await refreshWallet();
                } catch (err) {
                    console.error("Payout credit failed:", err);
                }

                // Notify chat if in a lounge
                if (lounge) {
                    const name = profile?.full_name || user.email?.split("@")[0] || "Player";
                    await supabase.from("casino_chat_messages").insert({
                        lounge_id: lounge.id,
                        sender_name: "System",
                        message: `🎉 ${name} won ${cs()}${winAmount}! (${message})`,
                    });
                }
            } else {
                setOutcome({ win: false, message, payout: 0 });

                // Notify chat if in a lounge
                if (lounge) {
                    const name = profile?.full_name || user.email?.split("@")[0] || "Player";
                    await supabase.from("casino_chat_messages").insert({
                        lounge_id: lounge.id,
                        sender_name: "System",
                        message: `😢 ${name} lost bet of ${cs()}${currentBet}. (${message})`,
                    });
                }
            }

            setGameState("result");
        }, 2500);
    };

    if (authLoading) {
        return (
            <div className="h-screen bg-[#07000e] flex items-center justify-center text-yellow-500 font-bold">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mr-2" /> Connecting...
            </div>
        );
    }

    if (!user) {
        return (
            <div className="h-screen bg-[#07000e] text-white flex flex-col items-center justify-center text-center p-6">
                <AlertTriangle className="w-10 h-10 text-yellow-500 mb-2" />
                <h3 className="font-bold">Not Authenticated</h3>
                <p className="text-gray-400 text-xs mt-1">Please log in to PlayGroundX to play.</p>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#07000e] text-white flex flex-col font-sans select-none relative overflow-hidden">
            {/* Visual Neon BG */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-[80px] pointer-events-none" />

            {/* Game Screen Area */}
            <div className="flex-1 flex flex-col md:flex-row min-h-0">
                {/* Left Side: Game graphic/canvas */}
                <div className="flex-1 bg-[#0b0318] p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-yellow-500/10 relative">
                    {gameId === "roulette_live_001" && (
                        <div className="flex flex-col items-center justify-center space-y-6">
                            {/* Spinning roulette wheel graphic */}
                            <div className={`w-36 h-36 rounded-full border-4 border-yellow-500/40 flex items-center justify-center transition-all duration-1000 ${
                                gameState === "spinning" ? "animate-spin scale-105 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]" : ""
                            } ${rouletteColor}`}>
                                <span className="text-3xl font-black font-mono">
                                    {gameState === "spinning" ? "🎰" : rouletteNumber !== null ? rouletteNumber : "?"}
                                </span>
                            </div>
                            <span className="text-xs text-gray-500 uppercase font-black tracking-widest">European Roulette Wheel</span>
                        </div>
                    )}

                    {gameId === "blackjack_live_001" && (
                        <div className="space-y-6 w-full max-w-xs text-center">
                            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Dealer Hand</span>
                                <div className="flex justify-center gap-2">
                                    {gameState === "spinning" ? (
                                        <div className="w-10 h-14 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-xs animate-pulse">?</div>
                                    ) : cards.dealer.length > 0 ? (
                                        cards.dealer.map((c, i) => (
                                            <div key={i} className="w-10 h-14 bg-white text-black border rounded-lg flex items-center justify-center text-[10px] font-bold shadow-md">{c}</div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-gray-600">No cards dealt</div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Player Hand</span>
                                <div className="flex justify-center gap-2">
                                    {gameState === "spinning" ? (
                                        <div className="w-10 h-14 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center text-xs animate-pulse">?</div>
                                    ) : cards.player.length > 0 ? (
                                        cards.player.map((c, i) => (
                                            <div key={i} className="w-10 h-14 bg-white text-black border rounded-lg flex items-center justify-center text-[10px] font-bold shadow-md">{c}</div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-gray-600">No cards dealt</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {gameId === "baccarat_live_001" && (
                        <div className="space-y-4 text-center">
                            <div className="flex items-center gap-8 bg-black/40 p-5 rounded-3xl border border-white/5">
                                <div>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Player Side</span>
                                    <div className="text-2xl font-black text-blue-400">
                                        {gameState === "spinning" ? "⏳" : outcome ? "Dealt" : "Waiting"}
                                    </div>
                                </div>
                                <div className="h-8 w-[1px] bg-white/10" />
                                <div>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Banker Side</span>
                                    <div className="text-2xl font-black text-red-400">
                                        {gameState === "spinning" ? "⏳" : outcome ? "Dealt" : "Waiting"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Outcome Notification */}
                    {outcome && (
                        <div className={`absolute bottom-4 left-4 right-4 p-3 rounded-xl border text-center transition-all ${
                            outcome.win 
                                ? "bg-green-500/10 border-green-500/30 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.15)]" 
                                : "bg-red-500/10 border-red-500/30 text-red-300"
                        }`}>
                            <div className="text-xs font-bold uppercase tracking-wider">{outcome.win ? "🎉 WINNER!" : "😢 YOU LOST"}</div>
                            <div className="text-[10px] font-medium mt-0.5">{outcome.message}</div>
                            {outcome.win && <div className="text-xs font-mono font-black mt-1 text-green-400">+{cs()}{outcome.payout} payout!</div>}
                        </div>
                    )}
                </div>

                {/* Right Side: Betting controls */}
                <div className="w-full md:w-[320px] p-6 bg-[#0a0314] flex flex-col justify-between overflow-y-auto">
                    <div>
                        {/* Title and table limits */}
                        <div className="mb-4">
                            <h3 className="text-sm font-black uppercase text-yellow-400 tracking-wider">
                                {gameId === "roulette_live_001" ? "Roulette Table" : gameId === "blackjack_live_001" ? "Blackjack Seat" : "Baccarat Lobby"}
                            </h3>
                            {lounge && (
                                <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wide">
                                    Table Limits: {cs()}{lounge.min_bet} - {cs()}{lounge.max_bet}
                                </p>
                            )}
                        </div>

                        {/* Balance display */}
                        <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">🪙</span>
                                <span className="text-xs text-gray-400">Wallet</span>
                            </div>
                            <span className="font-mono text-sm font-bold text-yellow-300">{cs()}{walletBalance.toFixed(2)}</span>
                        </div>

                        {/* Chip selector */}
                        <div className="mb-6">
                            <span className="block text-[9px] font-bold text-yellow-500 uppercase tracking-widest mb-2">Select Chip Value</span>
                            <div className="grid grid-cols-5 gap-1.5">
                                {[10, 50, 100, 500, 1000].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => setSelectedChip(val)}
                                        className={`py-2 rounded-xl text-[10px] font-black font-mono transition cursor-pointer ${
                                            selectedChip === val
                                                ? "bg-yellow-500 text-black shadow-md scale-105"
                                                : "bg-black/40 border border-white/10 text-gray-400 hover:text-white"
                                        }`}
                                    >
                                        {cs()}{val}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bet options layout */}
                        <div className="mb-6">
                            <span className="block text-[9px] font-bold text-yellow-500 uppercase tracking-widest mb-2">Place Bet Area</span>
                            
                            {gameId === "roulette_live_001" && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handlePlaceBet("Red")} className="py-3.5 rounded-xl bg-red-700/80 border border-red-500/20 text-xs font-bold text-white hover:bg-red-700 transition">RED</button>
                                        <button onClick={() => handlePlaceBet("Black")} className="py-3.5 rounded-xl bg-black border border-zinc-800 text-xs font-bold text-white hover:bg-zinc-950 transition">BLACK</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handlePlaceBet("Even")} className="py-3 rounded-xl bg-zinc-900 border border-white/5 text-[10px] font-bold text-gray-300 hover:bg-zinc-800 transition">EVEN</button>
                                        <button onClick={() => handlePlaceBet("Odd")} className="py-3 rounded-xl bg-zinc-900 border border-white/5 text-[10px] font-bold text-gray-300 hover:bg-zinc-800 transition">ODD</button>
                                    </div>
                                    <button onClick={() => handlePlaceBet("Single Number (17)")} className="w-full py-2.5 rounded-xl bg-zinc-950 border border-yellow-500/20 text-[10px] font-bold text-yellow-400 hover:bg-yellow-950/20 transition">BET SINGLE NUMBER 17 (35x)</button>
                                </div>
                            )}

                            {gameId === "blackjack_live_001" && (
                                <div className="space-y-2">
                                    <button onClick={() => handlePlaceBet("Player Hand")} className="w-full py-4 rounded-xl bg-emerald-800 border border-emerald-500/20 text-xs font-bold text-white hover:bg-emerald-700 transition">BET PLAYER HAND</button>
                                </div>
                            )}

                            {gameId === "baccarat_live_001" && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handlePlaceBet("Player")} className="py-3.5 rounded-xl bg-blue-800/80 border border-blue-500/20 text-xs font-bold text-white hover:bg-blue-800 transition">PLAYER</button>
                                        <button onClick={() => handlePlaceBet("Banker")} className="py-3.5 rounded-xl bg-red-800/80 border border-red-500/20 text-xs font-bold text-white hover:bg-red-800 transition">BANKER</button>
                                    </div>
                                    <button onClick={() => handlePlaceBet("Tie")} className="w-full py-3 rounded-xl bg-zinc-900 border border-yellow-500/10 text-[10px] font-bold text-yellow-300 hover:bg-zinc-800 transition">TIE PAYOUT (8:1)</button>
                                </div>
                            )}
                        </div>

                        {/* Current Bet Summary */}
                        {currentBet > 0 && (
                            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/10 flex items-center justify-between text-xs mb-4">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-gray-500 font-bold uppercase">Placed Bet</span>
                                    <span className="font-bold text-white mt-0.5">{betType}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-yellow-300">{cs()}{currentBet}</span>
                                    <button onClick={handleClearBet} className="p-1 rounded bg-white/5 text-gray-400 hover:text-white transition">✕</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Spin Button */}
                    <div className="space-y-2">
                        <button
                            onClick={runGameSimulation}
                            disabled={gameState === "spinning" || currentBet <= 0}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            {gameState === "spinning" ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-black" /> Playing...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 text-black fill-current" /> Spin / Deal Hand
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
