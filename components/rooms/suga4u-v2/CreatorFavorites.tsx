const categories = [
    { label: "CUTE", emoji: "🎀" },
    { label: "LUXURT", emoji: "💎" },
    { label: "DREAM", emoji: "👑" },
];

const favorites = [
    { name: "Lv Bag", emoji: "💖", price: 2500, reveal: 15 },
    { name: "Diamond Set +", emoji: "💎", price: 3500, reveal: 25 },
    // { name: "iPhone Pro Max", emoji: "📱", price: 1599, reveal: null },
    { name: "Bedroom Vibes", emoji: "🌹", price: 1599, reveal: null },
];

const CreatorFavorites = () => (
    <div className="glass-panel flex flex-col h-full bg-transparent border-gold/20">
        <div className="flex items-center justify-center p-3 border-b border-gold/20">
            <div className="h-px flex-1 bg-gold/30" />
            <span className="section-title px-3">Creator Favorites</span>
            <div className="h-px flex-1 bg-gold/30" />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 p-3 pb-0">
            {categories.map((c) => (
                <button key={c.label} className="flex-1 bg-muted/50 border border-gold/20 rounded-full px-1 py-1.5 text-[11px] font-bold tracking-wider hover:border-pink/50 transition-colors">
                    {c.emoji} {c.label}
                </button>
            ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {favorites.map((item) => (
                <div key={item.name} className="flex items-center gap-3 glass-panel neon-border-pink p-1 bg-transparent">
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                        {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{item.name} {item.emoji}</p>
                        <p className="text-gold font-bold text-xs">${item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                        {item.reveal && (
                            <button className="btn-pink px-3 py-1 text-[10px] rounded-full">REVEAL ${item.reveal}</button>
                        )}
                        <button className="btn-gold px-3 py-1 text-[10px] rounded-full">BUY FOR HER</button>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default CreatorFavorites;
