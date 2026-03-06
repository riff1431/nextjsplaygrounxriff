"use client";

import { Clock } from "lucide-react";

interface RecentRoom {
    id: string;
    title: string | null;
    type: string | null;
    status: string;
    created_at: string;
}

interface CsRecentRoomHistoryProps {
    rooms: RecentRoom[];
    isLoading?: boolean;
}

const statusColors: Record<string, string> = {
    live: "bg-green-500/20 text-green-400",
    offline: "bg-yellow-500/20 text-yellow-400",
    ended: "bg-white/10 text-white/50",
};

export const CsRecentRoomHistory = ({ rooms, isLoading }: CsRecentRoomHistoryProps) => {
    return (
        <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
                <Clock size={20} className="text-white/50" /> Recent Room History
            </h2>
            {isLoading ? (
                <div className="cs-glass-card px-4 py-6 text-center text-white/40 text-sm">
                    Loading rooms...
                </div>
            ) : rooms.length === 0 ? (
                <div className="cs-glass-card px-4 py-6 text-center text-white/40 text-sm">
                    No rooms yet. Create your first room from the Creator Studio above!
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {rooms.map((room) => {
                        const date = new Date(room.created_at).toLocaleDateString();
                        const statusClass = statusColors[room.status] || statusColors.ended;

                        return (
                            <div key={room.id} className="cs-glass-card px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-sm text-white">{room.title || "Untitled Room"}</p>
                                    <p className="text-xs text-white/50">{room.type || "unknown"} · {date}</p>
                                </div>
                                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md ${statusClass}`}>
                                    {room.status}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
