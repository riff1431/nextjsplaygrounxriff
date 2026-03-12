import React from "react";
import { Lock } from "lucide-react";
import { useSuga4U, CreatorSecret } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

const CreatorSecrets = ({ roomId }: { roomId: string | null }) => {
    const { secrets, sendGift } = useSuga4U(roomId);
    const { user } = useAuth();

    const handleUnlock = async (s: CreatorSecret) => {
        if (!roomId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            await sendGift(s.unlock_price, fanName, `Unlocked Secret: ${s.name}`);
            toast.success(`🔓 Secret unlocked: ${s.name}`, { description: s.description || `$${s.unlock_price} spent` });
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
            {secrets.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-white/40 text-sm italic min-h-[100px]">
                    No secrets available yet
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-3 p-4">
                    {secrets.map((s) => (
                        <div key={s.id} className="glass-panel neon-border-pink p-3 text-center bg-transparent flex flex-col justify-between">
                            <div>
                                <Lock className="w-5 h-5 mx-auto mb-1 text-gold" />
                                <p className="text-[11px] font-semibold mb-2 leading-tight">{s.name}</p>
                            </div>
                            <button
                                onClick={() => handleUnlock(s)}
                                disabled={!roomId}
                                className="btn-gold w-full py-1 text-[10px] disabled:opacity-50"
                            >
                                ${s.unlock_price} UNLOCK
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CreatorSecrets;
