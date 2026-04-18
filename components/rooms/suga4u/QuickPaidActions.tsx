import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";

const actions = [
    { name: "Say My Name", price: 20, emoji: "💋" },
    { name: "Sponsor Room", price: 100, emoji: "💎" },
    { name: "Voice Note", price: 35, emoji: "🎙️" },
    { name: "Photo Drop", price: 45, emoji: "📸" },
    { name: "Private 1-on-1", price: 500, emoji: "👑", full: true },
];

const QuickPaidActions = ({ roomId, hostId }: { roomId: string | null; hostId: string | null }) => {
    const { createRequest } = useSuga4U(roomId);
    const { user } = useAuth();
    const { balance, pay } = useWallet();
    const [confirmAction, setConfirmAction] = React.useState<typeof actions[0] | null>(null);

    const handleActionClick = (a: typeof actions[0]) => {
        if (!roomId || !hostId) return;
        setConfirmAction(a);
    };

    const handleConfirmAction = async () => {
        if (!roomId || !hostId || !confirmAction) return;
        const a = confirmAction;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            
            // Deduct from wallet
            const payment = await pay(hostId, a.price, `Activated: ${a.name}`, roomId, 'suga_action');
            if (!payment.success) {
                toast.error(payment.error || "Payment failed");
                return;
            }

            // Route to pending requests
            await createRequest("ACTION", a.name, `Quick Action: ${a.name}`, a.price, fanName);
            toast.success(`${a.emoji} ${a.name} activated!`, { description: `€${a.price} sent to creator` });
        } catch (err) {
            console.error("Failed to trigger action:", err);
            toast.error("Failed to trigger action");
        } finally {
            setConfirmAction(null);
        }
    };

    return (
        <div className="glass-panel p-3 bg-transparent border-gold/20">
            <div className="grid grid-cols-2 gap-2">
                {actions.filter(a => !a.full).map((a) => (
                    <button
                        key={a.name}
                        onClick={() => handleActionClick(a)}
                        disabled={!roomId || !hostId}
                        className="neon-border-pink glass-panel py-2 px-2 text-center hover:bg-muted/50 transition-colors bg-transparent disabled:opacity-50"
                    >
                        <span className="text-[11px] block">{a.emoji} {a.name}</span>
                        <p className="text-pink font-bold text-sm">€{a.price}</p>
                    </button>
                ))}
            </div>
            {actions.filter(a => a.full).map((a) => (
                <button
                    key={a.name}
                    onClick={() => handleActionClick(a)}
                    disabled={!roomId || !hostId}
                    className="w-full mt-2 btn-pink py-2 text-sm glow-pink disabled:opacity-50"
                >
                    {a.emoji} {a.name} <span className="font-bold">€{a.price}</span>
                </button>
            ))}
            
            {/* Spend Confirmation Modal */}
            {confirmAction && (
                <SpendConfirmModal
                    isOpen={true}
                    onClose={() => setConfirmAction(null)}
                    onConfirm={handleConfirmAction}
                    title={"Confirm " + confirmAction.name}
                    itemLabel={confirmAction.name}
                    amount={confirmAction.price}
                    walletBalance={balance}
                    description={`Pay €${confirmAction.price} to trigger ${confirmAction.name}?`}
                    confirmLabel="Pay Now"
                />
            )}
        </div>
    );
};

export default QuickPaidActions;
