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
    { name: "Private 1-on-1", price: 500, emoji: "👑", full: true, isPrivateCall: true },
];

interface QuickPaidActionsProps {
    roomId: string | null;
    hostId: string | null;
    sessionId?: string | null;
    onPrivateCallInitiated?: () => void;
    initiatePrivateCall?: (fanName: string, requestId?: string) => Promise<any>;
}

const QuickPaidActions = ({ roomId, hostId, sessionId, onPrivateCallInitiated, initiatePrivateCall }: QuickPaidActionsProps) => {
    const { createRequest } = useSuga4U(roomId, sessionId);
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

            // Create the paid request
            const result = await createRequest(
                a.isPrivateCall ? "PRIVATE_1ON1" : "ACTION",
                a.name,
                a.isPrivateCall ? "Private 1-on-1 Video Call Request" : `Quick Action: ${a.name}`,
                a.price,
                fanName
            );

            // If this is a private call, also initiate the video call
            if (a.isPrivateCall && initiatePrivateCall) {
                const callResult = await initiatePrivateCall(fanName, result?.request?.id);
                if (callResult) {
                    toast.success("👑 Private 1-on-1 requested!", { description: "Waiting for creator to accept..." });
                    onPrivateCallInitiated?.();
                } else {
                    toast.error("Failed to initiate video call");
                }
            } else {
                toast.success(`${a.emoji} ${a.name} activated!`, { description: `€${a.price} sent to creator` });
            }
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
                    description={
                        confirmAction.isPrivateCall
                            ? `Pay €${confirmAction.price} for a Private 1-on-1 video call with the creator?`
                            : `Pay €${confirmAction.price} to trigger ${confirmAction.name}?`
                    }
                    confirmLabel={confirmAction.isPrivateCall ? "Pay & Request Call" : "Pay Now"}
                />
            )}
        </div>
    );
};

export default QuickPaidActions;
