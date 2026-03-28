"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { Star, Filter, Heart, Lock, Play, Image as ImageIcon, Video, LayoutGrid, X, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Post } from "@/components/posts/PostCard";
import PostCard from "@/components/posts/PostCard";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

type FilterType = 'all' | 'photos' | 'videos';

export default function CollectionXPage() {
    const supabase = createClient();
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!user) return;

            try {
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

                const mappedPosts = (data || []).map((item: any) => {
                    const p = item.posts;
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

    // Filtered posts based on active filter
    const filteredPosts = useMemo(() => {
        if (activeFilter === 'all') return posts;
        if (activeFilter === 'photos') return posts.filter(p => p.content_type === 'image');
        if (activeFilter === 'videos') return posts.filter(p => p.content_type === 'video');
        return posts;
    }, [posts, activeFilter]);

    // Counts for filter badges
    const counts = useMemo(() => ({
        all: posts.length,
        photos: posts.filter(p => p.content_type === 'image').length,
        videos: posts.filter(p => p.content_type === 'video').length,
    }), [posts]);

    const filterOptions: { key: FilterType; label: string; icon: React.ReactNode }[] = [
        { key: 'all', label: 'All', icon: <LayoutGrid className="w-4 h-4" /> },
        { key: 'photos', label: 'Photos', icon: <ImageIcon className="w-4 h-4" /> },
        { key: 'videos', label: 'Videos', icon: <Video className="w-4 h-4" /> },
    ];

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

                    {/* Filter Dropdown */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200
                                ${activeFilter !== 'all'
                                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                }
                            `}
                        >
                            <Filter className="w-4 h-4" />
                            <span>{filterOptions.find(o => o.key === activeFilter)?.label}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {filterOpen && (
                            <div
                                className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
                                style={{ animation: 'filterSlideIn 0.2s ease-out' }}
                            >
                                <div className="px-3 py-2.5 border-b border-white/5">
                                    <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold">Filter by type</p>
                                </div>
                                {filterOptions.map((option) => (
                                    <button
                                        key={option.key}
                                        onClick={() => {
                                            setActiveFilter(option.key);
                                            setFilterOpen(false);
                                        }}
                                        className={`
                                            w-full flex items-center justify-between px-3 py-2.5 text-sm transition-all duration-150
                                            ${activeFilter === option.key
                                                ? 'bg-pink-500/10 text-pink-300'
                                                : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                                            }
                                        `}
                                    >
                                        <span className="flex items-center gap-2.5">
                                            {option.icon}
                                            {option.label}
                                        </span>
                                        <span className={`
                                            text-xs px-2 py-0.5 rounded-full font-medium
                                            ${activeFilter === option.key
                                                ? 'bg-pink-500/20 text-pink-300'
                                                : 'bg-white/5 text-zinc-500'
                                            }
                                        `}>
                                            {counts[option.key]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Active Filter Pill (shown when not "All") */}
                {activeFilter !== 'all' && (
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/20 text-pink-300 text-xs font-medium">
                            {filterOptions.find(o => o.key === activeFilter)?.icon}
                            {filterOptions.find(o => o.key === activeFilter)?.label}
                            <button
                                onClick={() => setActiveFilter('all')}
                                className="ml-1 hover:text-white transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                        <span className="text-xs text-zinc-500">
                            {filteredPosts.length} of {posts.length} items
                        </span>
                    </div>
                )}

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
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
                        {activeFilter === 'photos' ? (
                            <ImageIcon className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                        ) : (
                            <Video className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                        )}
                        <h3 className="text-lg font-medium text-gray-300">
                            No {activeFilter === 'photos' ? 'photos' : 'videos'} saved
                        </h3>
                        <p className="text-sm">
                            You haven&apos;t saved any {activeFilter === 'photos' ? 'photo' : 'video'} posts yet.
                        </p>
                        <button
                            onClick={() => setActiveFilter('all')}
                            className="mt-4 px-4 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/15 transition"
                        >
                            View All
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPosts.map((post) => (
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

            {/* Dropdown animation keyframes */}
            <style jsx>{`
                @keyframes filterSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-8px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `}</style>
        </div>
    )
}
