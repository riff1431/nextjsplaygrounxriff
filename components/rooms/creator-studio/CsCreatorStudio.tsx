"use client";

import { Upload, MessageSquare, Monitor, Zap, Tv, Gamepad2, Heart, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";

interface StudioCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    borderColor: string;
    comingSoon?: boolean;
    veryNew?: boolean;
    link?: string;
}

const StudioCard = ({ icon, title, description, borderColor, comingSoon, veryNew, link }: StudioCardProps) => {
    const router = useRouter();

    return (
        <div
            onClick={() => link && router.push(link)}
            className={`cs-glass-card p-4 flex items-start gap-3 transition-all group relative ${link ? 'hover:bg-white/10 cursor-pointer' : 'opacity-80'}`}
            style={{ borderLeftColor: borderColor, borderLeftWidth: "3px" }}
        >
            <div className="shrink-0 mt-0.5" style={{ color: borderColor }}>{icon}</div>
            <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm text-white">{title}</h3>
                    {comingSoon && (
                        <span className="cs-coming-soon-badge">Coming Soon</span>
                    )}
                    {veryNew && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[hsl(330,90%,55%)] text-white shadow-[0_0_8px_hsl(330,90%,55%,0.6)]">Very New</span>
                    )}
                </div>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">{description}</p>
            </div>
        </div>
    );
};

export const CsCreatorStudio = () => {
    const cards: StudioCardProps[] = [

        { icon: <MessageSquare size={20} />, title: "Confessions Studio", description: "Manage backlog, publish text/voice/video confessions.", borderColor: "hsl(45, 100%, 55%)", link: "/rooms/confessions-creator" },
        { icon: <Monitor size={20} />, title: "X Chat Console", description: "Moderate live chat, set slow mode, answer priority DMs.", borderColor: "hsl(280, 100%, 65%)", link: "/rooms/x-chat-creator" },
        { icon: <Zap size={20} />, title: "Flash Drops", description: "Schedule limited time drops, monitor sales.", borderColor: "hsl(0, 90%, 55%)", link: "/rooms/flash-drop-creator" },
        { icon: <Tv size={20} />, title: "Bar Lounge", description: "Manage VIP tables and drink menu.", borderColor: "hsl(320, 100%, 60%)", link: "/rooms/bar-lounge-creator" },
        { icon: <Gamepad2 size={20} />, title: "Truth or Dare", description: "Control camera slots, prompt queue.", borderColor: "hsl(180, 100%, 50%)", link: "/rooms/truth-or-dare-creator" },
        { icon: <Heart size={20} />, title: "Suga 4 U", description: "Manage sponsorships and badge tiers.", borderColor: "hsl(25, 100%, 55%)", link: "/rooms/suga4u-creator" },
        { icon: <Trophy size={20} />, title: "Competition Manager", description: "Create battles, manage brackets & prizes.", borderColor: "hsl(330, 90%, 60%)", link: "/coming-soon" },
    ];

    return (
        <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                <span className="cs-neon-text-pink">✦</span> Creator Studio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map((card) => (
                    <StudioCard key={card.title} {...card} />
                ))}
            </div>
        </div>
    );
};
