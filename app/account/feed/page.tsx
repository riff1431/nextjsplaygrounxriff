"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { LayoutGrid, Loader2 } from "lucide-react";
import PostCard, { Post } from "@/components/posts/PostCard";
import { useAuth } from "@/app/context/AuthContext";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function FeedPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();
    const { user } = useAuth();
    const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchFeed = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth');
                return;
            }

            // Fetch Subscriptions
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('creator_id')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .gt('current_period_end', new Date().toISOString());

            if (subData) {
                setSubscribedCreatorIds(new Set(subData.map(s => s.creator_id)));
            }

            // Fetch all posts for now (can differ to "followed" later if needed)
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (
                        username,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false });

            if (data) {
                // Map profiles to match PostCard expectations
                const mapped = data.map(p => ({
                    ...p,
                    profile: p.profiles // Aliased or used directly
                }));
                setPosts(mapped);
            }
            setLoading(false);
        };

        fetchFeed();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                    <span className="text-gray-400">Loading feed...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20 lg:pb-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold flex items-center gap-3 mb-8">
                    <LayoutGrid className="w-6 h-6 text-pink-400" />
                    My Feed
                </h1>

                <div className="space-y-6">
                    {posts.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            No posts yet. Follow some creators!
                        </div>
                    ) : (
                        posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                user={post.profile as any} // Cast because type mapping
                                currentUserId={user?.id || null}
                                onPostDeleted={() => setPosts(p => p.filter(x => x.id !== post.id))}
                                isSubscribed={post.user_id ? subscribedCreatorIds.has(post.user_id) : false}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
