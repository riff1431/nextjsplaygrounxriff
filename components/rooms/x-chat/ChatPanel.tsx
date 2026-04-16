"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Zap, DollarSign, Crown, Smile } from "lucide-react";
import { useXChat, XChatMessage } from "@/hooks/useXChat";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

type Lane = "Free" | "Paid" | "Priority";

const LANE_CONFIG: Record<Lane, { price: number; icon: React.ReactNode; color: string; borderColor: string }> = {
    Free: { price: 0, icon: <Send size={14} />, color: "text-foreground/80", borderColor: "border-border" },
    Paid: { price: 10, icon: <DollarSign size={14} />, color: "text-cyan-300", borderColor: "border-cyan-400/40" },
    Priority: { price: 50, icon: <Crown size={14} />, color: "text-yellow-300", borderColor: "border-yellow-400/40" },
};

interface ChatPanelProps {
    roomId: string | null;
    hostName?: string;
}

const ChatPanel = ({ roomId, hostName = "Host" }: ChatPanelProps) => {
    const { user } = useAuth();
    const { messages, sendMessage } = useXChat(roomId);
    const { balance, refresh } = useWallet();
    const supabase = createClient();
    const [message, setMessage] = useState("");
    const [senderName, setSenderName] = useState("Anonymous");
    const [selectedLane, setSelectedLane] = useState<Lane>("Free");
    const [activeFilter, setActiveFilter] = useState<"All" | "Paid" | "Priority">("All");
    const [pendingSend, setPendingSend] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const EMOJIS = ["😀","😂","😍","🔥","🎉","👍","🙏","❤️","✨","💯","😎","👀","👑","💰"];

    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setSenderName(user.user_metadata.full_name);
        } else if (user?.email) {
            setSenderName(user.email.split("@")[0]);
        }
    }, [user]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, activeFilter]);

    const handleSend = async () => {
        if (!message.trim() || !roomId || pendingSend) return;

        const lane = selectedLane;
        const price = LANE_CONFIG[lane].price;

        if (price > 0) {
            // For paid messages, show confirm modal
            setPendingSend(true);
            return;
        }

        // Free message - send directly
        try {
            await sendMessage(message, senderName, lane, 0);
            setMessage("");
        } catch (err) {
            console.error("Failed to send:", err);
            toast.error("Failed to send message");
        }
    };

    const handlePaidSend = async () => {
        if (!message.trim() || !roomId) return;
        const lane = selectedLane;
        const price = LANE_CONFIG[lane].price;

        try {
            // Get room host for fund transfer
            const { data: room } = await supabase
                .from("rooms")
                .select("host_id")
                .eq("id", roomId)
                .single();

            if (!room) {
                toast.error("Room not found");
                return;
            }

            // Transfer funds
            const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
                p_from_user_id: user?.id,
                p_to_user_id: room.host_id,
                p_amount: price,
                p_description: `X Chat ${lane} message`,
                p_room_id: roomId,
                p_related_type: "xchat_message",
                p_related_id: null,
            });

            if (rpcError) {
                toast.error(rpcError.message);
                return;
            }
            if (!result?.success) {
                toast.error(result?.error || "Payment failed");
                return;
            }

            // Send the message via the hook
            await sendMessage(message, senderName, lane, price);
            setMessage("");
            refresh?.();
            toast.success(`${lane} message sent! (€${price})`);
        } catch (err) {
            console.error("Failed to send paid message:", err);
            toast.error("Failed to send message");
        }
    };

    const getLaneBadge = (msg: XChatMessage) => {
        if (msg.lane === "Priority") {
            return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/30 text-yellow-300">👑 Priority</span>;
        }
        if (msg.lane === "Paid") {
            return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/25 text-cyan-300">💰 Paid</span>;
        }
        return null;
    };

    const getStatusBadge = (status: string) => {
        if (status === "Answered") return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">✅ Answered</span>;
        if (status === "Pinned") return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">📌 Pinned</span>;
        return null;
    };

    const filteredMessages = messages.filter(m => activeFilter === "All" || m.lane === activeFilter);

    return (
        <div className="glass-card flex flex-col h-full min-h-[400px]">
            {/* Display Filters */}
            <div className="flex px-4 pt-3 pb-2 gap-2 border-b border-border mb-3">
                {(["All", "Paid", "Priority"] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveFilter(tab)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            activeFilter === tab
                                ? tab === "Priority" ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                                : tab === "Paid" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-primary/20 text-primary border border-primary/30"
                            : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                        }`}
                    >
                        {tab === "Priority" ? "👑 Priority" : tab === "Paid" ? "💰 Paid" : "All"}
                    </button>
                ))}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll space-y-3 px-4 mb-2">
                {filteredMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8 italic">
                        No messages yet. Start the conversation!
                    </p>
                )}
                {filteredMessages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-primary font-medium text-sm">@{msg.sender_name}</span>
                            {getLaneBadge(msg)}
                            {msg.paid_amount > 0 && (
                                <span className="text-[10px] text-gold font-semibold">${msg.paid_amount}</span>
                            )}
                            {getStatusBadge(msg.status)}
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">{msg.body}</p>
                        {msg.creator_reply && (
                            <div className="ml-4 pl-3 border-l-2 border-gold-light/30 py-1 text-sm leading-relaxed">
                                <p>
                                    <span className="text-gold-light font-semibold">@{hostName}</span>{" "}
                                    <span className="text-foreground/90">{msg.creator_reply}</span>
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input Section */}
            <div className="px-4 pb-4 mt-auto relative">
                {/* Send Lane Selector */}
                <div className="flex gap-1.5 mb-3">
                    {(Object.keys(LANE_CONFIG) as Lane[]).map((lane) => {
                        const config = LANE_CONFIG[lane];
                        const isActive = selectedLane === lane;
                        return (
                            <button
                                key={lane}
                                onClick={() => setSelectedLane(lane)}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-all ${isActive
                                    ? `glass-card-inner ${config.borderColor} ${config.color} border`
                                    : "text-muted-foreground hover:text-foreground/80 hover:bg-muted/30"
                                    }`}
                            >
                                {config.icon}
                                {lane}
                                {config.price > 0 && <span className="text-gold text-[10px]">${config.price}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Quick Emoji Picker */}
                {showEmojis && (
                    <div className="absolute bottom-[4.5rem] left-4 glass-card p-2 grid grid-cols-7 gap-2 z-50">
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => { setMessage(prev => prev + emoji); setShowEmojis(false); }}
                                className="hover:scale-125 transition-transform text-lg"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowEmojis(!showEmojis)}
                        className="glass-card-inner px-3 py-2 transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <Smile size={18} />
                    </button>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder={
                            !roomId
                                ? "Waiting for room..."
                                : selectedLane === "Free"
                                    ? "Type message..."
                                    : `${selectedLane} message (€${LANE_CONFIG[selectedLane].price})...`
                        }
                        disabled={!roomId}
                        className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!message.trim() || !roomId}
                        className={`glass-card-inner px-4 py-2 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 ${selectedLane === "Priority"
                            ? "text-yellow-300 hover:text-yellow-200"
                            : selectedLane === "Paid"
                                ? "text-cyan-300 hover:text-cyan-200"
                                : "text-gold hover:text-gold-light"
                            }`}
                    >
                        {LANE_CONFIG[selectedLane].icon}
                        {LANE_CONFIG[selectedLane].price > 0 ? `€${LANE_CONFIG[selectedLane].price}` : "Send"}
                    </button>
                </div>
            </div>

            {/* Spend Confirm Modal for paid messages */}
            <SpendConfirmModal
                isOpen={pendingSend}
                onClose={() => setPendingSend(false)}
                title={`Send ${selectedLane} Message`}
                itemLabel={`${selectedLane} lane message`}
                amount={LANE_CONFIG[selectedLane].price}
                walletBalance={balance}
                onConfirm={async () => {
                    await handlePaidSend();
                    setPendingSend(false);
                }}
            />
        </div>
    );
};

export default ChatPanel;
