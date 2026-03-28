import React from 'react';

interface CreatorSpotlightProps {
    goalTotal?: number;
    pay?: (amount: number) => void;
    isAnon?: boolean;
    setIsAnon?: (val: boolean) => void;
    liveStreamNode?: React.ReactNode;
}

const CreatorSpotlight: React.FC<CreatorSpotlightProps> = ({ liveStreamNode }) => {
    return (
        <div className="neon-glass-card p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold tracking-wide">Creator Spotlight</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-destructive/80 text-xs font-bold text-primary-foreground animate-pulse">
                    LIVE
                </span>
            </div>

            <div className="relative rounded-lg overflow-hidden aspect-[4/3]">
                {liveStreamNode || (
                    <>
                        <img src="/confessions/creator-spotlight.jpg" alt="Creator" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    </>
                )}
            </div>
        </div>
    );
};

export default CreatorSpotlight;
