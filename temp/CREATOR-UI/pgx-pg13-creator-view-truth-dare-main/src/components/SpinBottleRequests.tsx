const requests = [
  { user: "Fan123", text: "Kiks someone in chat" },
  { user: "Alex99", text: "Truth about your first crush" },
  { user: "CoolGam", text: "Dare: Sing a love song" },
  { user: "SweetHeart", text: "Massage your neck" },
  { user: "GamerJoe", text: "Lick whipped cream off" },
];

const SpinBottleRequests = () => (
  <div className="panel-bg rounded-xl neon-border-pink p-4 flex flex-col h-full">
    <h3 className="font-bold text-foreground mb-3">Spin the Bottle Requests</h3>
    <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
      {requests.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0">
            <div className="w-full h-full bg-gradient-to-br from-primary to-secondary rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">{r.user}</p>
            <p className="text-xs text-muted-foreground truncate">{r.text}</p>
          </div>
          <button className="px-2.5 py-1 text-xs rounded border border-muted-foreground/30 text-muted-foreground font-semibold hover:opacity-80 transition-opacity flex-shrink-0">
            Edit Topics
          </button>
        </div>
      ))}
    </div>
    <div className="flex justify-center gap-1.5 mt-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? "bg-neon-pink" : "bg-muted"}`} />
      ))}
    </div>
  </div>
);

export default SpinBottleRequests;
