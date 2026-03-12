"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSuga4U } from "@/hooks/useSuga4U";

const S4uCreatorSecrets = ({ roomId }: { roomId?: string }) => {
    const { secrets, createSecret, deleteSecret } = useSuga4U(roomId || null);
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [price, setPrice] = useState("");

    const handleAdd = async () => {
        if (!name || !price) return;
        await createSecret(name, desc, Number(price));
        setIsAdding(false);
        setName("");
        setDesc("");
        setPrice("");
    };

    return (
        <div className="s4u-creator-glass-panel p-4 flex flex-col h-full">
            <h3 className="s4u-creator-font-display text-lg font-bold text-white mb-3">Creator Secrets</h3>
            <div className="flex-1 overflow-y-auto min-h-0 chat-scroll">
                <div className="space-y-3 pr-2">
                    {secrets.length === 0 && !isAdding && (
                        <p className="text-xs text-white/50 text-center py-4">No secrets created yet</p>
                    )}
                    {secrets.map((s) => (
                        <div key={s.id} className="bg-white/5 rounded-lg px-3 py-2.5 relative group">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🌸</span>
                                    <span className="text-sm font-semibold text-white">{s.name}</span>
                                </div>
                                <span className="text-sm font-bold s4u-creator-text-gold">${s.unlock_price}</span>
                            </div>
                            {s.description && <p className="text-xs text-white/50 mb-2 ml-7">{s.description}</p>}
                            <button 
                                onClick={() => deleteSecret(s.id)}
                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    
                    {isAdding && (
                        <div className="bg-white/10 border border-gold/30 rounded-lg p-3 space-y-2">
                            <input type="text" placeholder="Secret Title" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/20 rounded px-2 py-1 text-sm text-white outline-none" />
                            <input type="text" placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-black/20 rounded px-2 py-1 text-sm text-white outline-none" />
                            <input type="number" placeholder="Price ($)" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black/20 rounded px-2 py-1 text-sm text-white outline-none" />
                            <div className="flex gap-2">
                                <button onClick={handleAdd} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold py-1 rounded">Save</button>
                                <button onClick={() => setIsAdding(false)} className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold py-1 rounded">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {!isAdding && (
                <button onClick={() => setIsAdding(true)} className="mt-3 flex items-center gap-1 text-sm s4u-creator-text-primary hover:opacity-80 transition-opacity">
                    <Plus className="w-4 h-4" /> Add item
                </button>
            )}
        </div>
    );
};

export default S4uCreatorSecrets;
