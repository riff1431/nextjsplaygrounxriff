const PinnedOfferDrops = () => (
    <div className="glass-panel p-3">
        <div className="flex items-center justify-center mb-3">
            <div className="h-px flex-1 bg-gold/30" />
            <span className="section-title px-3">Pinned Offer Drops</span>
            <div className="h-px flex-1 bg-gold/30" />
        </div>

        <div className="glass-panel neon-border-pink p-4">
            <div className="flex items-center gap-2 mb-2">
                <span>👑</span>
                <span className="font-bold text-sm">VIP Private Show</span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
                {["00", "12", "48"].map((val, i) => (
                    <div key={i} className="flex items-center gap-1">
                        <span className="bg-muted px-2 py-1 rounded font-bold text-lg font-mono text-gold">{val}</span>
                        {i < 2 && <span className="text-pink font-bold">:</span>}
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mb-2">✓ Slots Left: 7/10</p>
            <button className="w-full btn-gold py-2 text-sm font-bold tracking-wider">UNLOCK $99</button>
        </div>
    </div>
);

export default PinnedOfferDrops;
