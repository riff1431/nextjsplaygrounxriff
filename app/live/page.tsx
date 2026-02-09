"use client";

import { useState, useEffect } from "react";
import LiveFeed from "@/components/home/LiveFeed";
import BrandLogo from "@/components/common/BrandLogo";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "@/utils/supabase/client";
import ProfileMenu from "@/components/navigation/ProfileMenu";

export default function LivePage() {
    const router = useRouter();
    const { user, role } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        async function fetchProfile() {
            if (!user) return;
            const { data } = await supabase
                .from('profiles')
                .select('username, full_name, avatar_url')
                .eq('id', user.id)
                .single();

            if (data) {
                setProfile(data);
            }
        }
        fetchProfile();
    }, [user]);

    const handleRefresh = () => {
        window.location.reload();
    };

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

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Refresh Page"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>

                        <ProfileMenu
                            user={user}
                            profile={profile}
                            role={role}
                            router={router}
                            onSignOut={async () => { await supabase.auth.signOut(); router.push("/"); }}
                        />
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
