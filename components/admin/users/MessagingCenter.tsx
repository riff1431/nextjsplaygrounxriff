"use strict";
import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Search, Mail, Loader2, Send, ArrowLeft, User, CheckCheck, Check } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle } from "../shared/AdminTable";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow, format } from "date-fns";

type Conversation = {
    id: string;
    other_user: {
        id: string;
        username: string;
        full_name: string | null;
        avatar_url: string | null;
    };
    last_message: any;
    unread_count: number;
    updated_at: string;
};

type Message = {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string | null;
    type: string;
    media_url: string | null;
    is_read: boolean;
    created_at: string;
};

export default function MessagingCenter() {
    const [activeTab, setActiveTab] = useState<'inbox' | 'broadcast'>('inbox');

    // Broadcast state
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Inbox state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const [searchFilter, setSearchFilter] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const [adminUserId, setAdminUserId] = useState<string | null>(null);

    // Fetch admin user ID
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setAdminUserId(user.id);
        };
        getUser();
    }, []);

    // Fetch conversations
    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        setLoadingConvos(true);
        try {
            const res = await fetch("/api/admin/messages");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setConversations(data.conversations || []);
        } catch (err: any) {
            console.error("Failed to fetch admin messages:", err);
        } finally {
            setLoadingConvos(false);
        }
    };

    // When a conversation is selected, fetch messages + mark as read
    useEffect(() => {
        if (!activeConvId) return;
        fetchMessages(activeConvId);
        markAsRead(activeConvId);
    }, [activeConvId]);

    const fetchMessages = async (convId: string) => {
        setLoadingMsgs(true);
        try {
            const res = await fetch(`/api/admin/messages/${convId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessages(data.messages || []);
        } catch (err: any) {
            console.error("Failed to fetch messages:", err);
            toast.error("Failed to load messages");
        } finally {
            setLoadingMsgs(false);
        }
    };

    const markAsRead = async (convId: string) => {
        try {
            await fetch(`/api/admin/messages/${convId}`, { method: "PATCH" });
            // Update local unread count
            setConversations(prev =>
                prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
            );
        } catch { }
    };

    // Real-time subscription for new messages
    useEffect(() => {
        if (!activeConvId) return;

        const channel = supabase
            .channel(`admin-chat:${activeConvId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'dm_messages',
                filter: `conversation_id=eq.${activeConvId}`
            }, (payload) => {
                const newMsg = payload.new as Message;
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                // Auto-mark as read if not our message
                if (newMsg.sender_id !== adminUserId) {
                    markAsRead(activeConvId);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeConvId, adminUserId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loadingMsgs]);

    // Send reply
    const handleReply = async () => {
        if (!replyText.trim() || !activeConvId) return;
        setSendingReply(true);
        try {
            const res = await fetch(`/api/admin/messages/${activeConvId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: replyText.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Optimistically add message
            if (data.message) {
                setMessages(prev => {
                    if (prev.some(m => m.id === data.message.id)) return prev;
                    return [...prev, data.message];
                });
            }
            setReplyText("");

            // Update conversation list last message
            setConversations(prev =>
                prev.map(c => c.id === activeConvId ? {
                    ...c,
                    last_message: data.message,
                    updated_at: data.message.created_at
                } : c)
            );
        } catch (err: any) {
            toast.error("Failed to send: " + (err.message || "Unknown error"));
        } finally {
            setSendingReply(false);
        }
    };

    // Broadcast handler
    const handleBroadcast = async () => {
        if (!subject.trim() || !body.trim()) {
            toast.error("Subject and Body are required");
            return;
        }

        setIsSending(true);
        try {
            const res = await fetch("/api/admin/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject: subject.trim(), body: body.trim() })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send broadcast");

            toast.success(`Broadcast sent to ${data.count} users securely`);
            setSubject("");
            setBody("");
        } catch (error: any) {
            console.error("Broadcast failed", error);
            toast.error(error.message || "Failed to send broadcast");
        } finally {
            setIsSending(false);
        }
    };

    // Filter conversations by search
    const filteredConvos = conversations.filter(c => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
            c.other_user.username?.toLowerCase().includes(q) ||
            c.other_user.full_name?.toLowerCase().includes(q)
        );
    });

    // Active conversation data
    const activeConvo = conversations.find(c => c.id === activeConvId);

    // Unread total
    const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);

    return (
        <NeonCard className="p-5">
            <AdminSectionTitle
                icon={<MessageCircle className="w-4 h-4" />}
                title="Messaging Center"
                sub="System-wide announcements and direct support."
            />

            <div className="mt-4 flex gap-4">
                {/* Sidebar */}
                <div className="w-48 flex-shrink-0 space-y-2">
                    <button
                        onClick={() => { setActiveTab('inbox'); setActiveConvId(null); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${activeTab === 'inbox' ? 'bg-pink-500/20 text-pink-200 border border-pink-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        <span className="flex items-center justify-between">
                            Inbox
                            {unreadTotal > 0 && (
                                <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {unreadTotal}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('broadcast')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${activeTab === 'broadcast' ? 'bg-pink-500/20 text-pink-200 border border-pink-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        Broadcast
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-[400px] border border-white/10 rounded-2xl bg-black/30 overflow-hidden flex">
                    {activeTab === 'inbox' ? (
                        <>
                            {/* Conversation List */}
                            <div className={`w-64 flex-shrink-0 border-r border-white/10 flex flex-col ${activeConvId ? 'hidden lg:flex' : 'flex'}`}>
                                {/* Search */}
                                <div className="p-3 border-b border-white/10">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={searchFilter}
                                            onChange={(e) => setSearchFilter(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-cyan-500/50 outline-none transition"
                                        />
                                    </div>
                                </div>

                                {/* List */}
                                <div className="flex-1 overflow-y-auto">
                                    {loadingConvos ? (
                                        <div className="p-4 space-y-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex gap-2 animate-pulse">
                                                    <div className="w-9 h-9 bg-white/5 rounded-full" />
                                                    <div className="flex-1 space-y-1.5 py-1">
                                                        <div className="h-3 bg-white/5 rounded w-2/3" />
                                                        <div className="h-2.5 bg-white/5 rounded w-4/5" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : filteredConvos.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 p-4">
                                            <Mail className="w-6 h-6 opacity-40" />
                                            <p className="text-xs">{conversations.length === 0 ? "No messages yet" : "No matches"}</p>
                                        </div>
                                    ) : (
                                        filteredConvos.map(conv => (
                                            <button
                                                key={conv.id}
                                                onClick={() => setActiveConvId(conv.id)}
                                                className={`w-full p-3 flex gap-2.5 text-left transition border-b border-white/5 ${activeConvId === conv.id
                                                    ? 'bg-white/10 border-l-2 border-l-pink-500'
                                                    : 'hover:bg-white/5 border-l-2 border-l-transparent'
                                                    }`}
                                            >
                                                {/* Avatar */}
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-9 h-9 rounded-full bg-gray-800 overflow-hidden">
                                                        {conv.other_user.avatar_url ? (
                                                            <img src={conv.other_user.avatar_url} alt={conv.other_user.username} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <User className="w-4 h-4 text-gray-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {conv.unread_count > 0 && (
                                                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-pink-500 rounded-full border border-black" />
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <span className={`text-xs truncate ${conv.unread_count > 0 ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>
                                                            {conv.other_user.username || "Unknown"}
                                                        </span>
                                                        {conv.last_message && (
                                                            <span className="text-[9px] text-gray-500 flex-shrink-0 ml-1">
                                                                {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false }).replace('about ', '')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-[11px] truncate ${conv.unread_count > 0 ? 'text-pink-200 font-medium' : 'text-gray-500'}`}>
                                                        {conv.last_message?.content ||
                                                            (conv.last_message?.type === 'image' ? '📷 Image' :
                                                                conv.last_message?.type === 'video' ? '🎬 Video' :
                                                                    'No messages')}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Chat Thread */}
                            <div className={`flex-1 flex flex-col ${!activeConvId ? 'hidden lg:flex' : 'flex'}`}>
                                {activeConvId && activeConvo ? (
                                    <>
                                        {/* Thread Header */}
                                        <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-black/20">
                                            <button
                                                onClick={() => setActiveConvId(null)}
                                                className="lg:hidden p-1 hover:bg-white/10 rounded-lg transition"
                                            >
                                                <ArrowLeft className="w-4 h-4 text-gray-400" />
                                            </button>
                                            <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden flex-shrink-0">
                                                {activeConvo.other_user.avatar_url ? (
                                                    <img src={activeConvo.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-white">{activeConvo.other_user.username}</h4>
                                                {activeConvo.other_user.full_name && (
                                                    <p className="text-[10px] text-gray-400">{activeConvo.other_user.full_name}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Messages */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                                            {loadingMsgs ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
                                                </div>
                                            ) : messages.length === 0 ? (
                                                <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                                                    No messages in this conversation yet.
                                                </div>
                                            ) : (
                                                messages.map(msg => {
                                                    const isAdmin = msg.sender_id === adminUserId;
                                                    return (
                                                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${isAdmin
                                                                ? 'bg-gradient-to-br from-pink-600 to-fuchsia-700 text-white rounded-br-sm'
                                                                : 'bg-white/5 text-gray-200 rounded-bl-sm border border-white/10'
                                                                }`}>
                                                                {/* Media */}
                                                                {msg.type === 'image' && msg.media_url && (
                                                                    <div className="mb-2 rounded-lg overflow-hidden max-w-[200px]">
                                                                        <img src={msg.media_url} alt="Attachment" className="w-full h-auto" />
                                                                    </div>
                                                                )}
                                                                {msg.type === 'video' && msg.media_url && (
                                                                    <div className="mb-2 rounded-lg overflow-hidden max-w-[200px]">
                                                                        <video controls src={msg.media_url} className="w-full rounded-lg" />
                                                                    </div>
                                                                )}

                                                                {/* Text */}
                                                                {msg.content && (
                                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                                        {msg.content}
                                                                    </p>
                                                                )}

                                                                {/* Meta */}
                                                                <div className={`flex items-center gap-1 mt-1 text-[9px] ${isAdmin ? 'justify-end text-pink-200/70' : 'text-gray-500'}`}>
                                                                    <span>{format(new Date(msg.created_at), "h:mm a")}</span>
                                                                    {isAdmin && (
                                                                        msg.is_read
                                                                            ? <CheckCheck className="w-3 h-3 text-blue-300" />
                                                                            : <Check className="w-3 h-3 text-pink-300/60" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {/* Reply Input */}
                                        <div className="p-3 border-t border-white/10 flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type a reply..."
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleReply();
                                                    }
                                                }}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-pink-500/50 outline-none transition"
                                                disabled={sendingReply}
                                            />
                                            <NeonButton
                                                variant="pink"
                                                onClick={handleReply}
                                                disabled={sendingReply || !replyText.trim()}
                                            >
                                                {sendingReply ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                            </NeonButton>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                                        <Mail className="w-8 h-8 opacity-50" />
                                        <p className="text-sm">Select a conversation to view messages</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Broadcast Tab */
                        <div className="flex-1 p-4 space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Subject</label>
                                <input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-500/50 outline-none transition"
                                    placeholder="Announcement Title"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Message Body</label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white h-32 focus:border-cyan-500/50 outline-none transition resize-none custom-scrollbar"
                                    placeholder="Write your update here..."
                                />
                            </div>
                            <div className="flex justify-end">
                                <NeonButton variant="pink" onClick={handleBroadcast} disabled={isSending || !subject.trim() || !body.trim()}>
                                    {isSending ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-2" /> Send Broadcast</>
                                    )}
                                </NeonButton>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </NeonCard>
    );
}
