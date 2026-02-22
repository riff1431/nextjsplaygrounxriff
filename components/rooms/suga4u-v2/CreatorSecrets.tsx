import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";

const secrets = [
    { title: "MY FAVORITE FRAGRANCE", price: 599 },
    { title: "WHAT I'M WEARING NOW", price: 899 },
];

const CreatorSecrets = ({ roomId }: { roomId: string | null }) => {
    const { sendGift } = useSuga4U(roomId);
    const { user } = useAuth();

    const handleReveal = async (item: typeof secrets[0]) => {
        if (!roomId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            await sendGift(item.price, fanName, `Revealed: ${item.title}`);
            alert(`Secret revealed: ${item.title}`);
        } catch (err) {
            console.error("Failed to reveal secret:", err);
        }
    };

    return (
        <div className="glass-panel flex flex-col h-full bg-transparent border-gold/20">
            <div className="flex items-center justify-center p-3 border-b border-gold/20">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3">Creator Secrets</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>

            <div className="flex-1 p-3 space-y-3">
                {secrets.map((item) => (
                    <div key={item.title} className="glass-panel p-2 bg-black/20 border-gold/10">
                        <p className="text-[10px] font-bold tracking-[0.2em] text-center mb-2 uppercase opacity-60">Locked Secret</p>
                        <button
                            onClick={() => handleReveal(item)}
                            disabled={!roomId}
                            className="w-full py-2 bg-muted/50 border border-gold/20 rounded-lg text-xs font-bold hover:bg-gold/10 transition-colors uppercase disabled:opacity-50"
                        >
                            REVEAL FOR ${item.price}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CreatorSecrets;
