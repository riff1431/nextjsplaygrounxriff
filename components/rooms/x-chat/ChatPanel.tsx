"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Zap, DollarSign, Crown, Users, Smile } from "lucide-react";
import { useXChat, XChatMessage } from "@/hooks/useXChat";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import SpendConfirmModal from "@/components/common/SpendConfirmModal";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

import EmojiPicker from "@/components/common/EmojiPicker";
import { VoiceNotePlayer } from "@/components/common/VoiceNotePlayer";
import { cs } from "@/utils/currency";
import UserBadgeDisplay from "@/components/shared/UserBadgeDisplay";

type Lane = "Free" | "Paid" | "Priority";

const LANE_CONFIG: Record<Lane, { price: number; icon: React.ReactNode; color: string; borderColor: string }> = {
    Free: { price: 0, icon: <Send size={14} />, color: "text-foreground/80", borderColor: "border-border" },
    Paid: { price: 10, icon: <DollarSign size={14} />, color: "text-cyan-300", borderColor: "border-cyan-400/40" },
    Priority: { price: 50, icon: <Crown size={14} />, color: "text-yellow-300", borderColor: "border-yellow-400/40" },
};

interface ChatPanelProps {
    roomId: string | null;
    hostName?: string;
    sessionId?: string | null;
    isMobile?: boolean;
}

