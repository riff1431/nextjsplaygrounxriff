"use client";

import React from "react";
import { Users, Crown, ChevronRight, Zap } from "lucide-react";

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

export default function SubscriptionsPage() {
    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20 lg:pb-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-400" />
                    Subscriptions
                </h1>

                {/* Active Subs */}
                <div className="space-y-4">
                    {[
                        { name: "NeonNyla", tier: "VIP", price: "$25.00", renews: "Feb 14", color: "pink", avatar: "N" },
                        { name: "BlueMuse", tier: "Gold", price: "$10.00", renews: "Feb 02", color: "blue", avatar: "B" },
                        { name: "VelvetX", tier: "Silver", price: "$5.00", renews: "Jan 30", color: "purple", avatar: "V" },
                    ].map((sub, i) => (
                        <NeonCard key={i} className="p-4 flex items-center justify-between group hover:border-white/30 transition">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full bg-${sub.color}-600/20 border border-${sub.color}-500/50 flex items-center justify-center text-${sub.color}-300 font-bold text-lg`}>
                                    {sub.avatar}
                                </div>
                                <div>
                                    <div className="font-bold text-white flex items-center gap-2">
                                        {sub.name}
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border border-${sub.color}-500/30 bg-${sub.color}-500/10 text-${sub.color}-300 uppercase`}>
                                            {sub.tier}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Renews {sub.renews} • {sub.price}/mo
                                    </div>
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition flex items-center gap-1 text-gray-300 hover:text-white">
                                Manage <ChevronRight className="w-4 h-4" />
                            </button>
                        </NeonCard>
                    ))}
                </div>

                {/* Discovery Promo */}
                <div className="mt-8 rounded-2xl bg-gradient-to-r from-pink-900/20 to-blue-900/20 border border-white/10 p-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Discover more Creators</h3>
                        <p className="text-sm text-gray-400">Find your next favorite vibe.</p>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-pink-600 to-blue-600 rounded-xl font-bold text-white shadow-lg hover:opacity-90 transition">
                        Explore Hub
                    </button>
                </div>
            </div>
        </div>
    )
}
