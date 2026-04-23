"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
        ? `${window.location.origin}${window.location.pathname}?roomId=${roomId}`
        : "";

    const shareText = "💖 Join me on this live session! ";

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

    /* ─── Brand SVG Icons ─── */
    const WhatsAppIcon = () => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    );

    const TelegramIcon = () => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
    );

    const MessengerIcon = () => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
            <path d="M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 00-.64.05l-2.39 1.05a.96.96 0 01-1.35-.85l-.07-2.14a.97.97 0 00-.32-.68A11.39 11.389 0 01.002 11.64zm8.32-2.19l-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 00-2.61.48z"/>
        </svg>
    );

    const InstagramIcon = () => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
            <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.88 0 1.441 1.441 0 012.88 0z"/>
        </svg>
    );

    const socialLinks = [
        {
            name: "WhatsApp",
            icon: <WhatsAppIcon />,
            color: "from-[#25D366] to-[#128C7E]",
            url: `https://wa.me/?text=${encodeURIComponent(shareText + shareUrl)}`,
        },
        {
            name: "Telegram",
            icon: <TelegramIcon />,
            color: "from-[#2AABEE] to-[#229ED9]",
            url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
        },
        {
            name: "Messenger",
            icon: <MessengerIcon />,
            color: "from-[#00B2FF] to-[#006AFF]",
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
        },
        {
            name: "Instagram",
            icon: <InstagramIcon />,
            color: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
            action: handleCopyLink,
        },
    ];

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
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
                                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl bg-gradient-to-br ${social.color} hover:scale-105 hover:shadow-lg transition-all duration-200 border border-white/15 disabled:opacity-40 disabled:hover:scale-100`}
                                >
                                    {social.icon}
                                    <span className="text-[10px] font-bold tracking-wide text-white">{social.name}</span>
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
        </div>,
        document.body
    );
}
