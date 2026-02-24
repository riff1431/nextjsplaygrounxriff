"use client";

import React from "react";

const packages = [
    { price: 5, votes: 5 },
    { price: 10, votes: 15, popular: true },
    { price: 25, votes: 50 },
    { price: 50, votes: 150 },
];

const BuyVotes = () => {
    return (
        <div className="w-full">
            <h2 className="font-display text-lg md:text-xl font-bold text-center tracking-widest neon-text text-foreground mb-2">
                💖 BUY VOTES 💖
            </h2>
            <div className="grid grid-cols-4 gap-2">
                {packages.map((pkg) => (
                    <div
                        key={pkg.price}
                        className={`bg-card/20 backdrop-blur-sm border rounded-lg p-2 md:p-3 text-center transition-all hover:scale-105 cursor-pointer ${pkg.popular
                                ? "border-primary neon-border"
                                : "border-border neon-border-accent"
                            }`}
                    >
                        <div className="font-display text-xl md:text-2xl font-black text-foreground">
                            ${pkg.price}
                        </div>
                        <div className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider mb-1.5">
                            {pkg.votes} Votes
                        </div>
                        <button
                            className={`w-full py-1 rounded-md font-display font-bold tracking-wider text-xs transition-all ${pkg.popular
                                    ? "bg-primary text-primary-foreground hover:brightness-110"
                                    : "bg-secondary text-secondary-foreground border border-border hover:bg-primary hover:text-primary-foreground"
                                }`}
                        >
                            BUY
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BuyVotes;
