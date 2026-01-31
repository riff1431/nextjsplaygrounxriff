"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { AdminTable, AdminSectionTitle } from "../shared/AdminTable";
import { NeonButton } from "../shared/NeonCard";
import { AdminPill } from "../shared/AdminPill";
import { Plus, Trash2, Edit2, MessageSquare, Filter, RefreshCcw } from "lucide-react";

interface SystemPrompt {
    id: string;
    created_at: string;
    type: 'truth' | 'dare';
    tier: 'bronze' | 'silver' | 'gold';
    content: string;
}

export default function SystemPromptManager() {
    const supabase = createClient();
    const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterTier, setFilterTier] = useState<string>('all');

    // Edit/Create State
    const [isEditing, setIsEditing] = useState(false);
    const [editPrompt, setEditPrompt] = useState<Partial<SystemPrompt>>({ type: 'truth', tier: 'bronze', content: '' });

    async function fetchPrompts() {
        setLoading(true);
        let query = supabase.from('system_prompts').select('*').order('created_at', { ascending: false });

        if (filterType !== 'all') query = query.eq('type', filterType);
        if (filterTier !== 'all') query = query.eq('tier', filterTier);

        const { data, error } = await query;
        if (error) console.error("Error fetching prompts:", error);
        else setPrompts(data || []);
        setLoading(false);
    }

    useEffect(() => {
        fetchPrompts();
    }, [filterType, filterTier]);

    async function handleSave() {
        if (!editPrompt.content) return alert("Content is required");

        if (editPrompt.id) {
            // Update
            const { error } = await supabase
                .from('system_prompts')
                .update({
                    content: editPrompt.content,
                    type: editPrompt.type,
                    tier: editPrompt.tier
                })
                .eq('id', editPrompt.id);
            if (error) alert("Failed to update: " + error.message);
        } else {
            // Create
            const { error } = await supabase
                .from('system_prompts')
                .insert({
                    content: editPrompt.content,
                    type: editPrompt.type,
                    tier: editPrompt.tier
                });
            if (error) alert("Failed to create: " + error.message);
        }

        setIsEditing(false);
        setEditPrompt({ type: 'truth', tier: 'bronze', content: '' });
        fetchPrompts();
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this prompt?")) return;
        const { error } = await supabase.from('system_prompts').delete().eq('id', id);
        if (error) alert("Failed to delete");
        else fetchPrompts();
    }

    function openEdit(p: SystemPrompt) {
        setEditPrompt(p);
        setIsEditing(true);
    }

    function openNew() {
        setEditPrompt({ type: 'truth', tier: 'bronze', content: '' });
        setIsEditing(true);
    }

    return (
        <div className="space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                <AdminSectionTitle
                    icon={<MessageSquare className="w-5 h-5 text-pink-400" />}
                    title="System Truth & Dare"
                    sub="Manage content for automated prompts"
                    right={
                        <NeonButton onClick={openNew}>
                            <Plus className="w-4 h-4 mr-2" /> Add Prompt
                        </NeonButton>
                    }
                />

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mt-6">
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent border-none text-sm text-white focus:ring-0"
                        >
                            <option value="all">All Types</option>
                            <option value="truth">Truth</option>
                            <option value="dare">Dare</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={filterTier}
                            onChange={(e) => setFilterTier(e.target.value)}
                            className="bg-transparent border-none text-sm text-white focus:ring-0"
                        >
                            <option value="all">All Tiers</option>
                            <option value="bronze">Bronze</option>
                            <option value="silver">Silver</option>
                            <option value="gold">Gold</option>
                        </select>
                    </div>
                    <button onClick={fetchPrompts} className="p-2 hover:bg-white/10 rounded-full transition">
                        <RefreshCcw className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Content Table */}
            <AdminTable
                headers={["Prompt Content", "Type", "Tier", "Actions"]}
                data={prompts.map(p => ({
                    id: p.id,
                    content: (
                        <div className="max-w-lg truncate" title={p.content}>
                            {p.content}
                        </div>
                    ),
                    type: (
                        <AdminPill tone={p.type === 'truth' ? 'cyan' : 'red'}>
                            {p.type.toUpperCase()}
                        </AdminPill>
                    ),
                    tier: (
                        <AdminPill tone={p.tier === 'gold' ? 'amber' : p.tier === 'silver' ? 'cyan' : 'pink'}>
                            {p.tier.toUpperCase()}
                        </AdminPill>
                    ),
                    actions: (
                        <div className="flex gap-2">
                            <button onClick={() => openEdit(p)} className="p-1 hover:text-cyan-400 transition"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-1 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    )
                }))}
                isLoading={loading}
            />

            {/* Edit Modal (Simple Inline Overlay for MVP) */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">{editPrompt.id ? 'Edit Prompt' : 'New Prompt'}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Type</label>
                                <div className="flex gap-2">
                                    {['truth', 'dare'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setEditPrompt({ ...editPrompt, type: t as any })}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold border ${editPrompt.type === t ? (t === 'truth' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-red-900/30 border-red-500 text-red-400') : 'bg-black border-white/10 text-gray-500'}`}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Tier</label>
                                <div className="flex gap-2">
                                    {['bronze', 'silver', 'gold'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setEditPrompt({ ...editPrompt, tier: t as any })}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold border ${editPrompt.tier === t ? 'bg-white/10 border-white text-white' : 'bg-black border-white/10 text-gray-500'}`}
                                        >
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Content</label>
                                <textarea
                                    value={editPrompt.content}
                                    onChange={(e) => setEditPrompt({ ...editPrompt, content: e.target.value })}
                                    rows={4}
                                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-white text-sm focus:border-cyan-500 outline-none"
                                    placeholder="Enter the truth question or dare challenge..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-bold">Cancel</button>
                            <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
