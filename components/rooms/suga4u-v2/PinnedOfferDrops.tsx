import React, { useState, useEffect } from "react";
import { useSuga4U } from "@/hooks/useSuga4U";

const PinnedOfferDrops = ({ roomId }: { roomId: string | null }) => {
    const { offers, claimOffer } = useSuga4U(roomId);

    const formatMMSS = (totalMs: number) => {
        const s = Math.max(0, Math.floor(totalMs / 1000));
        const mm = String(Math.floor(s / 60)).padStart(2, "0");
        const ss = String(s % 60).padStart(2, "0");
        return { mm, ss };
    };

    return (
        <div className="glass-panel p-3 bg-transparent border-gold/20">
            <div className="flex items-center justify-center mb-3">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3">Pinned Offer Drops</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>

            {offers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No active offer drops.</p>
            ) : offers.map((o) => {
                const now = Date.now();
                const timeLeft = Math.max(0, o.endsAt - now);
                const { mm, ss } = formatMMSS(timeLeft);
                const ended = timeLeft <= 0 || o.slotsRemaining <= 0;

                return (
                    <div key={o.id} className="glass-panel neon-border-pink p-4 bg-transparent mb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span>👑</span>
                            <span className="font-bold text-sm tracking-tight">{o.title}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            {[mm, "22", ss].map((val, i) => (
                                <div key={i} className="flex items-center gap-1">
                                    <span className="bg-muted px-2 py-1 rounded font-bold text-lg font-mono text-gold">{val}</span>
                                    {i < 2 && <span className="text-pink font-bold">:</span>}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground text-center mb-2">✓ Slots Left: {o.slotsRemaining}/{o.totalSlots}</p>
                        <button
                            onClick={() => !ended && claimOffer(o.id)}
                            disabled={ended}
                            className={`w-full py-2 text-sm font-bold tracking-wider uppercase ${ended ? "bg-gray-700 cursor-not-allowed text-gray-400" : "btn-gold"}`}
                        >
                            {ended ? "OFFER ENDED" : `UNLOCK $${o.price}`}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default PinnedOfferDrops;
