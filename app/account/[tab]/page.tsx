"use client";

import { useRouter } from "next/navigation";
import { NeonCard } from "@/components/ui/neon-shared";
import { ArrowLeft, CreditCard, MessageCircle, Star, Bell, Users, Settings } from "lucide-react";
import Link from "next/link";

const TABS: Record<string, { label: string; icon: any; content: string }> = {
    "wallet": {
        label: "Wallet",
        icon: CreditCard,
        content: "Manage your payment methods and transaction history."
    },
    "messages": {
        label: "Messages",
        icon: MessageCircle,
        content: "Your conversations with creators and fans."
    },
    "notifications": {
        label: "Notifications",
        icon: Bell,
        content: "Stay updated with the latest from your favorite creators."
    },
    "collections": {
        label: "CollectionX",
        icon: Star,
        content: "Your saved clips, exclusive photos, and purchased content."
    },
    "subscription": {
        label: "Subscriptions",
        icon: Users,
        content: "Manage your active subscriptions and memberships."
    },
    "profile": { // Redirected usually, but fallback
        label: "Profile Settings",
        icon: Settings,
        content: "Edit your profile details."
    },
    "settings": {
        label: "Settings",
        icon: Settings,
        content: "App preferences and account security."
    }
};

export default function AccountGenericPage({ params }: { params: { tab: string } }) {
    const router = useRouter();
    const tabKey = params.tab;
    const tabInfo = TABS[tabKey] || { label: "Account", icon: Settings, content: "Account settings" };
    const Icon = tabInfo.icon;

    if (tabKey === 'profile') {
        // Double check redirect if they land here manually
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Redirecting to profile edit...</p>
                    <Link href="/settings/profile" className="text-pink-500 hover:underline">Click if not redirected</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push('/home')}
                        className="p-2 rounded-full hover:bg-white/10 transition"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-blue-400">
                        My Account
                    </h1>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar / Navigation (Simple version) */}
                    <div className="md:w-64 space-y-2">
                        {Object.entries(TABS).map(([key, info]) => {
                            if (key === 'profile') return null; // Skip profile in tab list as it's separate
                            const TIcon = info.icon;
                            const isActive = key === tabKey;
                            return (
                                <button
                                    key={key}
                                    onClick={() => router.push(`/account/${key}`)}
                                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${isActive
                                            ? "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                        }`}
                                >
                                    <TIcon className="w-5 h-5" />
                                    <span>{info.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1">
                        <NeonCard className="p-8 min-h-[400px]">
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                                <Icon className="w-8 h-8 text-pink-500" />
                                <h2 className="text-xl font-bold text-white">{tabInfo.label}</h2>
                            </div>

                            <div className="text-center py-12">
                                <Icon className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                                <p className="text-lg text-gray-300 font-medium mb-2">{tabInfo.label}</p>
                                <p className="text-gray-500 mb-8 max-w-sm mx-auto">{tabInfo.content}</p>
                                <div className="inline-block px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-500">
                                    Feature Coming Soon
                                </div>
                            </div>
                        </NeonCard>
                    </div>
                </div>
            </div>
        </div>
    );
}
