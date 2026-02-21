import React from "react";
import { Lock } from "lucide-react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const secrets = [
    { name: "Behind the Scenes", price: 29 },
    { name: "Bath Party", price: 29 },
    { name: "Bedroom Vibes", price: 49 },
];

const CreatorSecrets = ({ roomId }: { roomId: string | null }) => {
    const { sendGift } = useSuga4U(roomId);
    const { user } = useAuth();

    const handleUnlock = async (s: typeof secrets[0]) => {
        if (!roomId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            await sendGift(s.price, fanName, `Unlocked Secret: ${s.name}`);
            alert(`Secret unlocked: ${s.name}`);
        } catch (err) {
            console.error("Failed to unlock secret:", err);
        }
    };

    return (
        <div className="glass-panel p-3 bg-transparent border-gold/20 h-full">
            <div className="flex items-center justify-center mb-3">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3 whitespace-nowrap">Creator Secrets</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>
            <div className="grid grid-cols-3 gap-3 p-1">
                {secrets.map((s, idx) => (
                    <div key={idx} className="glass-panel neon-border-pink p-3 text-center bg-transparent flex flex-col justify-between">
                        <div>
                            <Lock className="w-5 h-5 mx-auto mb-1 text-gold" />
                            <p className="text-[11px] font-semibold mb-2 leading-tight">{s.name}</p>
                        </div>
                        <button
                            onClick={() => handleUnlock(s)}
                            disabled={!roomId}
                            className="btn-gold w-full py-1 text-[10px] disabled:opacity-50"
                        >
                            ${s.price} UNLOCK
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CreatorSecrets;
