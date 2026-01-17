import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { MoreVertical, Phone, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type Props = {
    conversationId: string;
    currentUser: any;
    otherUser: any;
};

export default function ChatWindow({ conversationId, currentUser, otherUser }: Props) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initial fetch
    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('dm_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (!error) {
                setMessages(data || []);
                // Mark as read
                await supabase
                    .from('dm_messages')
                    .update({ is_read: true })
                    .eq('conversation_id', conversationId)
                    .neq('sender_id', currentUser.id)
                    .eq('is_read', false);
            }
            setLoading(false);
        };

        fetchMessages();

        // Initialize sound - optional, safely ignored if missing
        // audioRef.current = new Audio('/sounds/message_pop.mp3');
    }, [conversationId, currentUser.id]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'dm_messages',
                filter: `conversation_id=eq.${conversationId}`
            }, (payload) => {
                const newMessage = payload.new;
                setMessages((prev) => {
                    // Prevent duplicates (optimistic update vs real-time event)
                    if (prev.some(m => m.id === newMessage.id)) {
                        return prev;
                    }
                    return [...prev, newMessage];
                });

                // Play sound if not my message
                if (newMessage.sender_id !== currentUser.id) {
                    // try play sound
                    try { audioRef.current?.play(); } catch (e) { }

                    // Mark as read immediately if window is open
                    supabase.from('dm_messages')
                        .update({ is_read: true })
                        .eq('id', newMessage.id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, currentUser.id]);

    const handleSendMessage = async (text: string, file: File | null) => {
        let mediaUrl = null;
        let type = 'text';

        // Upload file if exists
        if (file) {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}.${ext}`;
            const { data, error } = await supabase.storage
                .from('dm_media')
                .upload(`${conversationId}/${fileName}`, file);

            if (error) {
                toast.error("Upload failed");
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('dm_media')
                .getPublicUrl(`${conversationId}/${fileName}`);

            mediaUrl = publicUrl;

            // Determine type more robustly
            const isImage = file.type.startsWith('image/') ||
                ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg'].includes(ext?.toLowerCase() || '');

            type = isImage ? 'image' : 'video';
        }

        // Insert message
        const { data: insertedMsg, error } = await supabase.from('dm_messages').insert({
            conversation_id: conversationId,
            sender_id: currentUser.id,
            content: text,
            type,
            media_url: mediaUrl,
        }).select().single();

        if (error) {
            toast.error("Failed to send");
            throw error;
        }

        // Optimistically add to UI
        if (insertedMsg) {
            setMessages((prev) => [...prev, insertedMsg]);
        }


    };

    return (
        <div className="flex flex-col h-full bg-gray-900/50">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                        <img
                            src={otherUser.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + otherUser.username}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">{otherUser.username}</h3>
                        <span className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/10">
                        <MoreVertical className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 relative" ref={scrollRef}>
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-pink-500 animate-pulse">Loading conversation...</div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.sender_id === currentUser.id}
                            senderAvatar={msg.sender_id === currentUser.id ? currentUser.avatar_url : otherUser.avatar_url}
                        />
                    ))
                )}
            </div>

            {/* Input */}
            <MessageInput onSend={handleSendMessage} disabled={loading} />
        </div>
    );
}
