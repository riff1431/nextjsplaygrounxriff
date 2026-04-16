import { Heart, DollarSign, Users, Clock, TrendingUp, Gift } from "lucide-react";

const stats = [
  { icon: DollarSign, label: "Total Earned", value: "€2,450" },
  { icon: Users, label: "Viewers", value: "1,247" },
  { icon: Clock, label: "Duration", value: "2h 34m" },
  { icon: TrendingUp, label: "Peak Viewers", value: "892" },
  { icon: Gift, label: "Tips Received", value: "38" },
  { icon: Heart, label: "Likes", value: "4,521" },
];

const SessionSummary = () => {
  return (
    <div className="glass-panel p-4">
      <h3 className="font-display text-lg font-bold text-foreground mb-3">Summary</h3>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stats.map((stat, i) => (
          <div key={i} className="bg-muted/30 rounded-lg p-2 flex items-center gap-2">
            <stat.icon className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              <p className="text-xs font-bold text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
      {/* <div className="flex gap-2">
        <button className="flex-1 text-sm bg-primary text-primary-foreground px-3 py-2 rounded-lg font-semibold hover:bg-primary/80 transition-colors">
          Start Session
        </button>
        <button className="flex-1 text-sm bg-muted/50 text-muted-foreground px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors">
          Stop Session
        </button>
      </div> */}
    </div>
  );
};

export default SessionSummary;
