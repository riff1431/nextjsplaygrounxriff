const quickRequests = [
    { name: "Pose", price: 15, emoji: "📸" },
    { name: "Shoutout", price: 25, emoji: "✏️" },
    { name: "Quick Tease", price: 40, emoji: "💋" },
    { name: "Custom Clip", price: 80, emoji: "📧" },
];

const PaidRequestMenu = () => (
    <div className="glass-panel p-3">
        <div className="flex items-center justify-center mb-3">
            <div className="h-px flex-1 bg-gold/30" />
            <span className="section-title px-3">Paid Request Menu</span>
            <div className="h-px flex-1 bg-gold/30" />
        </div>
        {/* <input
      type="text"
      placeholder="Type your request..."
      className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none border border-gold/20 focus:border-pink/50 transition-colors mb-3"
    /> */}
        <div className="grid grid-cols-2 gap-2">
            {quickRequests.map((r) => (
                <button key={r.name} className="neon-border-pink glass-panel py-2 px-3 text-center hover:bg-muted/50 transition-colors">
                    <span className="text-xs">{r.emoji} {r.name}</span>
                    <p className="text-pink font-bold text-sm">${r.price}</p>
                </button>
            ))}
        </div>
    </div>
);

export default PaidRequestMenu;
