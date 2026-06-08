import React from "react";
import { useSuga4U } from "@/hooks/useSuga4U";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import CustomRequestModal from "@/components/rooms/suga4u/CustomRequestModal";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";
import { cs } from "@/utils/currency";
import { getSugaIcon, getSugaGlowClass, getSugaCyberpunkStyle } from "@/utils/suga/sugaIcons";

const actions = [
    { name: "Say My Name", price: 20, isCustomRequest: true },
    { name: "Sponsor Room", price: 100, isCustomRequest: true },
    { name: "Voice Note", price: 35, isCustomRequest: true },
    { name: "Photo Drop", price: 45, isCustomRequest: true },
    { name: "Private 1-on-1", price: 500, full: true, isPrivateCall: true, isCustomRequest: false },
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
    const [customAction, setCustomAction] = React.useState<typeof actions[0] | null>(null);
    const [confirmAction, setConfirmAction] = React.useState<typeof actions[0] | null>(null);

    const handleActionClick = (a: typeof actions[0]) => {
        if (!roomId || !hostId) return;
        if (a.isCustomRequest) {
            setCustomAction(a);
        } else {
            setConfirmAction(a);
        }
    };

    const handleCustomAction = async (customText: string) => {
        if (!roomId || !hostId || !customAction) return;
        const a = customAction;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            
            // Check balance instead of immediate pay
            if (balance < a.price) {
                toast.error("Insufficient balance");
                return;
            }

            // Create Request with custom text
            const res = await fetch(`/api/v1/rooms/${roomId}/suga/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: "ACTION",
                    label: a.name,
                    note: customText,
                    price: a.price,
                    fanName,
                    sessionId: sessionId || undefined,
                    customText,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed");

            toast.success(
                <span className="flex items-center gap-1.5 font-semibold">
                    {getSugaIcon("ACTION", a.name)}
                    <span>Custom request sent: {a.name}</span>
                </span>,
                { description: "Waiting for creator to accept request..." }
            );
        } catch (err) {
            console.error("Failed to send custom request:", err);
            toast.error("Failed to send custom request");
        }
    };

    const handleConfirmAction = async () => {
        if (!roomId || !hostId || !confirmAction) return;
        const a = confirmAction;
        try {
            const fanName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Fan";
            
            // Check balance instead of immediate pay
            if (balance < a.price) {
                toast.error("Insufficient balance");
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
                toast.success(
                    <span className="flex items-center gap-1.5 font-semibold">
                        {getSugaIcon(a.isPrivateCall ? "PRIVATE_1ON1" : "ACTION", a.name)}
                        <span>{a.name} requested!</span>
                    </span>,
                    { description: "Waiting for creator to accept..." }
                );
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
                {actions.filter(a => !a.full).map((a) => {
                    const emoji = getSugaIcon("ACTION", a.name);
                    const { glowClass, bgClass } = getSugaCyberpunkStyle("ACTION", a.name);
                    return (
                        <button
                            key={a.name}
                            onClick={() => handleActionClick(a)}
                            disabled={!roomId || !hostId}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border backdrop-blur-md text-left transition-all duration-300 active:scale-95 disabled:opacity-50 ${bgClass} ${glowClass}`}
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/45 border border-white/5 shrink-0 shadow-inner">
                                {emoji}
                            </div>
                            <div className="flex flex-col min-w-0 leading-tight">
                                <span className="text-[10px] font-extrabold tracking-wide text-white/95 uppercase truncate">{a.name}</span>
                                <span className="font-black text-xs mt-0.5 text-white">{cs()}{a.price}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
            {actions.filter(a => a.full).map((a) => {
                const emoji = getSugaIcon(a.isPrivateCall ? "PRIVATE_1ON1" : "ACTION", a.name);
                const { glowClass, bgClass } = getSugaCyberpunkStyle(a.isPrivateCall ? "PRIVATE_1ON1" : "ACTION", a.name);
                return (
                    <button
                        key={a.name}
                        onClick={() => handleActionClick(a)}
                        disabled={!roomId || !hostId}
                        className={`w-full mt-2 p-2.5 rounded-xl border backdrop-blur-md flex items-center gap-3 transition-all duration-300 active:scale-95 disabled:opacity-50 ${bgClass} ${glowClass}`}
                    >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/45 border border-white/5 shrink-0 shadow-inner">
                            {emoji}
                        </div>
                        <div className="flex flex-col min-w-0 leading-tight text-left">
                            <span className="text-[10px] font-extrabold tracking-wide text-white/95 uppercase truncate">{a.name}</span>
                            <span className="text-[9px] text-white/60">Request private video call</span>
                        </div>
                        <span className="font-black text-sm text-white ml-auto">{cs()}{a.price}</span>
                    </button>
                );
            })}
            
            {/* Custom Request Modal (Say My Name, Sponsor Room, Voice Note, Photo Drop) */}
            {customAction && (
                <CustomRequestModal
                    isOpen={true}
                    onClose={() => setCustomAction(null)}
                    onConfirm={handleCustomAction}
                    requestName={customAction.name}
                    requestEmoji={getSugaIcon("ACTION", customAction.name)}
                    amount={customAction.price}
                    walletBalance={balance}
                />
            )}

            {/* Spend Confirmation Modal (Private 1-on-1 only) */}
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
                            ? `Request a Private 1-on-1 video call with the creator for ${cs()}${confirmAction.price}?`
                            : `Request ${confirmAction.name} for ${cs()}${confirmAction.price}?`
                    }
                    confirmLabel={confirmAction.isPrivateCall ? "Request Call" : "Submit Request"}
                />
            )}
        </div>
    );
};

export default QuickPaidActions;
