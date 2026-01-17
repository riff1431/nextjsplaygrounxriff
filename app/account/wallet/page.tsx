"use client";

import React from "react";
import { CreditCard, Wallet, Plus, ArrowUpRight, ArrowDownLeft, History, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function NeonCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div
            className={cx(
                "rounded-2xl border border-pink-500/25 bg-black",
                "shadow-[0_0_24px_rgba(236,72,153,0.14),0_0_56px_rgba(59,130,246,0.08)]",
                className
            )}
        >
            {children}
        </div>
    );
}

function NeonButton({
    children,
    className = "",
    variant = "pink",
}: {
    children: React.ReactNode;
    className?: string;
    variant?: "pink" | "blue" | "ghost";
}) {
    const base = "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2";
    const styles =
        variant === "pink"
            ? "bg-pink-600 hover:bg-pink-700 text-white border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.4)]"
            : variant === "blue"
                ? "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "bg-white/5 hover:bg-white/10 text-pink-200 border border-pink-500/20";

    return <button className={cx(base, styles, className)}>{children}</button>;
}


export default function WalletPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20 lg:pb-6">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-pink-500/10 rounded-xl border border-pink-500/20">
                            <Wallet className="w-6 h-6 text-pink-400" />
                        </div>
                        Wallet & Cards
                    </h1>
                    <NeonButton variant="ghost" className="text-xs">
                        <History className="w-4 h-4" /> History
                    </NeonButton>
                </div>

                {/* Balance Card - The "Hero" */}
                <div className="relative rounded-3xl overflow-hidden p-8 border border-white/10 group">
                    {/* Background Mesh Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-900 via-black to-blue-900 opacity-80 group-hover:opacity-100 transition duration-700"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/20 blur-[100px] rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full"></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="text-pink-200 text-sm font-medium uppercase tracking-widest opacity-80">Total Balance</div>
                        <div className="text-5xl md:text-6xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                            <span className="text-pink-500">$</span>1,240.50
                        </div>
                        <div className="flex gap-4 pt-4">
                            <NeonButton variant="pink" className="px-8 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                                <Plus className="w-4 h-4" /> Add Funds
                            </NeonButton>
                            <NeonButton variant="ghost" className="hover:bg-white/10">
                                <ArrowUpRight className="w-4 h-4" /> Withdraw
                            </NeonButton>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <NeonCard className="p-4 flex items-center gap-4 hover:border-green-500/40 transition">
                        <div className="p-3 rounded-full bg-green-500/10 text-green-400">
                            <ArrowDownLeft className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400">Total Spent</div>
                            <div className="text-lg font-bold text-white">$450.00</div>
                        </div>
                    </NeonCard>
                    <NeonCard className="p-4 flex items-center gap-4 hover:border-purple-500/40 transition">
                        <div className="p-3 rounded-full bg-purple-500/10 text-purple-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-gray-400">Pending</div>
                            <div className="text-lg font-bold text-white">$25.00</div>
                        </div>
                    </NeonCard>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-200">Payment Methods</h2>

                    <NeonCard className="p-4 flex items-center justify-between group cursor-pointer hover:border-white/20 transition">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-8 rounded bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center">
                                <div className="w-6 h-4 bg-white/20 rounded-sm"></div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white flex items-center gap-2">
                                    Visa ending in 4242
                                    <span className="text-[10px] bg-white/10 px-1.5 rounded text-gray-300">Default</span>
                                </div>
                                <div className="text-xs text-gray-400">Expires 12/28</div>
                            </div>
                        </div>
                        <div className="text-gray-500 group-hover:text-white transition">Edit</div>
                    </NeonCard>

                    <button className="w-full p-4 rounded-2xl border border-dashed border-gray-700 hover:border-pink-500/50 hover:bg-pink-500/5 transition text-gray-400 hover:text-pink-300 flex items-center justify-center gap-2 text-sm font-medium">
                        <Plus className="w-4 h-4" /> Add New Card
                    </button>
                </div>

            </div>
        </div>
    );
}
