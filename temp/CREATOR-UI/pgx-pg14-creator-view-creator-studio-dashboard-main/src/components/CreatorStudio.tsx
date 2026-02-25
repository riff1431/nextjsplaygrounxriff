import { Upload, MessageSquare, Monitor, Zap, Tv, Gamepad2, Heart, Trophy } from "lucide-react";

interface StudioCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  borderColor: string;
  comingSoon?: boolean;
}

const StudioCard = ({ icon, title, description, borderColor, comingSoon }: StudioCardProps) => (
  <div
    className={`glass-card p-4 flex items-start gap-3 hover:bg-secondary/30 transition-all cursor-pointer group relative`}
    style={{ borderLeftColor: borderColor, borderLeftWidth: "3px" }}
  >
    <div className="shrink-0 mt-0.5" style={{ color: borderColor }}>{icon}</div>
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-sm">{title}</h3>
        {comingSoon && <span className="coming-soon-badge">Coming Soon</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
    </div>
  </div>
);

export const CreatorStudio = () => {
  const cards: StudioCardProps[] = [
    { icon: <Upload size={20} />, title: "Upload Content", description: "Post new photos, videos, status updates to your feed.", borderColor: "hsl(150, 80%, 45%)" },
    { icon: <MessageSquare size={20} />, title: "Confessions Studio", description: "Manage backlog, publish text/voice/video confessions.", borderColor: "hsl(45, 100%, 55%)" },
    { icon: <Monitor size={20} />, title: "X Chat Console", description: "Moderate live chat, set slow mode, answer priority DMs.", borderColor: "hsl(280, 100%, 65%)", comingSoon: true },
    { icon: <Zap size={20} />, title: "Flash Drops", description: "Schedule limited time drops, monitor sales.", borderColor: "hsl(0, 90%, 55%)", comingSoon: true },
    { icon: <Tv size={20} />, title: "Bar Lounge (Host)", description: "Manage VIP tables and drink menu.", borderColor: "hsl(320, 100%, 60%)" },
    { icon: <Gamepad2 size={20} />, title: "Truth or Dare", description: "Control camera slots, prompt queue.", borderColor: "hsl(180, 100%, 50%)" },
    { icon: <Heart size={20} />, title: "Suga 4 U", description: "Manage sponsorships and badge tiers.", borderColor: "hsl(25, 100%, 55%)", comingSoon: true },
    { icon: <Trophy size={20} />, title: "Competition Manager", description: "Create battles, manage brackets & prizes.", borderColor: "hsl(0, 90%, 55%)", comingSoon: true },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span className="text-neon-pink">✦</span> Creator Studio
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <StudioCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
};
