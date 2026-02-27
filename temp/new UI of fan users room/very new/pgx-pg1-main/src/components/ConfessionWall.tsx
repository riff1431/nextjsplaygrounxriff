import { Users, Heart, Lock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const LockedConfessionCard = ({ text }: { text: string }) => {
  return (
    <div className="glass-card p-3 space-y-2 flex flex-col items-center text-center">
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{text}</p>
      <div className="w-14 h-14 rounded-full bg-secondary/60 border border-primary/30 flex items-center justify-center">
        <Lock className="w-7 h-7 text-primary/70" />
      </div>
      {/* <span className="text-xs font-semibold text-primary flex items-center gap-1">
        Unlock to reveal <span className="text-sm">👀</span>
      </span> */}
      <button className="w-full py-1.5 rounded-md gradient-pink text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
        <Heart className="w-3 h-3 fill-current" /> Unlock for $25
      </button>
    </div>
  );
};

const confessions = [
  "It's about something wild I did...",
  "It's about something in un unire...",
  "I'm hiding something embarrass...",
  "It's a naughty story to the might...",
  "Some arhertorim sones ah ind out...",
  "It's so hearnt ibeetr n among news?",
  "It's a naughty story to the might...",
  "Some arhertorim sones ah ind out...",
  "It's so hearnt ibeetr n among news?",
  "It's so hearnt ibeetr n among news?",
];

const ConfessionWall = () => {
  return (
    <div className="glass-card p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="font-display text-sm font-semibold tracking-wide">Confession Wall</h2>
        {/* <div className="flex gap-1">
          {["❤️", "🔥", "👀", "💀", "😈", "+"].map((e, i) => (
            <span key={i} className="text-sm cursor-pointer hover:scale-125 transition-transform">{e}</span>
          ))}
        </div> */}
      </div>

      {/* <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap shrink-0">
        <span>Current Pot <span className="gold-text font-display font-bold text-base">$265</span></span>
        <span>/ Receive Goal $400</span>
      </div> */}

      {/* <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 41 Fans contributed</span>
        <span>◇ 0 Audio</span>
        <span>◇ 0 Video</span>
      </div> */}

      <div className="flex items-center gap-2 text-xs flex-wrap shrink-0">
        <span className="font-semibold">Gifts & Reactions</span>
        {["❤️", "💜", "😜", "🔥", "⭐", "👑", "😎", "🐱"].map((e, i) => (
          <span key={i} className="cursor-pointer hover:scale-125 transition-transform text-sm">{e}</span>
        ))}
        <span className="text-primary text-xs ml-auto">Tell More $510</span>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="grid grid-cols-2 gap-3 pr-2">
          {confessions.map((text, i) => (
            <LockedConfessionCard key={i} text={text} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConfessionWall;
