import creatorImg from "@/assets/creator-spotlight.jpg";

const CreatorSpotlight = () => {
  const progress = (180 / 250) * 100;

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold tracking-wide">Creator Spotlight</h2>
        <span className="px-2.5 py-0.5 rounded-full bg-destructive/80 text-xs font-bold text-primary-foreground animate-pulse-glow">
          LIVE
        </span>
      </div>

      <div className="relative rounded-lg overflow-hidden aspect-[4/3]">
        <img src={creatorImg} alt="Creator" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Countdown</span>
          <span className="text-muted-foreground">
            <span className="gold-text font-bold">$180</span> / $250 Goal
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full gradient-pink progress-bar-glow transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {[5, 10, 25].map((amount) => (
          <button
            key={amount}
            className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-semibold transition-colors border border-border hover:border-primary/50"
          >
            <span className="gold-text">+${amount}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary">
          🔒 Anonymous
        </span>
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary">
          🔒 <span className="text-primary">Anonymous</span> <span className="gold-text">+$2</span>
        </span>
      </div>
    </div>
  );
};

export default CreatorSpotlight;
