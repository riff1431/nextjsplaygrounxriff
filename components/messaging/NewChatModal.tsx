import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Assuming we have these or standard divs
import { Search, User, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onStartChat: (targetUserId: string) => Promise<void>;
    currentUserId: string;
};

export default function NewChatModal({ isOpen, onClose, onStartChat, currentUserId }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setSearching(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url')
                .neq('id', currentUserId)
                .ilike('username', `%${query}%`)
                .limit(5);

            if (data) setResults(data);
            setSearching(false);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query, currentUserId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">New Message</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search people..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[300px]">
                        {searching ? (
                            <div className="text-center py-4 text-gray-500 text-sm">Searching...</div>
                        ) : results.length > 0 ? (
                            results.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => onStartChat(user.id)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition text-left group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-4 h-4 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white group-hover:text-pink-400 transition">{user.username}</div>
                                        <div className="text-xs text-gray-500">{user.full_name}</div>
                                    </div>
                                </button>
                            ))
                        ) : query && (
                            <div className="text-center py-4 text-gray-500 text-sm">No users found</div>
                        )}
                        {!query && (
                            <div className="text-center py-4 text-gray-500 text-xs">
                                Type to search for creators and friends
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
