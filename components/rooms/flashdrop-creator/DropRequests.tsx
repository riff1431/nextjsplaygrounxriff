"use client";

import { useState } from "react";

interface DropRequest {
    id: number;
    fanName: string;
    request: string;
    status: "pending" | "accepted" | "declined";
}

const initialRequests: DropRequest[] = [
    { id: 1, fanName: "NightOwl23", request: "Exclusive photo set", status: "pending" },
    { id: 2, fanName: "StarGazer", request: "Behind the scenes", status: "pending" },
    { id: 3, fanName: "LunaFan99", request: "Custom shoutout", status: "pending" },
    { id: 4, fanName: "VelvetKing", request: "Live session clip", status: "pending" },
];

const DropRequests = ({ className = "" }: { className?: string }) => {
    const [requests, setRequests] = useState<DropRequest[]>(initialRequests);

    const handleAction = (id: number, action: "accepted" | "declined") => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: action } : r))
        );
    };

    return (
        <div className={`glass-panel rounded-xl p-4 flex flex-col min-h-0 ${className}`}>
            <h2 className="font-display text-lg font-bold neon-text mb-3 tracking-wider shrink-0">
                Drop Requests
            </h2>
            <div className="flex-1 overflow-y-auto themed-scrollbar min-h-0 rounded-lg">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left py-2 px-2 font-display text-xs text-muted-foreground tracking-wider">
                                Fan Name
                            </th>
                            <th className="text-left py-2 px-2 font-display text-xs text-muted-foreground tracking-wider">
                                Request
                            </th>
                            <th className="text-center py-2 px-2 font-display text-xs text-muted-foreground tracking-wider">
                                Accept or Decline
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => (
                            <tr key={req.id} className="border-b border-border/50">
                                <td className="py-2.5 px-2 font-semibold text-foreground">
                                    {req.fanName}
                                </td>
                                <td className="py-2.5 px-2 text-muted-foreground">
                                    {req.request}
                                </td>
                                <td className="py-2.5 px-2">
                                    {req.status === "pending" ? (
                                        <div className="flex gap-4 justify-center items-center">
                                            <button
                                                onClick={() => handleAction(req.id, "accepted")}
                                                className="px-3 py-1 rounded text-xs font-bold font-display tracking-wider text-primary border border-primary hover:shadow-[0_0_15px_hsl(var(--neon-pink)/0.5)] transition-all"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, "declined")}
                                                className="px-3 py-1 rounded text-xs font-bold font-display tracking-wider bg-secondary text-secondary-foreground border border-border hover:border-primary transition-all"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    ) : (
                                        <span
                                            className={`text-xs font-display font-bold tracking-wider ${req.status === "accepted"
                                                ? "text-primary neon-text"
                                                : "text-muted-foreground"
                                                }`}
                                        >
                                            {req.status === "accepted" ? "✓ Accepted" : "✗ Declined"}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DropRequests;
