const actions = [
  { name: "Say My Name", price: 20, emoji: "💋" },
  { name: "Sponsor Room", price: 100, emoji: "💎" },
  { name: "Voice Note", price: 35, emoji: "🎙️" },
  { name: "Photo Drop", price: 45, emoji: "📸" },
  { name: "Private 1-on-1", price: 500, emoji: "👑", full: true },
];

const QuickPaidActions = () => (
  <div className="glass-panel p-3">
    {/* <div className="flex items-center justify-center mb-3">
      <div className="h-px flex-1 bg-gold/30" />
      <span className="section-title px-3">Quick Paid Actions</span>
      <div className="h-px flex-1 bg-gold/30" />
    </div> */}
    <div className="grid grid-cols-2 gap-2">
      {actions.filter(a => !a.full).map((a) => (
        <button key={a.name} className="neon-border-pink glass-panel py-2 px-2 text-center hover:bg-muted/50 transition-colors">
          <span className="text-[11px]">{a.emoji} {a.name}</span>
          <p className="text-pink font-bold text-sm">${a.price}</p>
        </button>
      ))}
    </div>
    {actions.filter(a => a.full).map((a) => (
      <button key={a.name} className="w-full mt-2 btn-pink py-2 text-sm glow-pink">
        {a.emoji} {a.name} <span className="font-bold">${a.price}</span>
      </button>
    ))}
  </div>
);

export default QuickPaidActions;
