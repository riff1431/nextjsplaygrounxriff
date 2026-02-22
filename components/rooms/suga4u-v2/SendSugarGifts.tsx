const gifts = [
    { amount: 10, emoji: "💎" },
    { amount: 25, emoji: "💎" },
    { amount: 50, emoji: "💎" },
    { amount: 100, emoji: "💰" },
];

const SendSugarGifts = () => (
    <div className="glass-panel p-3">
        <div className="flex items-center justify-center mb-3">
            <div className="h-px flex-1 bg-gold/30" />
            <span className="section-title px-3">Send Sugar Gifts</span>
            <div className="h-px flex-1 bg-gold/30" />
        </div>
        <div className="grid grid-cols-4 gap-2 mb-2">
            {gifts.map((g) => (
                <button key={g.amount} className="neon-border-pink glass-panel py-3 text-center hover:bg-muted/50 transition-colors">
                    <span className="text-lg">{g.emoji}</span>
                    <p className="text-foreground font-bold text-sm">${g.amount}</p>
                </button>
            ))}
        </div>
        {/* <button className="w-full btn-pink py-2 text-sm glow-pink">👑 Send Gift</button> */}
    </div>
);

export default SendSugarGifts;
