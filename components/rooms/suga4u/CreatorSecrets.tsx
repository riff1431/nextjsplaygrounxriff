import React from "react";
import { Lock, Image as ImageIcon, Video, Eye } from "lucide-react";
import { useSuga4U, CreatorSecret } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";

const categories = [
    { label: "CUTE", emoji: "🎀" },
    { label: "LUXURY", emoji: "💎" },
    { label: "DREAM", emoji: "👑" },
];

const CreatorSecrets = ({ roomId, hostId }: { roomId: string | null; hostId?: string | null }) => {
    const { secrets, sendGift } = useSuga4U(roomId);
    const { user } = useAuth();
    const { balance, pay } = useWallet();
    const [activeTab, setActiveTab] = React.useState("CUTE");
    
    // Track locally unlocked secrets during this session
    const [unlockedIds, setUnlockedIds] = React.useState<Set<string>>(new Set());
    const [confirmSecret, setConfirmSecret] = React.useState<CreatorSecret | null>(null);

    const handleUnlockPrompt = (s: CreatorSecret) => {
        if (!roomId || !hostId) return;
        setConfirmSecret(s);
    };

    const handleConfirmPayment = async () => {
        if (!confirmSecret || !roomId || !hostId) return;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            
            // Deduct from fan wallet, send to creator
            const result = await pay(hostId, confirmSecret.unlock_price, `Unlocked Secret: ${confirmSecret.name}`, roomId, 'suga_secret', confirmSecret.id);
            if (!result.success) throw new Error(result.error);

            await sendGift(confirmSecret.unlock_price, fanName, `Unlocked Secret: ${confirmSecret.name}`);
            
            // Mark as unlocked locally
            setUnlockedIds(prev => new Set(prev).add(confirmSecret.id));
            toast.success(`🔓 Secret unlocked: ${confirmSecret.name}`, { description: confirmSecret.description || `$${confirmSecret.unlock_price} spent` });
            setConfirmSecret(null);
        } catch (err: any) {
            console.error("Failed to unlock secret:", err);
            toast.error(err.message || "Failed to unlock secret");
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
                        {filteredSecrets.map((s) => {
                            const isUnlocked = unlockedIds.has(s.id);
                            
                            return (
                                <div key={s.id} className="relative glass-panel neon-border-pink text-center bg-transparent flex flex-col justify-between min-h-[110px] overflow-hidden group">
                                    {/* Media Background */}
                                    {s.media_url && (
                                        <div className="absolute inset-0 z-0 bg-black/50">
                                            {s.media_type === 'video' ? (
                                                <video src={s.media_url} className={`w-full h-full object-cover transition-all duration-500 ${!isUnlocked ? 'blur-md opacity-50 scale-110 pointer-events-none' : 'opacity-100'}`} autoPlay loop muted playsInline />
                                            ) : (
                                                <img src={s.media_url} className={`w-full h-full object-cover transition-all duration-500 ${!isUnlocked ? 'blur-md opacity-50 scale-110 pointer-events-none' : 'opacity-100'}`} alt="Secret" />
                                            )}
                                        </div>
                                    )}

                                    {/* Content Overlay */}
                                    <div className={`relative z-10 flex flex-col h-full p-2 transition-opacity ${isUnlocked ? 'opacity-0 hover:opacity-100 bg-black/60' : ''}`}>
                                        <div>
                                            {/* Top Icons */}
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-base">{getCategoryEmoji(s.category)}</span>
                                                {s.media_url && !isUnlocked && (
                                                    <span className="text-white/70">
                                                        {s.media_type === 'video' ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                                    </span>
                                                )}
                                                {isUnlocked && <Eye className="w-3.5 h-3.5 text-emerald-400" />}
                                            </div>
                                            
                                            {!isUnlocked && <Lock className="w-4 h-4 mx-auto mb-1 text-gold" />}
                                            <p className="text-[10px] font-semibold mb-1 leading-tight line-clamp-2 drop-shadow-md text-white">{s.name}</p>
                                        </div>
                                        
                                        {!isUnlocked && (
                                            <button
                                                onClick={() => handleUnlockPrompt(s)}
                                                disabled={!roomId || !hostId}
                                                className="btn-gold w-full py-1.5 text-[10px] disabled:opacity-50 mt-1 shadow-lg"
                                            >
                                                ${s.unlock_price} UNLOCK
                                            </button>
                                        )}
                                        {isUnlocked && s.description && (
                                            <p className="text-[9px] text-white/80 line-clamp-3 mt-auto mb-1">{s.description}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Spend Confirmation Modal */}
            {confirmSecret && (
                <SpendConfirmModal
                    isOpen={true}
                    onClose={() => setConfirmSecret(null)}
                    onConfirm={handleConfirmPayment}
                    title="Unlock Creator Secret"
                    itemLabel={confirmSecret.name}
                    amount={confirmSecret.unlock_price}
                    walletBalance={balance}
                    description={`Permanently unlock the secret "${confirmSecret.name}" to view its contents during this session.`}
                    confirmLabel="Unlock Secret"
                />
            )}
        </div>
    );
};

export default CreatorSecrets;
