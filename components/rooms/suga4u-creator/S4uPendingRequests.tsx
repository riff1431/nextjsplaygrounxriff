"use client";

import { Diamond } from "lucide-react";

const requests = [
    { user: "SuGaFan17", amount: "$200", text: "Sexy lingerie shoot ❤️ ✨" },
    { user: "RichieBoy", amount: "$75", text: "Late night chat ✨" },
];

const S4uPendingRequests = () => {
    return (
        <div className="s4u-creator-glass-panel p-4">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3">Pending Requests</h3>
            <div className="space-y-3">
                {requests.map((req, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🌸</span>
                            <div>
                                <p className="text-sm font-semibold text-white">{req.user}</p>
                                <p className="text-xs text-white/50">{req.text}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold s4u-creator-text-gold flex items-center gap-1">
                                {req.amount} <Diamond className="w-3 h-3" />
                            </span>
                            <button className="text-xs bg-white/10 text-white/60 px-3 py-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-300 transition-colors">
                                Decline
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 bg-white/5 rounded-lg px-3 py-3">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-white">Private 1 on 1</h4>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold s4u-creator-text-gold flex items-center gap-1">
                            $300 <Diamond className="w-3 h-3" />
                        </span>
                        <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded">11:00 PM</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="text-xs bg-white/10 text-white/60 px-3 py-1.5 rounded-lg">
                        Choose Time
                    </button>
                    <button className="text-xs bg-pink-500 text-white px-3 py-1.5 rounded-lg font-semibold">
                        Accept
                    </button>
                    <button className="text-xs bg-white/10 text-white/60 px-3 py-1.5 rounded-lg">
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
};

export default S4uPendingRequests;
