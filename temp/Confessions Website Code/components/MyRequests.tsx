const MyRequests = () => {
  const requests = [
    { title: "8d Love angel makeover!", price: "$10", bids: "80 bends 4" },
    { title: "Grand queenac nights", price: "$00", bids: "For BlundBet" },
  ];

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-semibold tracking-wide">My Requests</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>$ 2</span>
          <span className="flex items-center gap-1">🔒 Anonymous</span>
        </div>
      </div>

      <div className="space-y-2">
        {requests.map((req, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs">👤</div>
              <div>
                <p className="text-xs font-medium truncate max-w-[120px]">{req.title}</p>
                <p className="text-[10px] text-muted-foreground">{req.bids}</p>
              </div>
            </div>
            <button className="px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold border border-border hover:border-primary/50 transition-colors">
              <span className="gold-text">+{i === 0 ? "$10" : "$25"}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Gifts & Reactions */}
      <div className="space-y-2">
        <span className="text-xs font-semibold">Gifts & Reactions</span>
        <div className="flex gap-1.5 flex-wrap">
          {["🎁", "❤️", "🔥", "💎", "🌹", "👑", "💰", "⭐"].map((e, i) => (
            <span key={i} className="cursor-pointer hover:scale-125 transition-transform text-sm">{e}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">TopFand?</span>
          <span className="text-[10px] text-muted-foreground">56. 2 bid betmy <span className="gold-text">$560</span></span>
        </div>
        <button className="px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold border border-border hover:border-primary/50 transition-colors">
          <span className="gold-text">+$50</span>
        </button>
      </div>
    </div>
  );
};

export default MyRequests;
