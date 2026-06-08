import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";
import { cs } from "@/utils/currency";
import { getSugaIcon, getSugaGlowClass, getSugaCyberpunkStyle } from "@/utils/suga/sugaIcons";

const gifts = [
    { name: "Diamond", amount: 10 },
    { name: "Diamonds", amount: 25 },
    { name: "More Diamonds", amount: 50 },
    { name: "Big Money", amount: 100 },
];

const SendSugarGifts = ({ roomId, hostId, sessionId }: { roomId: string | null; hostId: string | null; sessionId?: string | null }) => {
    const { sendGift, createRequest } = useSuga4U(roomId, sessionId);
    const { user } = useAuth();
    const { balance, pay } = useWallet();
    const [confirmGift, setConfirmGift] = React.useState<typeof gifts[0] | null>(null);

    const handleGiftClick = (g: typeof gifts[0]) => {
        if (!roomId || !hostId) return;
        setConfirmGift(g);
    };

    const handleConfirmGift = async () => {
        if (!roomId || !hostId || !confirmGift) return;
        const g = confirmGift;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";

            // Deduct from wallet
            const payment = await pay(hostId, g.amount, `Suga Gift: ${g.name}`, roomId, 'suga_gift');
            if (!payment.success) {
                toast.error(payment.error || "Payment failed");
                return;
            }

            // Route to pending requests
            await createRequest("GIFT", g.name, `Sent ${g.name}`, g.amount, fanName);
            
            toast.success(
                <span className="flex items-center gap-1.5 font-semibold">
                    {getSugaIcon("GIFT", g.name)}
                    <span>Gift sent: {g.name}</span>
                </span>,
                { description: `${cs()}${g.amount} sent to creator` }
            );
        } catch (err) {
            console.error("Failed to send gift:", err);
            toast.error("Failed to send gift");
        } finally {
            setConfirmGift(null);
        }
    };

    return (
        <div className="glass-panel p-3 bg-transparent border-gold/20">
            <div className="flex items-center justify-center mb-3">
                <div className="h-px flex-1 bg-gold/30" />
                <span className="section-title px-3">Send Suga Gifts</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
                {gifts.map((g) => {
                    const emoji = getSugaIcon("GIFT", g.name);
                    const { glowClass, bgClass } = getSugaCyberpunkStyle("GIFT", g.name);
                    return (
                        <button
                            key={g.amount}
                            onClick={() => handleGiftClick(g)}
                            disabled={!roomId || !hostId}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border backdrop-blur-md transition-all duration-300 active:scale-95 disabled:opacity-50 text-center ${bgClass} ${glowClass}`}
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/45 border border-white/5 mb-1.5 shadow-inner">
                                {emoji}
                            </div>
                            <span className="font-black text-xs text-white">{cs()}{g.amount}</span>
                        </button>
                    );
                })}
            </div>

            {/* Spend Confirmation Modal */}
            {confirmGift && (
                <SpendConfirmModal
                    isOpen={true}
                    onClose={() => setConfirmGift(null)}
                    onConfirm={handleConfirmGift}
                    title={"Send Gift: " + confirmGift.name}
                    itemLabel={confirmGift.name}
                    amount={confirmGift.amount}
                    walletBalance={balance}
                    description={`Send ${cs()}${confirmGift.amount} ${confirmGift.name} to the creator?`}
                    confirmLabel="Send Gift"
                />
            )}
        </div>
    );
};

export default SendSugarGifts;
