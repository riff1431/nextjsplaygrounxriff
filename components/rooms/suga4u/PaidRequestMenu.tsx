import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const quickRequests = [
    { type: "POSE", name: "Pose", price: 15, emoji: "📸" },
    { type: "SHOUTOUT", name: "Shoutout", price: 25, emoji: "✏️" },
    { type: "QUICK_TEASE", name: "Quick Tease", price: 40, emoji: "💋" },
    { type: "CUSTOM_CLIP", name: "Custom Clip", price: 80, emoji: "📧" },
];

const PaidRequestMenu = ({ roomId }: { roomId: string | null }) => {
    const { createRequest } = useSuga4U(roomId);
    const { user } = useAuth();

    const handleRequest = async (r: typeof quickRequests[0]) => {
        if (!roomId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            await createRequest(r.type, r.name, "Custom request from fan view", r.price, fanName);
            alert(`Request sent: ${r.name}`);
        } catch (err) {
            console.error("Failed to send request:", err);
        }
    };

    return (
        <div className="glass-panel p-3 bg-transparent border-gold/20">
            <div className="flex items-center justify-center mb-3">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3">Paid Request Menu</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>
            <div className="grid grid-cols-2 gap-2">
                {quickRequests.map((r) => (
                    <button
                        key={r.name}
                        onClick={() => handleRequest(r)}
                        disabled={!roomId}
                        className="neon-border-pink glass-panel py-2 px-3 text-center hover:bg-muted/50 transition-colors bg-transparent disabled:opacity-50"
                    >
                        <span className="text-xs block">{r.emoji} {r.name}</span>
                        <p className="text-pink font-bold text-sm">${r.price}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PaidRequestMenu;
