"use client";

import { Clock } from "lucide-react";

interface RoomEntry {
    name: string;
    type: string;
    date: string;
    status: string;
}

export const CsRecentRoomHistory = () => {
    const rooms: RoomEntry[] = [
        { name: "test baba", type: "bar lounge", date: "2/19/2026", status: "ENDED" },
        { name: "test mofiz", type: "bar lounge", date: "2/20/2026", status: "ENDED" },
        { name: "test twenty", type: "bar lounge", date: "2/20/2026", status: "ENDED" },
        { name: "xxxc", type: "bar lounge", date: "2/19/2026", status: "ENDED" },
        { name: "oookok", type: "bar lounge", date: "2/19/2026", status: "ENDED" },
        { name: "test tiears", type: "bar lounge", date: "2/19/2026", status: "ENDED" },
    ];

    return (
        <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                <Clock size={20} className="text-white/50" /> Recent Room History
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rooms.map((room, i) => (
                    <div key={i} className="cs-glass-card px-4 py-3 flex items-center justify-between">
                        <div>
                            <p className="font-bold text-sm text-white">{room.name}</p>
                            <p className="text-xs text-white/50">{room.type} · {room.date}</p>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-md text-white/50">
                            {room.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
