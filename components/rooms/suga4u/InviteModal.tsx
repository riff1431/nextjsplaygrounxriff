"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Search, Copy, Check, UserPlus, ExternalLink, User } from "lucide-react";
import { toast } from "sonner";

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string | null;
}

type SearchUser = {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
};

export default function InviteModal({ isOpen, onClose, roomId }: InviteModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchUser[]>([]);
    const [searching, setSearching] = useState(false);
    const [copied, setCopied] = useState(false);
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());
    const [sendingId, setSendingId] = useState<string | null>(null);

    const shareUrl = typeof window !== "undefined" && roomId
        ? `${window.location.origin}/rooms/suga4u?roomId=${roomId}`
        : "";

    const shareText = "💖 Join me on this Suga4U session! ";

    // Debounced search
    useEffect(() => {
        if (!query.trim() || query.trim().length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/v1/users/search?q=${encodeURIComponent(query.trim())}`);
                const data = await res.json();
                if (data.users) setResults(data.users);
            } catch {
                console.error("Search failed");
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleCopyLink = useCallback(async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success("Link copied to clipboard! 🔗");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy link");
        }
    }, [shareUrl]);

    const handleInvite = useCallback(async (inviteeId: string) => {
        if (!roomId) return;
        setSendingId(inviteeId);
        try {
            const res = await fetch(`/api/v1/rooms/${roomId}/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invitee_id: inviteeId }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSentIds(prev => new Set(prev).add(inviteeId));
                toast.success("Invitation sent! 💖");
            } else {
                toast.error(data.error || "Failed to send invitation");
            }
        } catch {
            toast.error("Failed to send invitation");
        } finally {
            setSendingId(null);
        }
    }, [roomId]);

    const socialLinks = [
        {
            name: "WhatsApp",
            icon: "💬",
            color: "from-green-600 to-green-500",
            url: `https://wa.me/?text=${encodeURIComponent(shareText + shareUrl)}`,
        },
        {
            name: "Telegram",
            icon: "✈️",
            color: "from-blue-500 to-blue-400",
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
        },
        {
            name: "Messenger",
            icon: "💜",
            color: "from-purple-600 to-purple-400",
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
        },
        {
            name: "Instagram",
            icon: "📸",
            color: "from-pink-600 to-orange-400",
            action: handleCopyLink, // Instagram has no direct share URL
        },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="w-full max-w-lg glass-panel border border-gold/30 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gold/15">
                    <div>
                        <h2 className="text-lg font-bold glow-text-gold">Invite Friends</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Share this session or invite someone directly</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                    {/* Section 1: Share Link */}
                    <div>
                        <p className="section-title mb-3">📎 Share Session Link</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-black/40 border border-gold/15 rounded-lg px-3 py-2.5 text-xs text-muted-foreground truncate font-mono">
                                {shareUrl || "No active session"}
                            </div>
                            <button
                                onClick={handleCopyLink}
                                disabled={!shareUrl}
                                className="btn-gold px-3 py-2.5 rounded-lg text-xs flex items-center gap-1.5 transition-all disabled:opacity-40"
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                    </div>

                    {/* Section 2: Social Media Sharing */}
                    <div>
                        <p className="section-title mb-3">📱 Share to Social Media</p>
                        <div className="grid grid-cols-4 gap-2">
                            {socialLinks.map((social) => (
                                <button
                                    key={social.name}
                                    onClick={() => {
                                        if (social.action) {
                                            social.action();
                                            toast.success("Link copied! Paste it in Instagram DM 📸");
                                        } else if (social.url) {
                                            window.open(social.url, "_blank", "noopener,noreferrer");
                                        }
                                    }}
                                    disabled={!shareUrl}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-br ${social.color} bg-opacity-20 hover:scale-105 transition-all duration-200 border border-white/10 disabled:opacity-40 disabled:hover:scale-100`}
                                >
                                    <span className="text-xl">{social.icon}</span>
                                    <span className="text-[10px] font-semibold tracking-wide">{social.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gold/15" />
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">or invite directly</span>
                        <div className="flex-1 h-px bg-gold/15" />
                    </div>

                    {/* Section 3: User Search */}
                    <div>
                        <p className="section-title mb-3">🔍 Search &amp; Invite Users</p>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by name or username..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-black/40 border border-gold/20 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-pink/50 focus:ring-1 focus:ring-pink/30 transition"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto chat-scroll">
                            {searching ? (
                                <div className="text-center py-6 text-muted-foreground text-sm">
                                    <div className="inline-block w-4 h-4 border-2 border-gold/40 border-t-gold rounded-full animate-spin mr-2" />
                                    Searching...
                                </div>
                            ) : results.length > 0 ? (
                                results.map((u) => (
                                    <div
                                        key={u.id}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition group"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-muted border border-gold/20 overflow-hidden flex-shrink-0">
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate group-hover:text-gold transition">{u.full_name || u.username}</p>
                                            <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                                        </div>
                                        {sentIds.has(u.id) ? (
                                            <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold px-3 py-1.5">
                                                <Check size={14} /> Sent
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleInvite(u.id)}
                                                disabled={sendingId === u.id}
                                                className="btn-pink px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 transition-all hover:scale-105 disabled:opacity-50"
                                            >
                                                {sendingId === u.id ? (
                                                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <UserPlus size={12} />
                                                )}
                                                Invite
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : query.length >= 2 ? (
                                <div className="text-center py-6 text-muted-foreground text-sm">
                                    No users found for &quot;{query}&quot;
                                </div>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground text-xs">
                                    Type at least 2 characters to search
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
