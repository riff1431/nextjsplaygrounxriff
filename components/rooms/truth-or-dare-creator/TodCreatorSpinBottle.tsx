"use client";

const spinBottleRequests = [
    { user: "Fan123", text: "Kiss someone in chat" },
    { user: "Alex99", text: "Truth about your first crush" },
    { user: "CoolGam", text: "Dare: Sing a love song" },
    { user: "SweetHeart", text: "Massage your neck" },
    { user: "GamerJoe", text: "Lick whipped cream off" },
];

const TodCreatorSpinBottle = () => (
    <div className="tod-creator-panel-bg rounded-xl tod-creator-neon-border-pink p-4 flex flex-col h-full">
        <h3 className="font-bold text-white mb-3">Spin the Bottle Requests</h3>
        <div className="space-y-3 flex-1 overflow-y-auto min-h-0">
            {spinBottleRequests.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0">
                        <div className="w-full h-full bg-gradient-to-br from-pink-500 to-blue-500 rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white">{r.user}</p>
                        <p className="text-xs text-white/60 truncate">{r.text}</p>
                    </div>
                    <button className="px-2.5 py-1 text-xs rounded border border-white/20 text-white/60 font-semibold hover:opacity-80 transition-opacity flex-shrink-0">
                        Edit Topics
                    </button>
                </div>
            ))}
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? "tod-creator-bg-neon-pink" : "bg-white/15"}`} />
            ))}
        </div>
    </div>
);

export default TodCreatorSpinBottle;
