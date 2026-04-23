import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";

const gifts = [
    { name: "Diamond", amount: 10, emoji: "💎" },
    { name: "Diamonds", amount: 25, emoji: "💎" },
    { name: "More Diamonds", amount: 50, emoji: "💎" },
    { name: "Big Money", amount: 100, emoji: "💰" },
];

const SendSugarGifts = ({ roomId, hostId }: { roomId: string | null; hostId: string | null }) => {
    const { sendGift } = useSuga4U(roomId);
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
            const payment = await pay(hostId, g.amount, `Sugar Gift: ${g.name}`, roomId, 'suga_gift');
            if (!payment.success) {
                toast.error(payment.error || "Payment failed");
                return;
            }

            // Record the gift in activity
            await sendGift(g.amount, fanName, `Sent ${g.name}`);
            toast.success(`${g.emoji} Gift sent: ${g.name}`, { description: `€${g.amount} sent to creator` });
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
                <span className="section-title px-3">Send Sugar Gifts</span>
                <div className="h-px flex-1 bg-gold/30" />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
                {gifts.map((g) => (
                    <button
                        key={g.amount}
                        onClick={() => handleGiftClick(g)}
                        disabled={!roomId || !hostId}
                        className="neon-border-pink glass-panel py-3 text-center hover:bg-muted/50 transition-colors bg-transparent disabled:opacity-50"
                    >
                        <span className="text-lg">{g.emoji}</span>
                        <p className="text-foreground font-bold text-sm">€{g.amount}</p>
                    </button>
                ))}
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
                    description={`Send €${confirmGift.amount} ${confirmGift.name} to the creator?`}
                    confirmLabel="Send Gift"
                />
            )}
        </div>
    );
};

export default SendSugarGifts;
