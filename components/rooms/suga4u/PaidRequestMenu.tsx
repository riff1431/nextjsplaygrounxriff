import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import CustomRequestModal from "@/components/rooms/suga4u/CustomRequestModal";
import { toast } from "sonner";
import { cs } from "@/utils/currency";

const quickRequests = [
    { type: "POSE", name: "Pose", price: 15, emoji: "📸", isCustomRequest: true },
    { type: "SHOUTOUT", name: "Shoutout", price: 25, emoji: "✏️", isCustomRequest: true },
    { type: "QUICK_TEASE", name: "Quick Tease", price: 40, emoji: "💋", isCustomRequest: true },
    { type: "CUSTOM_CLIP", name: "Custom Clip", price: 80, emoji: "📧", isCustomRequest: true },
];

const PaidRequestMenu = ({ roomId, hostId, sessionId }: { roomId: string | null; hostId: string | null; sessionId?: string | null }) => {
    const { createRequest } = useSuga4U(roomId, sessionId);
    const { user } = useAuth();
    const { balance, pay } = useWallet();
    const [confirmReq, setConfirmReq] = React.useState<typeof quickRequests[0] | null>(null);
    const [customReq, setCustomReq] = React.useState<typeof quickRequests[0] | null>(null);

    const handleRequestClick = (r: typeof quickRequests[0]) => {
        if (!roomId || !hostId) return;
        if (r.isCustomRequest) {
            setCustomReq(r);
        } else {
            setConfirmReq(r);
        }
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
            toast.success(`📸 Request sent: ${r.name}`, { description: `${cs()}${r.price} request submitted` });
        } catch (err) {
            console.error("Failed to send request:", err);
            toast.error("Failed to send request");
        } finally {
            setConfirmReq(null);
        }
    };

    const handleCustomRequest = async (customText: string) => {
        if (!roomId || !hostId || !customReq) return;
        const r = customReq;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            
            // Deduct from wallet
            const payment = await pay(hostId, r.price, `Custom Request: ${r.name}`, roomId, 'suga_request');
            if (!payment.success) {
                toast.error(payment.error || "Payment failed");
                return;
            }

            // Create Request with custom text
            const res = await fetch(`/api/v1/rooms/${roomId}/suga/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: r.type,
                    label: r.name,
                    note: customText,
                    price: r.price,
                    fanName,
                    sessionId: sessionId || undefined,
                    customText,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed");

            toast.success(`${r.emoji} Custom request sent: ${r.name}`, { description: `${cs()}${r.price} — your message was delivered` });
        } catch (err) {
            console.error("Failed to send custom request:", err);
            toast.error("Failed to send custom request");
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
                        <p className="text-pink font-bold text-sm">{cs()}{r.price}</p>
                    </button>
                ))}
            </div>

            {/* Standard Spend Confirmation Modal (Pose, Shoutout) */}
            {confirmReq && (
                <SpendConfirmModal
                    isOpen={true}
                    onClose={() => setConfirmReq(null)}
                    onConfirm={handleConfirmRequest}
                    title={"Confirm Request: " + confirmReq.name}
                    itemLabel={confirmReq.name}
                    amount={confirmReq.price}
                    walletBalance={balance}
                    description={`Pay ${cs()}${confirmReq.price} to request ${confirmReq.name}?`}
                    confirmLabel="Pay & Request"
                />
            )}

            {/* Custom Request Modal (Quick Tease, Custom Clip) */}
            {customReq && (
                <CustomRequestModal
                    isOpen={true}
                    onClose={() => setCustomReq(null)}
                    onConfirm={handleCustomRequest}
                    requestName={customReq.name}
                    requestEmoji={customReq.emoji}
                    amount={customReq.price}
                    walletBalance={balance}
                />
            )}
        </div>
    );
};

export default PaidRequestMenu;
