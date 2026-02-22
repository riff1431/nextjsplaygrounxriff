import React from 'react';

interface CreatorSpotlightProps {
    goalTotal: number;
    pay: (amount: number) => void;
    isAnon: boolean;
    setIsAnon: (val: boolean) => void;
}

const CreatorSpotlight: React.FC<CreatorSpotlightProps> = ({ goalTotal, pay, isAnon, setIsAnon }) => {
    const progress = Math.min((goalTotal / 250) * 100, 100);

    return (
        <div className="neon-glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold tracking-wide">Creator Spotlight</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-destructive/80 text-xs font-bold text-primary-foreground animate-pulse">
                    LIVE
                </span>
            </div>

            <div className="relative rounded-lg overflow-hidden aspect-[4/3]">
                <img src="/confessions/creator-spotlight.jpg" alt="Creator" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Countdown</span>
                    <span className="text-muted-foreground">
                        <span className="gold-text font-bold">${goalTotal}</span> / $250 Goal
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
                        onClick={() => pay(amount)}
                        className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-semibold transition-colors border border-border hover:border-primary/50"
                    >
                        <span className="gold-text">+${amount}</span>
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
                <button
                    onClick={() => setIsAnon(false)}
                    className={`flex flex-1 justify-center items-center gap-1 px-3 py-2 rounded-lg transition-colors border ${!isAnon ? 'bg-primary/20 text-primary border-primary/50 text-shadow-neon' : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}`}
                >
                    👤 Public
                </button>
                <button
                    onClick={() => setIsAnon(true)}
                    className={`flex flex-1 justify-center items-center gap-1 px-3 py-2 rounded-lg transition-colors border ${isAnon ? 'bg-primary/20 text-primary border-primary/50 text-shadow-neon' : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'}`}
                >
                    🔒 Anonymous
                </button>
            </div>
        </div>
    );
};

export default CreatorSpotlight;
