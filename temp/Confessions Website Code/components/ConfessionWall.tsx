import { Users, Heart } from "lucide-react";

interface ConfessionCardProps {
  text: string;
  author: string;
  amount: number;
  goal: number;
  fans: number;
  topFans: string[];
}

const ConfessionCard = ({ text, author, amount, goal, fans, topFans }: ConfessionCardProps) => {
  const progress = (amount / goal) * 100;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed flex-1">"{text}"</p>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground">{author}</span>
          <span className="gold-text text-xs font-bold">$8</span>
          <Heart className="w-3.5 h-3.5 text-primary fill-primary" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          {fans} Fans contributed <span className="font-bold text-foreground">{fans}</span>
        </div>
        <span className="gold-text font-display text-lg font-bold">${amount}</span>
      </div>

      <div className="space-y-1">
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gold progress-bar-glow transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-end text-xs text-muted-foreground">
          al{amount > 100 ? 'l' : ''} / ${goal}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold">Top's Fans</span>
          {topFans.map((fan, i) => (
            <span key={i} className="text-muted-foreground">{fan}</span>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[5, 10, 225].map((val) => (
            <button
              key={val}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-semibold transition-colors border border-border hover:border-primary/50"
            >
              <span className="gold-text">+${val > 100 ? val : val}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ConfessionWall = () => {
  const confessions = [
    {
      text: "I have a dirty secret about my ex that I've never told anyone...",
      author: "AeplanBeat",
      amount: 325,
      goal: 400,
      fans: 51,
      topFans: ["AngalBand", "Beclet +$40"],
    },
    {
      text: "I'm hiding a shocking truth about my best friend.",
      author: "AgreesMinter",
      amount: 280,
      goal: 560,
      fans: 37,
      topFans: ["Norved Go!", "Bocier $440"],
    },
  ];

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold tracking-wide">Confession Wall</h2>
        <div className="flex gap-1">
          {["❤️", "🔥", "👀", "💀", "😈", "💋"].map((e, i) => (
            <span key={i} className="text-sm cursor-pointer hover:scale-125 transition-transform">{e}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>Current Pot <span className="gold-text font-display font-bold text-base">$265</span></span>
        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">Receive Goal</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 41 Fans Contributed</span>
        <span>$ Audio / $400</span>
      </div>

      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="font-semibold">Gifts & Reactions</span>
        {["🎁", "👏", "❤️", "🔥", "💎", "🌹", "👑", "💰"].map((e, i) => (
          <span key={i} className="cursor-pointer hover:scale-125 transition-transform text-sm">{e}</span>
        ))}
        <span className="text-primary text-xs">Tell More $510</span>
      </div>

      <div className="space-y-3">
        {confessions.map((c, i) => (
          <ConfessionCard key={i} {...c} />
        ))}
      </div>

      {/* Follow-Up Question Bidding */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xs font-semibold tracking-wide">Follow-Up Question Bidding</h3>
          <span className="gold-text text-xs font-bold">$1</span>
        </div>

        <div className="glass-card p-3 space-y-2">
          <p className="text-sm">Who was it? Did/Do you miss them?</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>TopFand? · 56 Fans bids +$25</span>
            <button className="px-3 py-1.5 rounded-md gradient-pink text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity">
              Bid Now $50
            </button>
          </div>
        </div>

        {[
          { user: "TopFand?", bids: "56 Fans bids", amount: "+$25" },
          { user: "NeonDreamer", bids: "42 Fans bids", amount: "+$15" },
          { user: "BlurredFant1", bids: "38 Fans bids", amount: "+$25" },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{item.user}</span>
              <span className="text-xs text-muted-foreground">{item.bids}</span>
            </div>
            <button className="px-3 py-1 rounded-md bg-secondary text-xs font-semibold border border-border hover:border-primary/50 transition-colors">
              <span className="gold-text">{item.amount}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfessionWall;
