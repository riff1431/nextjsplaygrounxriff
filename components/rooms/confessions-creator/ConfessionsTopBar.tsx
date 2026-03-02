"use client";

import { useState, useEffect } from "react";
import { Heart, DollarSign, ArrowLeft, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/app/context/AuthContext";

const ConfessionsTopBar = () => {
    const router = useRouter();
    const { user } = useAuth();
    const supabase = createClient();
    const [stats, setStats] = useState({ fans: 0, confessions: 0, earned: 0 });

    useEffect(() => {
        if (!user) return;

        async function fetchStats() {
            // Get room
            const { data: room } = await supabase
                .from("rooms")
                .select("id")
                .eq("host_id", user!.id)
                .limit(1)
                .maybeSingle();

            if (!room) return;

            // Get confession request count
            const { count: reqCount } = await supabase
                .from("confession_requests")
                .select("*", { count: "exact", head: true })
                .eq("room_id", room.id);

            // Get follower/fan count
            const { count: followers } = await supabase
                .from("subscriptions")
                .select("*", { count: "exact", head: true })
                .eq("creator_id", user!.id)
                .eq("status", "active");

            // Get wallet balance as earned
            const { data: wallet } = await supabase
                .from("wallets")
                .select("balance")
                .eq("user_id", user!.id)
                .single();

            setStats({
                fans: followers || 0,
                confessions: reqCount || 0,
                earned: wallet?.balance || 0,
            });
        }

        fetchStats();

        // Subscribe to wallet changes
        const channel = supabase
            .channel("creator-wallet-topbar")
            .on("postgres_changes" as any, {
                event: "UPDATE",
                schema: "public",
                table: "wallets",
                filter: `user_id=eq.${user.id}`,
            }, (payload: any) => {
                if (payload.new?.balance !== undefined) {
                    setStats(prev => ({ ...prev, earned: payload.new.balance }));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    return (
        <div className="flex items-center justify-between px-6 py-3">
            <button
                onClick={() => router.push("/home")}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back</span>
            </button>
            <h1 className="conf-font-pacifico pl-40 text-4xl text-white tracking-wide">Confession Room</h1>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 conf-text-primary fill-current" />
                    <span className="text-white font-medium">Fans.</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-lg">{stats.confessions}</span>
                    <span className="text-white/60">Confessions.</span>
                </div>
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 conf-text-gold" />
                    <span className="conf-text-gold font-bold text-xl">${stats.earned.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default ConfessionsTopBar;
