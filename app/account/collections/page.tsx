"use client";

import React from "react";
import { Star, Filter, Heart, Lock, Play, Image as ImageIcon } from "lucide-react";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Post } from "@/components/posts/PostCard"; // Importing type
import PostCard from "@/components/posts/PostCard";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

export default function CollectionXPage() {
    const supabase = createClient();
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!user) return; // Wait for auth

            try {
                // Fetch bookmarks joined with posts and author profiles
                const { data, error } = await supabase
                    .from('post_bookmarks')
                    .select(`
                        post_id,
                        posts:post_id (
                            *,
                            profiles:user_id (
                                username,
                                full_name,
                                avatar_url
                            ),
                            likes:post_likes(count),
                            comments:comments(count)
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Flatten structure: post_bookmarks -> posts
                const mappedPosts = (data || []).map((item: any) => {
                    const p = item.posts;
                    // Ensure the structure matches Post type (handling the join)
                    if (!p) return null;
                    return {
                        ...p,
                        profile: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
                    } as Post;
                }).filter(Boolean) as Post[];

                setPosts(mappedPosts);
            } catch (err) {
                console.error("Error fetching collections:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBookmarks();
    }, [user]);

    if (!user) {
        return <div className="min-h-screen bg-black text-white p-10 text-center">Please log in to view collections.</div>;
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 pb-20 lg:pb-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Star className="w-6 h-6 text-yellow-400" />
                        CollectionX
                    </h1>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading saved posts...</div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
                        <Star className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-300">No collections yet</h3>
                        <p className="text-sm">Save posts from the feed to see them here.</p>
                        <button
                            onClick={() => router.push('/home')}
                            className="mt-4 px-4 py-2 bg-pink-600 rounded-xl text-sm hover:bg-pink-700 transition"
                        >
                            Explore Feed
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                user={post.profile || { username: 'Unknown' } as any}
                                currentUserId={user.id}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
