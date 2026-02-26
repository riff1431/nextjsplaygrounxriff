"use client";

const topics = [
    { name: "Short Skirts", votes: 182 },
    { name: "Wet T-Shirt", votes: 244 },
    { name: "School Teacher", votes: 199 },
    { name: "Cheer Captain", votes: 155 },
];

const FcTopicVotingCard = () => (
    <div className="fc-glass-card fc-neon-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-white">Topic Voting</h2>
            <span className="fc-neon-badge text-[10px] px-3 py-1 rounded-full font-semibold uppercase">
                Voting Closed
            </span>
        </div>
        <p className="text-xs text-white/60 mb-4">
            Fans vote in advance. Admin locks and selects the winner 2 day before the event at 10:00 PM.
        </p>
        <div className="grid grid-cols-2 gap-3">
            {topics.map((t) => (
                <div key={t.name} className="flex items-center justify-between fc-glass-card rounded-md px-4 py-3 border border-white/20">
                    <div>
                        <p className="text-white font-medium text-sm">{t.name}</p>
                    </div>
                    <p className="fc-text-primary text-xs">{t.votes} votes</p>
                </div>
            ))}
        </div>
    </div>
);

export default FcTopicVotingCard;