const ChatPanel = ({ roomId, hostName = "Host", sessionId, isMobile = false }: ChatPanelProps) => {
    const { user } = useAuth();
    const { messages, sendMessage } = useXChat(roomId, sessionId);
    const { balance, refresh } = useWallet();
    const supabase = createClient();
    const [message, setMessage] = useState("");
    const [senderName, setSenderName] = useState("Anonymous");
    const [selectedLane, setSelectedLane] = useState<Lane>("Free");
    const [activeFilter, setActiveFilter] = useState<"All" | "Paid" | "Priority">("All");
    const [pendingSend, setPendingSend] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update time every 10 seconds to refresh the pinned message timer
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

    const activePinMessage = React.useMemo(() => {
        // Search backwards to find the most recent pin message
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.status === "Pinned" && m.body.includes("📌")) {
                const pinTime = new Date(m.created_at).getTime();
                // Check if it's within 1 minute
                if (currentTime - pinTime <= 60 * 1000) {
                    return m;
                }
                // If the most recent one is expired, no older ones are active
                break;
            }
        }
        return null;
    }, [messages, currentTime]);

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
                throw new Error("Room not found");
            }

            // Transfer funds
            const { data: result, error: rpcError } = await supabase.rpc("transfer_funds", {
                p_from_user_id: user?.id,
                p_to_user_id: room.host_id,
                p_amount: price,
                p_description: `X Chat ${lane} message`,
                p_room_id: roomId,
            });

            if (rpcError) {
                toast.error(rpcError.message);
                throw new Error(rpcError.message);
            }
            if (!result?.success) {
                toast.error(result?.error || "Payment failed");
                throw new Error(result?.error || "Payment failed");
            }

            // Send the message via the hook
            await sendMessage(message, senderName, lane, price);
            setMessage("");
            refresh?.();
            toast.success(`${lane} message sent! (${cs()}${price})`);
        } catch (err: any) {
            console.error("Failed to send paid message:", err);
            toast.error("Failed to send message: " + (err.message || "Unknown error"));
            throw err;
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

    const getAvatarBg = (username: string) => {
        const colors = [
            "bg-rose-500", "bg-purple-500", "bg-violet-500", 
            "bg-emerald-500", "bg-blue-500", "bg-amber-500", 
            "bg-pink-500", "bg-cyan-500"
        ];
        const charCode = username.charCodeAt(0) || 0;
        return colors[charCode % colors.length];
    };

    const getMobileLaneBadge = (msg: XChatMessage) => {
        if (msg.lane === "Priority") {
            return <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-yellow-500/25 border border-yellow-500/40 text-yellow-300">👑 Priority</span>;
        }
        if (msg.lane === "Paid") {
            return <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/25 border border-orange-500/40 text-orange-400">🔥 Paid</span>;
        }
        return null;
    };

    const MessageCircleIcon = () => (
        <svg className="text-white/20" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );

    if (isMobile) {
        return (
            <div className="mobile-chat-wrapper flex flex-col h-full overflow-hidden">
                {/* Mobile Live Chat Header */}
                <div className="mobile-chat-header shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <span className="mobile-chat-title">Live Chat</span>
                    <span className="mobile-chat-viewer-count flex items-center gap-1">
                        <Users size={12} className="text-gold" />
                        <span>256</span>
                    </span>
                </div>

                {/* Filters Row */}
                <div className="mobile-chat-filters shrink-0 flex gap-2 px-4 py-2 bg-black/20">
                    {(["All", "Paid", "Priority"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all ${
                                activeFilter === tab
                                    ? tab === "Priority" ? "bg-yellow-500/25 text-yellow-300 border border-yellow-500/40"
                                    : tab === "Paid" ? "bg-orange-500/25 text-orange-400 border border-orange-500/40"
                                    : "bg-gold/25 text-gold border border-gold/40"
                                : "text-white/40 hover:text-white/70 border border-transparent"
                            }`}
                        >
                            {tab === "Priority" ? "👑 Priority" : tab === "Paid" ? "🔥 Paid" : "All"}
                        </button>
                    ))}
                </div>

                {/* Pinned User Banner */}
                {activePinMessage && (
                    <div className="mx-4 mt-2 p-2.5 rounded-xl border border-pink-500/40 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.15)] shrink-0 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs">📌</span>
                                <span className="font-black text-[10px] text-pink-400 uppercase tracking-widest">Pinned to Top</span>
                            </div>
                            <span className="text-[10px] text-white/40 font-bold">
                                {Math.ceil((60 * 1000 - (currentTime - new Date(activePinMessage.created_at).getTime())) / 60000)}m left
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm shrink-0">👑</span>
                            <div className="flex-1 min-w-0 truncate">
                                <span className="font-bold text-xs text-white">@{activePinMessage.sender_name}</span>
                                {activePinMessage.sender_id && <UserBadgeDisplay userId={activePinMessage.sender_id} />}
                                <span className="text-[11px] text-white/70 ml-1.5">is the life of the party!</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Message Log */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-4 mobile-chat-messages">
                    {filteredMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-40">
                            <MessageCircleIcon />
                            <p className="text-xs italic text-center mt-2">
                                No messages yet. Start the conversation!
                            </p>
                        </div>
                    )}
                    {filteredMessages.map((msg) => (
                        <div key={msg.id} className="mobile-message-row">
                            <div className={`mobile-avatar-circle shrink-0 ${getAvatarBg(msg.sender_name)}`}>
                                {msg.sender_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="mobile-message-content flex-1 min-w-0">
                                <div className="mobile-message-meta">
                                    <span className="mobile-message-sender">@{msg.sender_name}</span>
                                    {msg.sender_id && <UserBadgeDisplay userId={msg.sender_id} />}
                                    {getMobileLaneBadge(msg)}
                                    {getStatusBadge(msg.status)}
                                </div>
                                <p className="mobile-message-body">{msg.body}</p>
                                {msg.creator_reply && (
                                    <div className="mobile-creator-reply">
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <span className="text-gold text-[11px] font-bold">@{hostName}</span>
                                            <span className="text-[8px] bg-gold/15 text-gold px-1 rounded uppercase font-black">Creator</span>
                                        </div>
                                        <div className="mobile-reply-content">
                                            {msg.creator_reply.split('\n').map((line, idx) => {
                                                const isLink = line.startsWith('http') || line.startsWith('/api/');
                                                if (isLink) {
                                                    if (line.match(/\.(webm|mp3|wav|m4a)$/i)) {
                                                        return <VoiceNotePlayer key={idx} src={line} />;
                                                    } else if (line.match(/\.(jpeg|jpg|gif|png)$/i)) {
                                                        return <img key={idx} src={line} alt="reply media" className="max-h-24 rounded mt-1" />;
                                                    } else if (line.match(/\.(mp4|ogg)$/i)) {
                                                        return <video key={idx} src={line} controls className="max-h-24 rounded mt-1" />;
                                                    }
                                                    return <a key={idx} href={line} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 mt-1 block truncate">{line}</a>;
                                                }
                                                return <span key={idx} className="block text-white/80">{line}</span>;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {msg.paid_amount > 0 && (
                                <span className="mobile-message-price shrink-0">{cs()}{msg.paid_amount}</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Input Bar */}
                <div className="mobile-chat-input-area shrink-0 px-4 pb-4 bg-black/40">
                    {/* Lane Selector */}
                    <div className="flex gap-1.5 mb-2.5">
                        {(Object.keys(LANE_CONFIG) as Lane[]).map((lane) => {
                            const config = LANE_CONFIG[lane];
                            const isActive = selectedLane === lane;
                            return (
                                <button
                                    key={lane}
                                    onClick={() => setSelectedLane(lane)}
                                    className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${isActive
                                        ? lane === "Priority" ? "bg-yellow-500/25 border-yellow-500/40 text-yellow-300"
                                        : lane === "Paid" ? "bg-orange-500/25 border-orange-500/40 text-orange-400"
                                        : "bg-gold/25 border-gold/40 text-gold"
                                        : "bg-white/5 border-white/5 text-white/40 hover:text-white/70"
                                    }`}
                                >
                                    {config.icon}
                                    <span>{lane}</span>
                                    {config.price > 0 && <span className="text-gold text-[9px] font-bold ml-0.5">{cs()}{config.price}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Inputs */}
                    <div className="flex gap-2 items-center">
                        <div className="flex-1 relative mobile-input-inner">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                                <EmojiPicker
                                    onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)}
                                    accentColor="hsl(45, 90%, 55%)"
                                    position="top"
                                    customTrigger={<Smile size={18} className="text-white/40 hover:text-white/80 transition-colors cursor-pointer" />}
                                />
                            </div>
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                placeholder={
                                    !roomId
                                        ? "Waiting for room..."
                                        : selectedLane === "Free"
                                            ? "Type a message..."
                                            : `${selectedLane} message (${cs()}${LANE_CONFIG[selectedLane].price})...`
                                }
                                disabled={!roomId}
                                className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-white/30 focus:outline-none focus:border-gold/50 disabled:opacity-50"
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || !roomId}
                            className={`mobile-send-btn flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 ${
                                selectedLane === "Priority"
                                    ? "border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10"
                                    : selectedLane === "Paid"
                                        ? "border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                                        : "border-gold/50 text-gold hover:bg-gold/10"
                            }`}
                        >
                            <Send size={11} />
                            <span>Send</span>
                        </button>
                    </div>
                </div>

                {/* Confirm Modal */}
                <SpendConfirmModal
                    isOpen={pendingSend}
                    onClose={() => setPendingSend(false)}
                    title={`Send ${selectedLane} Message`}
                    itemLabel={`${selectedLane} lane message`}
                    amount={LANE_CONFIG[selectedLane].price}
                    walletBalance={balance}
                    onConfirm={async () => {
                        await handlePaidSend();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="glass-card flex flex-col h-full overflow-hidden pgx-chat-wrapper">
            {/* Display Filters */}
            <div className="flex px-4 pt-3 pb-2 gap-2 border-b border-border mb-3 shrink-0">
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

            {/* Pinned User Banner */}
            {activePinMessage && (
                <div className="mx-4 mt-2 p-2 rounded-lg border border-pink-500/50 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.15)] shrink-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">📌</span>
                        <span className="font-bold text-xs text-pink-400 uppercase tracking-wider">Pinned to Top</span>
                        <span className="ml-auto text-[11px] text-muted-foreground font-semibold">
                            {Math.ceil((60 * 1000 - (currentTime - new Date(activePinMessage.created_at).getTime())) / 60000)}m left
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-base shrink-0">👑</span>
                        <div className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                            <span className="font-bold text-sm text-white">{activePinMessage.sender_name}</span>
                            {activePinMessage.sender_id && <UserBadgeDisplay userId={activePinMessage.sender_id} />}
                            <span className="text-xs text-white/70 ml-1.5">is the life of the party!</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 chat-scroll space-y-3 px-4 mb-2 mt-2 pgx-chat-messages hide-scrollbar pgx-chat-messages hide-scrollbar">
                {filteredMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8 italic">
                        No messages yet. Start the conversation!
                    </p>
                )}
                {filteredMessages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-primary font-medium text-sm">@{msg.sender_name}</span>
                            {msg.sender_id && <UserBadgeDisplay userId={msg.sender_id} />}
                            {getLaneBadge(msg)}
                            {msg.paid_amount > 0 && (
                                <span className="text-[10px] text-gold font-semibold">{cs()}{msg.paid_amount}</span>
                            )}
                            {getStatusBadge(msg.status)}
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">{msg.body}</p>
                        {msg.creator_reply && (
                            <div className="ml-4 pl-3 border-l-2 border-gold-light/30 py-1 text-sm leading-relaxed flex flex-col gap-1">
                                <p>
                                    <span className="text-gold-light font-semibold">@{hostName}</span>
                                </p>
                                <div className="text-foreground/90">
                                    {msg.creator_reply.split('\n').map((line, idx) => {
                                        const isLink = line.startsWith('http') || line.startsWith('/api/');
                                        if (isLink) {
                                            if (line.match(/\.(webm|mp3|wav|m4a)$/i)) {
                                                return <VoiceNotePlayer key={idx} src={line} />;
                                            } else if (line.match(/\.(jpeg|jpg|gif|png)$/i)) {
                                                return <img key={idx} src={line} alt="reply media" className="max-h-24 rounded mt-1" />;
                                            } else if (line.match(/\.(mp4|ogg)$/i)) {
                                                return <video key={idx} src={line} controls className="max-h-24 rounded mt-1" />;
                                            }
                                            return <a key={idx} href={line} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 mt-1 block truncate">{line}</a>;
                                        }
                                        return <span key={idx} className="block">{line}</span>;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Input Section */}
            <div className="px-4 pb-4 mt-auto relative shrink-0">
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
                                {config.price > 0 && <span className="text-gold text-[10px]">{cs()}{config.price}</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-2">
                    <EmojiPicker
                        onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)}
                        accentColor="hsl(45, 90%, 55%)"
                        position="top"
                    />
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
                                    : `${selectedLane} message (${cs()}${LANE_CONFIG[selectedLane].price})...`
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
                        {LANE_CONFIG[selectedLane].price > 0 ? `${cs()}${LANE_CONFIG[selectedLane].price}` : "Send"}
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
                }}
            />
        </div>
    );
};

export default ChatPanel;
