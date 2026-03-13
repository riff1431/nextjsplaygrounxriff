import React from "react";
import { Lock } from "lucide-react";
import { useSuga4U, CreatorSecret } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

const categories = [
    { label: "CUTE", emoji: "🎀" },
    { label: "LUXURY", emoji: "💎" },
    { label: "DREAM", emoji: "👑" },
];

const CreatorSecrets = ({ roomId }: { roomId: string | null }) => {
    const { secrets, sendGift } = useSuga4U(roomId);
    const { user } = useAuth();
    const [activeTab, setActiveTab] = React.useState("CUTE");

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

    const getCategoryEmoji = (cat: string) => categories.find(c => c.label === cat)?.emoji || "🌸";
    const filteredSecrets = secrets.filter(s => s.category === activeTab);

    return (
        <div className="glass-panel p-3 bg-transparent border-gold/20 h-full flex flex-col">
            <div className="flex items-center justify-center mb-2">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3 whitespace-nowrap">Creator Secrets</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1.5 mb-2 px-1">
                {categories.map((c) => (
                    <button 
                        key={c.label} 
                        onClick={() => setActiveTab(c.label)}
                        className={`flex-1 border rounded-full px-1 py-1 text-[10px] font-bold tracking-wider transition-colors ${
                            activeTab === c.label 
                                ? 'bg-pink/20 border-pink' 
                                : 'bg-muted/50 border-gold/20 hover:border-pink/50'
                        }`}
                    >
                        {c.emoji} {c.label}
                    </button>
                ))}
            </div>

            {/* Secrets grid */}
            <div className="flex-1 overflow-y-auto chat-scroll min-h-0">
                {filteredSecrets.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-white/40 text-sm italic min-h-[80px]">
                        No {activeTab.toLowerCase()} secrets yet
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 p-1">
                        {filteredSecrets.map((s) => (
                            <div key={s.id} className="glass-panel neon-border-pink p-2 text-center bg-transparent flex flex-col justify-between min-h-[110px]">
                                <div>
                                    <span className="text-base">{getCategoryEmoji(s.category)}</span>
                                    <Lock className="w-3 h-3 mx-auto mb-1 text-gold" />
                                    <p className="text-[10px] font-semibold mb-1 leading-tight line-clamp-2">{s.name}</p>
                                </div>
                                <button
                                    onClick={() => handleUnlock(s)}
                                    disabled={!roomId}
                                    className="btn-gold w-full py-1 text-[9px] disabled:opacity-50 mt-1"
                                >
                                    ${s.unlock_price} UNLOCK
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatorSecrets;
