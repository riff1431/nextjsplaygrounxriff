import { formatDistanceToNow } from "date-fns";
import { Search, User } from "lucide-react";

type Conversation = {
    id: string;
    participants: {
        user_id: string;
        username: string;
        avatar_url: string | null;
    }[];
    last_message?: {
        content: string | null;
        type: string;
        created_at: string;
        is_read: boolean;
        sender_id: string;
    };
    updated_at: string;
};

type Props = {
    conversations: Conversation[];
    activeId: string | null;
    onSelect: (id: string) => void;
    currentUserId: string;
    loading?: boolean;
};

export default function ConversationList({ conversations, activeId, onSelect, currentUserId, loading }: Props) {
    if (loading) {
        return (
            <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-12 h-12 bg-white/5 rounded-full" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-white/5 rounded w-1/2" />
                            <div className="h-3 bg-white/5 rounded w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>No messages yet.</p>
                <p className="text-xs mt-1">Start chatting with creators!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-pink-500/50"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => {
                    // Find the OTHER participant
                    const other = conv.participants.find(p => p.user_id !== currentUserId) || conv.participants[0];
                    const isUnread = conv.last_message?.sender_id !== currentUserId && conv.last_message?.is_read === false;

                    return (
                        <button
                            key={conv.id}
                            onClick={() => onSelect(conv.id)}
                            className={`w-full p-4 flex gap-3 transition-colors border-b border-white/5 text-left group ${activeId === conv.id ? "bg-white/10 border-l-2 border-l-pink-500" : "hover:bg-white/5 border-l-2 border-l-transparent"
                                }`}
                        >
                            <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800">
                                    {other?.avatar_url ? (
                                        <img src={other.avatar_url} alt={other.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-6 h-6 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                {isUnread && (
                                    <div className="absolute top-0 right-0 w-3 h-3 bg-pink-500 rounded-full border-2 border-black" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className={`text-sm truncate ${isUnread ? "font-bold text-white" : "font-medium text-gray-200"}`}>
                                        {other?.username || "Unknown"}
                                    </span>
                                    {conv.last_message && (
                                        <span className="text-[10px] text-gray-500 flex-shrink-0">
                                            {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false }).replace('about ', '')}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs truncate ${isUnread ? "text-pink-200 font-medium" : "text-gray-400"}`}>
                                    {conv.last_message?.content ||
                                        (conv.last_message?.type === 'image' ? 'Sent an image' :
                                            conv.last_message?.type === 'video' ? 'Sent a video' :
                                                'No messages')}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
