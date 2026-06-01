"use client";

import React, { useState, useEffect } from "react";
import { Coins, HelpCircle, RefreshCw, Trophy, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SYMBOLS = [
    { emoji: "💎", label: "diamond", value: 100, weight: 1 },
    { emoji: "🎰", label: "jackpot", value: 500, weight: 0.5 },
    { emoji: "🍒", label: "cherry", value: 20, weight: 3 },
    { emoji: "🍋", label: "lemon", value: 10, weight: 4 },
    { emoji: "🔔", label: "bell", value: 50, weight: 2 },
    { emoji: "🌟", label: "star", value: 75, weight: 1.5 },
];

export default function CasinoGamePage() {
    const [balance, setBalance] = useState(1000);
    const [bet, setBet] = useState(50);
    const [reels, setReels] = useState(["🎰", "🎰", "🎰"]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [message, setMessage] = useState("Spin to win!");
    const [winAmount, setWinAmount] = useState(0);
    const [mute, setMute] = useState(true);

    const playSound = (type: "spin" | "win" | "lose" | "click") => {
        if (mute) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === "spin") {
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.5);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
            } else if (type === "win") {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
                osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
                osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); // C6
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
                osc.start();
                osc.stop(ctx.currentTime + 0.7);
            } else if (type === "lose") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(200, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                osc.start();
                osc.stop(ctx.currentTime + 0.4);
            } else if (type === "click") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                osc.start();
                osc.stop(ctx.currentTime + 0.05);
            }
        } catch (e) {
            console.error("Audio failed", e);
        }
    };

    const getRandomSymbol = () => {
        const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        for (const sym of SYMBOLS) {
            if (random < sym.weight) return sym;
            random -= sym.weight;
        }
        return SYMBOLS[2]; // fallback cherry
    };

    const handleSpin = () => {
        if (isSpinning || balance < bet) return;
        setIsSpinning(true);
        setBalance((prev) => prev - bet);
        setWinAmount(0);
        setMessage("Spinning...");
        playSound("spin");

        let duration = 1200; // ms
        let intervalTime = 80;
        let elapsed = 0;

        const timer = setInterval(() => {
            setReels([
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji,
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji,
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji,
            ]);
            elapsed += intervalTime;
            if (elapsed >= duration) {
                clearInterval(timer);
                resolveSpin();
            }
        }, intervalTime);
    };

    const resolveSpin = () => {
        const finalReels = [
            getRandomSymbol(),
            getRandomSymbol(),
            getRandomSymbol(),
        ];
        setReels(finalReels.map((r) => r.emoji));

        const r0 = finalReels[0];
        const r1 = finalReels[1];
        const r2 = finalReels[2];

        let win = 0;
        let msg = "";

        if (r0.emoji === r1.emoji && r1.emoji === r2.emoji) {
            // Triple match
            win = r0.value * (bet / 10);
            msg = `🎉 JACKPOT! 3x ${r0.emoji} - Won $${win}!`;
            playSound("win");
        } else if (r0.emoji === r1.emoji || r1.emoji === r2.emoji || r0.emoji === r2.emoji) {
            // Double match
            const matchSymbol = r0.emoji === r1.emoji ? r0 : r2;
            win = Math.floor(matchSymbol.value * 0.3 * (bet / 10));
            msg = `✨ Big Win! 2x ${matchSymbol.emoji} - Won $${win}!`;
            playSound("win");
        } else {
            msg = "Try again! Double or Triple symbols to win.";
            playSound("lose");
        }

        if (win > 0) {
            setBalance((prev) => prev + win);
            setWinAmount(win);
        }
        setMessage(msg);
        setIsSpinning(false);
    };

    return (
        <div className="w-full h-full min-h-[500px] bg-neutral-950 text-white flex flex-col items-center justify-between p-4 md:p-6 select-none relative overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="w-full flex items-center justify-between border-b border-yellow-500/20 pb-3">
                <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                    <span className="font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
                        VIP Casino Club
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-yellow-950/40 border border-yellow-500/30 px-3 py-1.5 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.1)]">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="font-mono font-bold text-yellow-200">${balance}</span>
                    </div>
                    <button
                        onClick={() => {
                            setMute(!mute);
                            playSound("click");
                        }}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition"
                    >
                        {mute ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Slot Cabinet Wrapper */}
            <div className="flex-1 w-full max-w-md flex flex-col justify-center my-6">
                <div className="relative bg-gradient-to-b from-amber-600 via-yellow-500 to-amber-700 p-3 rounded-[32px] shadow-[0_0_36px_rgba(234,179,8,0.35)] border border-yellow-400/50">
                    {/* Glass Glare */}
                    <div className="absolute inset-x-4 top-2 h-4 bg-white/20 rounded-full blur-sm pointer-events-none" />

                    {/* Reels Display */}
                    <div className="bg-black border-4 border-amber-950 rounded-2xl p-4 flex justify-between gap-3 relative overflow-hidden shadow-[inset_0_0_24px_rgba(0,0,0,0.95)]">
                        {/* Reel Divider Shadows */}
                        <div className="absolute inset-y-0 left-1/3 w-1 bg-gradient-to-r from-transparent via-black/40 to-transparent pointer-events-none" />
                        <div className="absolute inset-y-0 right-1/3 w-1 bg-gradient-to-r from-transparent via-black/40 to-transparent pointer-events-none" />

                        {reels.map((emoji, index) => (
                            <div
                                key={index}
                                className="flex-1 aspect-[3/4] bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center text-4xl sm:text-5xl shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] relative overflow-hidden"
                            >
                                <motion.div
                                    key={isSpinning ? `spin-${Math.random()}` : emoji}
                                    initial={isSpinning ? { y: -80, opacity: 0.3 } : { y: 0, opacity: 1 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ duration: 0.1, ease: "easeOut" }}
                                >
                                    {emoji}
                                </motion.div>
                            </div>
                        ))}
                    </div>

                    {/* Payline indicator */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-red-600/70 shadow-[0_0_8px_rgba(220,38,38,0.8)] pointer-events-none" />
                </div>

                {/* Display Messages */}
                <div className="text-center mt-6 min-h-[48px] px-4">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={message}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`text-base font-bold tracking-wide ${
                                winAmount > 0
                                    ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] font-black text-lg"
                                    : "text-gray-300"
                            }`}
                        >
                            {message}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>

            {/* Controls Panel */}
            <div className="w-full max-w-md bg-neutral-900/60 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Select Bet</span>
                    <div className="flex gap-2">
                        {[10, 20, 50, 100].map((amount) => (
                            <button
                                key={amount}
                                disabled={isSpinning}
                                onClick={() => {
                                    setBet(amount);
                                    playSound("click");
                                }}
                                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                                    bet === amount
                                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.2)]"
                                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                ${amount}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    {/* Spin Button */}
                    <button
                        onClick={handleSpin}
                        disabled={isSpinning || balance < bet}
                        className={`flex-1 py-3.5 rounded-xl text-base font-black uppercase tracking-wider text-black transition-all shadow-xl relative overflow-hidden group ${
                            balance < bet
                                ? "bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed"
                                : "bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 border border-yellow-400 active:scale-[0.98] shadow-yellow-500/20 hover:shadow-[0_0_24px_rgba(234,179,8,0.4)]"
                        }`}
                    >
                        {isSpinning ? (
                            <div className="flex items-center justify-center gap-2">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>Rolling...</span>
                            </div>
                        ) : balance < bet ? (
                            "No Credits"
                        ) : (
                            "SPIN SLOT"
                        )}
                    </button>

                    {/* Reset balance helper if they run out */}
                    {balance < bet && (
                        <button
                            onClick={() => {
                                setBalance(1000);
                                setMessage("Credits reset to $1000!");
                                playSound("click");
                            }}
                            className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-yellow-400 transition"
                            title="Reset Balance"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
