import React from "react";
import { Monitor } from "lucide-react";

interface CreatorCardProps {
    username: string;
    tier: string;
    price?: string;
}

const CreatorCard = ({ username, tier, price }: CreatorCardProps) => {
    return (
        <div className="glass-card-inner p-4 flex-1 flex flex-col gap-3">
            <h3 className="text-gold-light font-display text-center text-sm md:text-base">
                @{username} · {tier}
            </h3>
            <div className="bg-muted/50 rounded aspect-video flex items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Monitor size={16} />
                    <span>Creator stream (preview)</span>
                </div>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground glass-card-inner px-3 py-1">
                    @{username} · {tier}
                </span>
                {price && (
                    <span className="text-xs text-gold glass-card-inner px-3 py-1">
                        {price}
                    </span>
                )}
            </div>
        </div>
    );
};

export default CreatorCard;
