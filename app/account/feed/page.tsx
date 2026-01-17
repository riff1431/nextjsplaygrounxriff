"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { LayoutGrid, Loader2, Play } from "lucide-react";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function FeedPage() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchFeed = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth');
                return;
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
                setPosts(data);
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
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <LayoutGrid className="w-6 h-6 text-pink-400" />
                    My Feed
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-gray-500">
                            No posts yet. Follow some creators!
                        </div>
                    ) : (
                        posts.map((post) => (
                            <div key={post.id} className="group relative rounded-2xl border border-pink-500/15 bg-white/5 overflow-hidden hover:border-pink-500/30 transition-all">
                                {/* Header */}
                                <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-2">
                                    <div
                                        onClick={() => router.push(`/profile/${post.user_id}`)}
                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 p-[1px] cursor-pointer"
                                    >
                                        <div className="w-full h-full rounded-full bg-black overflow-hidden">
                                            {post.profiles?.avatar_url ? (
                                                <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800" />
                                            )}
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => router.push(`/profile/${post.user_id}`)}
                                        className="text-xs font-bold text-white cursor-pointer hover:underline"
                                    >
                                        @{post.profiles?.username || "Unknown"}
                                    </div>
                                    <div className="ml-auto text-[10px] text-gray-300 bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                    </div>
                                </div>

                                {/* Media */}
                                <div className="aspect-[4/5] bg-zinc-900 relative">
                                    {post.media_url ? (
                                        post.content_type === 'video' ? (
                                            <div className="w-full h-full flex items-center justify-center relative">
                                                <video src={post.media_url} className="w-full h-full object-cover opacity-80" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                        <Play className="w-5 h-5 text-white fill-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <img src={post.media_url} className="w-full h-full object-cover" />
                                        )
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                                            No Media
                                        </div>
                                    )}
                                </div>

                                {/* Caption Overlay (Bottom) */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
                                    <p className="text-sm text-gray-200 line-clamp-2">
                                        {post.caption}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
