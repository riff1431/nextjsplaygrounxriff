"use client";

import LiveFeed from "@/components/home/LiveFeed";
import BrandLogo from "@/components/common/BrandLogo";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function LivePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <BrandLogo />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 mb-2">
                        Live Discover
                    </h1>
                    <p className="text-gray-400">
                        Explore real-time interactive experiences from top creators.
                    </p>
                </div>

                <LiveFeed />
            </main>
        </div>
    );
}
