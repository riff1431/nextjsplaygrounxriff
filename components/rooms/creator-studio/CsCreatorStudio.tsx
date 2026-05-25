"use client";

import { useEffect, useState } from "react";
import { Upload, MessageSquare, Monitor, Zap, Tv, Gamepad2, Heart, Trophy, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface StudioCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    borderColor: string;
    comingSoon?: boolean;
    veryNew?: boolean;
    link?: string;
    roomType?: string;
}

const StudioCard = ({ icon, title, description, borderColor, comingSoon, veryNew, link, isInactive, kycLocked }: StudioCardProps & { isInactive?: boolean; kycLocked?: boolean }) => {
    const router = useRouter();
    const isDisabled = isInactive || kycLocked;

    return (
        <div
            onClick={() => {
                if (kycLocked) {
                    toast.info("🔒 Complete ID verification to unlock this room.", { duration: 3000 });
                    return;
                }
                if (!isInactive && link) {
                    router.push(link);
                }
            }}
            className={`cs-glass-card p-4 flex items-start gap-3 transition-all group relative ${(!isDisabled && link) ? 'hover:bg-white/10 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
            style={{ 
                borderLeftColor: isDisabled ? "rgba(255,255,255,0.15)" : borderColor, 
                borderLeftWidth: "3px" 
            }}
        >
            <div className="shrink-0 mt-0.5" style={{ color: isDisabled ? "rgba(255,255,255,0.3)" : borderColor }}>{icon}</div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-white">{title}</h3>
                        {comingSoon && (
                            <span className="cs-coming-soon-badge">Coming Soon</span>
                        )}
                        {veryNew && (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[hsl(330,90%,55%)] text-white shadow-[0_0_8px_hsl(330,90%,55%,0.6)]">Very New</span>
                        )}
                    </div>
                    {isInactive && !kycLocked && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/30 text-red-400">Disabled</span>
                    )}
                    {kycLocked && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-950/40 border border-yellow-900/30 text-yellow-400 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> KYC Pending
                        </span>
                    )}
                </div>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">{description}</p>
            </div>
        </div>
    );
};

export const CsCreatorStudio = ({ kycLocked }: { kycLocked?: boolean }) => {
    const [activeStatuses, setActiveStatuses] = useState<Record<string, boolean>>({});
    const supabase = createClient();

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from("room_settings")
                .select("room_type, is_active");
            if (!error && data) {
                const mapped = data.reduce((acc, s) => {
                    acc[s.room_type] = s.is_active;
                    return acc;
                }, {} as Record<string, boolean>);
                setActiveStatuses(mapped);
            }
        };

        fetchSettings();

        // Realtime subscription
        const channel = supabase
            .channel("realtime-room-settings-creator-studio")
            .on("postgres_changes", { event: "*", schema: "public", table: "room_settings" }, (payload) => {
                const updated = payload.new as { room_type: string; is_active: boolean };
                if (updated && updated.room_type) {
                    setActiveStatuses((prev) => ({
                        ...prev,
                        [updated.room_type]: updated.is_active,
                    }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const cards: StudioCardProps[] = [
        { icon: <MessageSquare size={20} />, title: "Confessions Studio", description: "Manage backlog, publish text/voice/video confessions.", borderColor: "hsl(45, 100%, 55%)", link: "/rooms/confessions-creator", roomType: "confessions" },
        { icon: <Monitor size={20} />, title: "X Chat Console", description: "Moderate live chat, set slow mode, answer priority DMs.", borderColor: "hsl(280, 100%, 65%)", link: "/rooms/x-chat-creator", roomType: "x-chat" },
        { icon: <Zap size={20} />, title: "Flash Drops", description: "Schedule limited time drops, monitor sales.", borderColor: "hsl(0, 90%, 55%)", link: "/rooms/flash-drop-creator", roomType: "flash-drop" },
        { icon: <Tv size={20} />, title: "Bar Lounge", description: "Manage VIP tables and drink menu.", borderColor: "hsl(320, 100%, 60%)", link: "/rooms/bar-lounge-creator", roomType: "bar-lounge" },
        { icon: <Gamepad2 size={20} />, title: "Truth or Dare", description: "Control camera slots, prompt queue.", borderColor: "hsl(180, 100%, 50%)", link: "/rooms/truth-or-dare-creator", roomType: "truth-or-dare" },
        { icon: <Heart size={20} />, title: "Suga 4 U", description: "Manage sponsorships and badge tiers.", borderColor: "hsl(25, 100%, 55%)", link: "/rooms/suga4u-creator", roomType: "suga-4-u" },
        { icon: <Trophy size={20} />, title: "Competition Manager", description: "Create battles, manage brackets & prizes.", borderColor: "hsl(330, 90%, 60%)", link: "/coming-soon", roomType: "competition" },
    ];

    return (
        <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                <span className="cs-neon-text-pink">✦</span> Creator Studio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {cards.map((card) => {
                    const isInactive = card.roomType ? activeStatuses[card.roomType] === false : false;
                    return <StudioCard key={card.title} {...card} isInactive={isInactive} kycLocked={kycLocked} />;
                })}
            </div>
        </div>
    );
};
