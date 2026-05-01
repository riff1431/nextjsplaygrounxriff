import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";

const quickRequests = [
    { type: "POSE", name: "Pose", price: 15, emoji: "📸" },
    { type: "SHOUTOUT", name: "Shoutout", price: 25, emoji: "✏️" },
    { type: "QUICK_TEASE", name: "Quick Tease", price: 40, emoji: "💋" },
    { type: "CUSTOM_CLIP", name: "Custom Clip", price: 80, emoji: "📧" },
];

const PaidRequestMenu = ({ roomId, hostId, sessionId }: { roomId: string | null; hostId: string | null; sessionId?: string | null }) => {
    const { createRequest } = useSuga4U(roomId, sessionId);
    const { user } = useAuth();
    const { balance, pay } = useWallet();
    const [confirmReq, setConfirmReq] = React.useState<typeof quickRequests[0] | null>(null);

    const handleRequestClick = (r: typeof quickRequests[0]) => {
        if (!roomId || !hostId) return;
        setConfirmReq(r);
    };

    const handleConfirmRequest = async () => {
        if (!roomId || !hostId || !confirmReq) return;
        const r = confirmReq;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            
            // Deduct from wallet
            const payment = await pay(hostId, r.price, `Paid Request: ${r.name}`, roomId, 'suga_request');
            if (!payment.success) {
                toast.error(payment.error || "Payment failed");
                return;
            }

            // Create Request
            await createRequest(r.type, r.name, "Custom request from fan view", r.price, fanName);
            toast.success(`📸 Request sent: ${r.name}`, { description: `€${r.price} request submitted` });
        } catch (err) {
            console.error("Failed to send request:", err);
            toast.error("Failed to send request");
        } finally {
            setConfirmReq(null);
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
                        onClick={() => handleRequestClick(r)}
                        disabled={!roomId || !hostId}
                        className="neon-border-pink glass-panel py-2 px-3 text-center hover:bg-muted/50 transition-colors bg-transparent disabled:opacity-50"
                    >
                        <span className="text-xs block">{r.emoji} {r.name}</span>
                        <p className="text-pink font-bold text-sm">€{r.price}</p>
                    </button>
                ))}
            </div>

            {/* Spend Confirmation Modal */}
            {confirmReq && (
                <SpendConfirmModal
                    isOpen={true}
                    onClose={() => setConfirmReq(null)}
                    onConfirm={handleConfirmRequest}
                    title={"Confirm Request: " + confirmReq.name}
                    itemLabel={confirmReq.name}
                    amount={confirmReq.price}
                    walletBalance={balance}
                    description={`Pay €${confirmReq.price} to request ${confirmReq.name}?`}
                    confirmLabel="Pay & Request"
                />
            )}
        </div>
    );
};

export default PaidRequestMenu;
