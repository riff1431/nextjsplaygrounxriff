"use client";

import React from "react";
import { Bell, Heart, Star, Zap, UserPlus } from "lucide-react";

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

export default function NotificationsPage() {
    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20 lg:pb-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Bell className="w-6 h-6 text-pink-400" />
                    Notifications
                </h1>

                <div className="space-y-2">
                    {[
                        { icon: Heart, color: "red", text: "NeonNyla liked your comment.", time: "2m ago", read: false },
                        { icon: Zap, color: "yellow", text: "Flash Drop started! Hurry up!", time: "15m ago", read: false },
                        { icon: Star, color: "purple", text: "You unlocked 'Velvet Vibes' collection.", time: "1h ago", read: true },
                        { icon: UserPlus, color: "blue", text: "BlueMuse started following you.", time: "3h ago", read: true },
                    ].map((notif, i) => (
                        <div key={i} className={`p-4 rounded-xl flex gap-4 items-start border transition ${notif.read ? 'border-transparent bg-transparent opacity-70 hover:opacity-100 hover:bg-white/5' : 'border-pink-500/20 bg-white/5'}`}>
                            <div className={`p-2 rounded-full bg-${notif.color}-500/20 text-${notif.color}-400 mt-1`}>
                                <notif.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm text-gray-200">{notif.text}</div>
                                <div className="text-xs text-gray-500 mt-1">{notif.time}</div>
                            </div>
                            {!notif.read && <div className="w-2 h-2 rounded-full bg-pink-500 mt-2"></div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
