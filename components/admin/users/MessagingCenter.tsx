"use strict";
import React, { useState } from "react";
import { MessageCircle, Search, Mail, Loader2, Send } from "lucide-react";
import { NeonCard, NeonButton } from "../shared/NeonCard";
import { AdminSectionTitle, AdminTable } from "../shared/AdminTable";
import { AdminPill } from "../shared/AdminPill";
import { toast } from "sonner";

export default function MessagingCenter() {
    const [activeTab, setActiveTab] = useState<'inbox' | 'broadcast'>('inbox');
    
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [isSending, setIsSending] = useState(false);

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
                        onClick={() => setActiveTab('inbox')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${activeTab === 'inbox' ? 'bg-pink-500/20 text-pink-200 border border-pink-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        Inbox (0)
                    </button>
                    <button
                        onClick={() => setActiveTab('broadcast')}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${activeTab === 'broadcast' ? 'bg-pink-500/20 text-pink-200 border border-pink-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        Broadcast
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-[300px] border border-white/10 rounded-2xl bg-black/30 p-4">
                    {activeTab === 'inbox' ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                            <Mail className="w-8 h-8 opacity-50" />
                            <p className="text-sm">No new support messages.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
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
