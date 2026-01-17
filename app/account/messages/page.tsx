"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import ConversationList from "@/components/messaging/ConversationList";
import ChatWindow from "@/components/messaging/ChatWindow";
import NewChatModal from "@/components/messaging/NewChatModal";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

function MessagesContent() {
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const chatWithId = searchParams?.get("chatWith");

    const [user, setUser] = useState<any>(null);
    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const processedRef = useRef(false);

    // Fetch User & Conversations
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth");
                return;
            }
            setUser(user);

            // 1. Get conversations I'm in
            const { data: myParticipations, error: partError } = await supabase
                .from('dm_participants')
                .select('conversation_id')
                .eq('user_id', user.id);

            if (partError || !myParticipations) {
                console.error("Error fetching conversations:", partError);
                setLoading(false);
                return;
            }

            const conversationIds = myParticipations.map(p => p.conversation_id);

            if (conversationIds.length === 0) {
                setConversations([]);
                setLoading(false);
                return;
            }

            // 2. Fetch all participants for these conversations
            const { data: allParticipants } = await supabase
                .from('dm_participants')
                .select('conversation_id, user_id')
                .in('conversation_id', conversationIds);

            // 3. Fetch profiles for these participants
            const userIds = Array.from(new Set(allParticipants?.map(p => p.user_id) || []));
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, full_name')
                .in('id', userIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]));

            // 4. Fetch last message for each conversation
            // We'll use a Promise.all here as distinct on/lateral join is complex in simple client query
            const convs = await Promise.all(conversationIds.map(async (cId) => {
                // Get last message
                const { data: msgs } = await supabase
                    .from('dm_messages')
                    .select('*')
                    .eq('conversation_id', cId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                // Find participants for this specific conversation
                const convoParticipants = allParticipants?.filter(p => p.conversation_id === cId) || [];
                const fullParticipants = convoParticipants.map(p => ({
                    user_id: p.user_id,
                    ...profileMap.get(p.user_id) || { username: 'Unknown User' }
                }));

                // Get updated_at from message or fallback
                const { data: convParams } = await supabase.from('dm_conversations').select('updated_at').eq('id', cId).single();

                return {
                    id: cId,
                    updated_at: msgs?.[0]?.created_at || convParams?.updated_at || new Date().toISOString(),
                    participants: fullParticipants,
                    last_message: msgs?.[0] || null
                };
            }));

            // Sort by updated_at
            convs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

            setConversations(convs);
            setLoading(false);
        };

        init();
    }, []);

    // Auto-start chat from URL
    useEffect(() => {
        if (!loading && chatWithId && user && !processedRef.current) {
            handleStartChat(chatWithId);
            processedRef.current = true;
            // Optional: Clear param so refresh doesn't re-trigger strict logic, though ref handles it
            router.replace('/account/messages', { scroll: false });
        }
    }, [loading, chatWithId, user]);

    // Helper to get other user for the active conversation
    const activeConv = conversations.find(c => c.id === activeConvId);
    const otherUser = activeConv?.participants.find((p: any) => p.user_id !== user?.id) || activeConv?.participants[0];

    const [isNewChatOpen, setIsNewChatOpen] = useState(false);

    const handleCreateChat = () => {
        setIsNewChatOpen(true);
    };

    const handleStartChat = async (targetUserId: string) => {
        // 1. Check if conversation already exists locally
        const existing = conversations.find(c =>
            c.participants.some((p: any) => p.user_id === targetUserId) &&
            c.participants.some((p: any) => p.user_id === user.id)
        );

        if (existing) {
            setActiveConvId(existing.id);
            setIsNewChatOpen(false);
            return;
        }

        // 2. Create new conversation
        try {
            setLoading(true);
            const newConvId = crypto.randomUUID();

            const { error: convError } = await supabase
                .from('dm_conversations')
                .insert({ id: newConvId });

            if (convError) throw convError;

            // 3. Add participants
            const { error: partError } = await supabase
                .from('dm_participants')
                .insert([
                    { conversation_id: newConvId, user_id: user.id },
                    { conversation_id: newConvId, user_id: targetUserId }
                ]);

            if (partError) throw partError;

            // 4. Manual Append & Select (faster than full re-fetch)
            // Fetch target profile for display
            const { data: targetProfile } = await supabase
                .from('profiles')
                .select('username, avatar_url, full_name')
                .eq('id', targetUserId)
                .single();

            const newConvObj = {
                id: newConvId,
                updated_at: new Date().toISOString(),
                participants: [
                    { user_id: user.id, username: 'Me', avatar_url: null }, // Self (not critically needed for "other" logic but needed for structure)
                    { user_id: targetUserId, ...targetProfile }
                ],
                last_message: null
            };

            setConversations([newConvObj, ...conversations]);
            setActiveConvId(newConvId);
            setIsNewChatOpen(false);

        } catch (err) {
            console.error("Error creating chat:", err);
            toast.error(`Failed to start chat: ${(err as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-black text-white overflow-hidden">
            <NewChatModal
                isOpen={isNewChatOpen}
                onClose={() => setIsNewChatOpen(false)}
                onStartChat={handleStartChat}
                currentUserId={user?.id}
            />

            {/* Sidebar List */}
            <div className={`w-full md:w-[320px] lg:w-[380px] bg-zinc-900 border-r border-white/10 flex flex-col ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="hover:bg-white/10 p-2 rounded-full transition">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-500">
                            Messages
                        </h1>
                    </div>
                    <button onClick={handleCreateChat} className="p-2 bg-pink-600 rounded-full hover:bg-pink-500 transition shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                        <MessageSquarePlus className="w-5 h-5 text-white" />
                    </button>
                </div>

                <ConversationList
                    conversations={conversations}
                    activeId={activeConvId}
                    onSelect={setActiveConvId}
                    currentUserId={user?.id}
                    loading={loading}
                />
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
                {activeConvId && user ? (
                    <div className="h-full flex flex-col">
                        {/* Mobile Back Button built into ChatWindow header usually, but distinct here for simplicity */}
                        <div className="md:hidden p-2 bg-zinc-900 border-b border-white/10 flex items-center">
                            <button onClick={() => setActiveConvId(null)} className="flex items-center gap-2 text-gray-400 hover:text-white">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                        </div>
                        <ChatWindow
                            conversationId={activeConvId}
                            currentUser={user} // passing full user object + extra profile fields if needed
                            otherUser={otherUser}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-50 space-y-4">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center transform rotate-12">
                            <MessageSquarePlus className="w-10 h-10 text-pink-400" />
                        </div>
                        <p className="font-medium">Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-black text-white">Loading messages...</div>}>
            <MessagesContent />
        </Suspense>
    );
}
