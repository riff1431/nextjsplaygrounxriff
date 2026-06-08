import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import CustomRequestModal from "@/components/rooms/suga4u/CustomRequestModal";
import { toast } from "sonner";
import { cs } from "@/utils/currency";
import { getSugaIcon, getSugaGlowClass, getSugaCyberpunkStyle } from "@/utils/suga/sugaIcons";

const quickRequests = [
    { type: "POSE", name: "Pose", price: 15, isCustomRequest: true },
    { type: "SHOUTOUT", name: "Shoutout", price: 25, isCustomRequest: true },
    { type: "QUICK_TEASE", name: "Quick Tease", price: 40, isCustomRequest: true },
    { type: "CUSTOM_CLIP", name: "Custom Clip", price: 80, isCustomRequest: true },
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

            toast.success(
                <span className="flex items-center gap-1.5 font-semibold">
                    {getSugaIcon(r.type, r.name)}
                    <span>Custom request sent: {r.name}</span>
                </span>,
                { description: `${cs()}${r.price} — your message was delivered` }
            );
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
                {quickRequests.map((r) => {
                    const emoji = getSugaIcon(r.type, r.name);
                    const { glowClass, bgClass } = getSugaCyberpunkStyle(r.type, r.name);
                    return (
                        <button
                            key={r.name}
                            onClick={() => handleRequestClick(r)}
                            disabled={!roomId || !hostId}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border backdrop-blur-md text-left transition-all duration-300 active:scale-95 disabled:opacity-50 ${bgClass} ${glowClass}`}
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/45 border border-white/5 shrink-0 shadow-inner">
                                {emoji}
                            </div>
                            <div className="flex flex-col min-w-0 leading-tight">
                                <span className="text-[10px] font-extrabold tracking-wide text-white/95 uppercase truncate">{r.name}</span>
                                <span className="font-black text-xs mt-0.5 text-white">{cs()}{r.price}</span>
                            </div>
                        </button>
                    );
                })}
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
                    requestEmoji={getSugaIcon(customReq.type, customReq.name)}
                    amount={customReq.price}
                    walletBalance={balance}
                />
            )}
        </div>
    );
};

export default PaidRequestMenu;
