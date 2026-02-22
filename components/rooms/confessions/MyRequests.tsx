import React from 'react';

export type RequestStatus = 'pending_approval' | 'in_progress' | 'delivered' | 'completed' | 'rejected' | string;

export interface ConfessionRequest {
    id: string;
    type: 'Text' | 'Audio' | 'Video';
    amount: number;
    topic: string;
    status: RequestStatus;
    delivery_content?: string;
    created_at: string;
}

interface MyRequestsProps {
    requests: any[];
    setReviewRequest: (req: any) => void;
}

const MyRequests: React.FC<MyRequestsProps> = ({ requests, setReviewRequest }) => {
    return (
        <div className="neon-glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-xs font-semibold tracking-wide">My Requests</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">🔒 Anonymous</span>
                </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
                {requests.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-4 italic">No active requests</div>
                )}
                {requests.map((req, i) => (
                    <div key={req.id || i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border/50">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs">👤</div>
                            <div>
                                <p className="text-xs font-medium truncate max-w-[120px] text-foreground">{req.topic}</p>
                                <p className="text-[10px] text-muted-foreground capitalize">{req.status.replace('_', ' ')}</p>
                            </div>
                        </div>
                        {req.status === 'delivered' ? (
                            <button
                                onClick={() => setReviewRequest(req)}
                                className="px-2.5 py-1 rounded-md gradient-pink text-[10px] text-primary-foreground font-semibold border border-transparent shadow-[0_0_10px_rgba(255,42,109,0.3)] hover:opacity-90 transition-all">
                                Review
                            </button>
                        ) : (
                            <button className="px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold border border-border transition-colors cursor-default">
                                <span className="gold-text">${req.amount}</span>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Gifts & Reactions */}
            <div className="space-y-2 mt-4 pt-3 border-t border-border/50">
                <span className="text-xs font-semibold">Gifts & Reactions</span>
                <div className="flex gap-1.5 flex-wrap">
                    {["🎁", "❤️", "🔥", "💎", "🌹", "👑", "💰", "⭐"].map((e, i) => (
                        <span key={i} className="cursor-pointer hover:scale-125 transition-transform text-sm grayscale opacity-70 hover:grayscale-0 hover:opacity-100">{e}</span>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border/50 mt-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">TopFan?</span>
                    <span className="text-[10px] text-muted-foreground">56 Bids · <span className="gold-text">$560</span></span>
                </div>
                <button className="px-2.5 py-1 rounded-md bg-secondary text-xs font-semibold border border-border hover:border-primary/50 transition-colors">
                    <span className="gold-text">+$50</span>
                </button>
            </div>
        </div>
    );
};

export default MyRequests;
