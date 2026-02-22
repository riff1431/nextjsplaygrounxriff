import creatorPhoto from "@/assets/creator-photo.jpeg";

const LiveStream = () => {
  const goalCurrent = 8450;
  const goalTotal = 10000;
  const percentage = (goalCurrent / goalTotal) * 100;

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-full bg-transparent border-gold/20">
      {/* Stream View - now shows creator photo */}
      <div className="relative flex-1 min-h-[250px]">
        <img src={creatorPhoto} alt="Creator" className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/70 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-glow" />
          <span className="text-xs font-bold uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Suga Goal */}
      {/* <div className="p-3 border-t border-gold/20">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-pink">💖</span>
            <span className="section-title text-[11px]">Suga Goal</span>
          </div>
          <span className="text-sm font-bold">
            <span className="text-pink">${goalCurrent.toLocaleString()}</span>
            <span className="text-muted-foreground"> / ${goalTotal.toLocaleString()}</span>
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
          <div className="progress-bar-pink h-full rounded-full transition-all" style={{ width: `${percentage}%` }} />
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-1">Next Luxury Drop Unlock 👑</p>
      </div> */}
    </div>
  );
};

export default LiveStream;
