"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { X, Search, UserPlus, Loader2, Check, Clock, Percent, Send, AlertCircle } from "lucide-react";

type SearchedCreator = {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
};

type InviteStatus = "idle" | "sending" | "sent" | "error";

interface TodInviteCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string | null;
    roomId: string | null;
    onInviteSent?: () => void;
}

export default function TodInviteCreatorModal({
    isOpen,
    onClose,
    sessionId,
    roomId,
    onInviteSent,
}: TodInviteCreatorModalProps) {
    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchedCreator[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Selection state
    const [selectedCreator, setSelectedCreator] = useState<SearchedCreator | null>(null);
    const [splitPct, setSplitPct] = useState(20);
    const [message, setMessage] = useState("");

    // Invite state
    const [inviteStatus, setInviteStatus] = useState<InviteStatus>("idle");
    const [errorMsg, setErrorMsg] = useState("");

    // Portal mount
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
            setSearchResults([]);
            setSelectedCreator(null);
            setSplitPct(20);
            setMessage("");
            setInviteStatus("idle");
            setErrorMsg("");
        }
    }, [isOpen]);

    // Debounced creator search
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/v1/users/search?q=${encodeURIComponent(searchQuery.trim())}&role=creator`);
                const data = await res.json();
                setSearchResults(data.users || []);
            } catch (e) {
                console.error("Search error:", e);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [searchQuery]);

    // Send invite
    async function handleSendInvite() {
        if (!selectedCreator || !sessionId) return;

        setInviteStatus("sending");
        setErrorMsg("");

        try {
            const res = await fetch(`/api/v1/rooms/truth-dare-sessions/${sessionId}/invite-creator`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invited_creator_id: selectedCreator.id,
                    split_pct: splitPct,
                    message: message.trim() || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send invite");
            }

            setInviteStatus("sent");
            onInviteSent?.();

            // Auto-close after brief success display
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (e: any) {
            setInviteStatus("error");
            setErrorMsg(e.message || "Something went wrong");
        }
    }

    if (!mounted || !isOpen) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-md rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(236,72,153,0.2)]"
                style={{
                    background: "linear-gradient(145deg, rgba(20,10,30,0.97), rgba(15,5,25,0.98))",
                    border: "1px solid rgba(236,72,153,0.25)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid rgba(236,72,153,0.15)" }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-pink-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white leading-tight">Invite Creator</h2>
                            <p className="text-[10px] text-white/40 mt-0.5">Search & invite a creator to collab</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
                    >
                        <X className="w-4 h-4 text-white/60" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {/* SUCCESS STATE */}
                    {inviteStatus === "sent" ? (
                        <div className="flex flex-col items-center py-8 gap-3 animate-in zoom-in-50 fade-in duration-300">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center">
                                <Check className="w-8 h-8 text-green-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Invite Sent!</h3>
                            <p className="text-sm text-white/50 text-center">
                                {selectedCreator?.full_name || selectedCreator?.username} will be notified.
                            </p>
                        </div>
                    ) : !selectedCreator ? (
                        <>
                            {/* SEARCH STATE */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or username..."
                                    autoFocus
                                    className="w-full bg-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/25 outline-none border border-white/10 focus:border-pink-500/50 transition"
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 animate-spin" />
                                )}
                            </div>

                            {/* Results */}
                            {searchResults.length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider px-1">
                                        Creators Found
                                    </span>
                                    <div className="space-y-1 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                        {searchResults.map((creator) => (
                                            <button
                                                key={creator.id}
                                                onClick={() => setSelectedCreator(creator)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-transparent hover:border-pink-500/30 hover:bg-pink-500/5 transition group"
                                            >
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-pink-500/30 transition flex-shrink-0">
                                                    {creator.avatar_url ? (
                                                        <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center text-white/60 text-sm font-bold">
                                                            {(creator.full_name || creator.username || "?")[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <div className="text-sm font-semibold text-white truncate">
                                                        {creator.full_name || creator.username}
                                                    </div>
                                                    <div className="text-[11px] text-white/40 truncate">
                                                        @{creator.username}
                                                    </div>
                                                </div>
                                                <div className="px-2 py-1 rounded-md bg-pink-500/10 border border-pink-500/20">
                                                    <span className="text-[10px] text-pink-300 font-bold uppercase">Creator</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty state */}
                            {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
                                <div className="text-center py-8 text-white/30">
                                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No creators found matching &quot;{searchQuery}&quot;</p>
                                </div>
                            )}

                            {/* Initial state */}
                            {searchQuery.trim().length < 2 && !isSearching && (
                                <div className="text-center py-8 text-white/20">
                                    <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs">Type at least 2 characters to search creators</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* CONFIGURATION STATE — Creator selected */}
                            {/* Selected creator card */}
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-pink-500/20">
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-pink-500/30 flex-shrink-0">
                                    {selectedCreator.avatar_url ? (
                                        <img src={selectedCreator.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center text-white/60 text-base font-bold">
                                            {(selectedCreator.full_name || selectedCreator.username || "?")[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-white truncate">
                                        {selectedCreator.full_name || selectedCreator.username}
                                    </div>
                                    <div className="text-[11px] text-white/40 truncate">@{selectedCreator.username}</div>
                                </div>
                                <button
                                    onClick={() => setSelectedCreator(null)}
                                    className="text-[10px] text-pink-300 font-semibold hover:text-pink-200 px-2 py-1 rounded-md bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition"
                                >
                                    Change
                                </button>
                            </div>

                            {/* Split percentage */}
                            <div>
                                <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                                    <Percent className="w-3 h-3" />
                                    Split Earning Percentage
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={1}
                                        max={99}
                                        value={splitPct}
                                        onChange={(e) => setSplitPct(Number(e.target.value))}
                                        className="flex-1 h-2 appearance-none rounded-full outline-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, rgb(236,72,153) ${splitPct}%, rgba(255,255,255,0.1) ${splitPct}%)`,
                                        }}
                                    />
                                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                                        <input
                                            type="number"
                                            min={1}
                                            max={99}
                                            value={splitPct}
                                            onChange={(e) => setSplitPct(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                                            className="w-10 bg-transparent text-white text-sm font-bold text-center outline-none"
                                        />
                                        <span className="text-white/40 text-xs">%</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 text-[10px] text-white/30 px-0.5">
                                    <span>You keep: <span className="text-green-400 font-bold">{100 - splitPct}%</span></span>
                                    <span>Collab gets: <span className="text-pink-400 font-bold">{splitPct}%</span></span>
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                                    <Send className="w-3 h-3" />
                                    Message (optional)
                                </label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                                    placeholder="e.g. Let's go live together! 🔥"
                                    maxLength={200}
                                    rows={2}
                                    className="w-full bg-white/5 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none border border-white/10 focus:border-pink-500/50 transition resize-none"
                                />
                                <div className="text-right text-[10px] text-white/20 mt-0.5">{message.length}/200</div>
                            </div>

                            {/* Error */}
                            {inviteStatus === "error" && errorMsg && (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    <p className="text-xs text-red-300">{errorMsg}</p>
                                </div>
                            )}

                            {/* Send button */}
                            <button
                                onClick={handleSendInvite}
                                disabled={inviteStatus === "sending"}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-pink-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {inviteStatus === "sending" ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending Invite...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Invite — {splitPct}% Split
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
}
