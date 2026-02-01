"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, User } from "lucide-react";
import Link from "next/link";
import ProfileView, { Profile } from "@/components/profile/ProfileView";

export default function ProfilePage() {
    const params = useParams();
    const id = params?.id as string;
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0, unlocks: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [unlocks, setUnlocks] = useState<any[]>([]);
    const [likedItems, setLikedItems] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUserId(user?.id || null);
                const isCurrentUser = user?.id === id;

                // 2. Fetch profile data with badges
                const { data: profileData, error: profileError } = await supabase
                    .from("profiles")
                    .select(`
                        *,
                        account_types:account_type_id (
                            display_name,
                            badge_color,
                            badge_icon
                        )
                    `)
                    .eq("id", id)
                    .single();

                if (profileData) {
                    setProfile(profileData);
                } else if (isCurrentUser && user) {
                    // Fallback for owner
                    setProfile({
                        id: user.id,
                        username: user.user_metadata?.username || user.email?.split('@')[0],
                        full_name: user.user_metadata?.full_name || "New User",
                        avatar_url: user.user_metadata?.avatar_url,
                        role: user.user_metadata?.role || "fan",
                        bio: "Welcome to my profile!",
                        website: null,
                        location: null,
                        created_at: user.created_at
                    });
                } else {
                    setProfile(null);
                }

                setIsOwner(isCurrentUser);

                // 3. Fetch Stats Parallel
                const [
                    { count: followersCount },
                    { count: followingCount },
                    { count: likesCount },
                    { data: followStatus }
                ] = await Promise.all([
                    supabase.from("follows").select("*", { count: 'exact', head: true }).eq("following_id", id),
                    supabase.from("follows").select("*", { count: 'exact', head: true }).eq("follower_id", id),
                    supabase.from("likes").select("*", { count: 'exact', head: true }).eq("target_id", id),
                    user ? supabase.from("follows").select("*").eq("follower_id", user.id).eq("following_id", id).single() : Promise.resolve({ data: null })
                ]);

                // 4. Fetch Unlocks
                const { data: userUnlocks, error: unlocksError } = await supabase
                    .from("user_unlocks")
                    .select(`
                        id,
                        unlocked_at,
                        unlockable_items (
                            id,
                            name,
                            description,
                            image_url,
                            type
                        )
                    `)
                    .eq("user_id", id);

                // 5. Fetch Liked Rooms (Assuming likes table has target_id and rooms table exists)
                // We'll try to fetch likes that are for rooms. 
                // Note: If no FK exists, this join might fail. We'll wrap in try/catch or just be careful.
                const { data: userLikes, error: likesError } = await supabase
                    .from("likes")
                    .select(`
                        id,
                        created_at,
                        rooms (
                            id,
                            name,
                            description,
                            cover_url,
                            status
                        )
                    `)
                    .eq("user_id", id)
                    .not("rooms", "is", null); // Filter where room exists


                // 6. Fetch User Posts
                const { data: userPosts, error: postsError } = await supabase
                    .from("posts")
                    .select("*")
                    .eq("user_id", id)
                    .order("created_at", { ascending: false });

                // Format unlocks
                const formattedUnlocks = userUnlocks?.map(u => {
                    const item = u.unlockable_items as any;
                    return {
                        id: item.id,
                        name: item.name,
                        description: item.description,
                        image_url: item.image_url,
                        type: item.type,
                        unlocked_at: u.unlocked_at
                    };
                }) || [];

                const formattedLikes = userLikes?.map(l => {
                    const room = l.rooms as any;
                    return {
                        id: room?.id,
                        name: room?.name,
                        description: room?.description,
                        image_url: room?.cover_url,
                        type: "room",
                        liked_at: l.created_at,
                        status: room?.status
                    };
                }) || [];

                setStats({
                    followers: followersCount || 0,
                    following: followingCount || 0,
                    likes: formattedLikes.length, // Use actual likes count or likesCount if that refers to received likes. Usually stats.likes is "Received Likes". 
                    // Let's keep stats.likes as "Received Likes" (popularity) and formattedLikes as "Given Likes" (collection).
                    // Actually, usually "Likes" tab shows what I liked. "Likes" stat shows how many likes I received.
                    unlocks: formattedUnlocks.length
                });

                setUnlocks(formattedUnlocks);
                setLikedItems(formattedLikes);
                setPosts(userPosts || []);

                setIsFollowing(!!followStatus);

            } catch (err) {
                console.error("Error fetching profile data:", err);
            } finally {
                setLoading(false);
            }
        };

        const refreshPosts = () => {
            // Re-fetch only posts or full profile? Full profile is easier for now to keep sync.
            // Or better, just re-fetch posts separately if we moved it out. 
            // For simplicity, re-trigger the main fetch effect logic or extract fetch function?
            // Best to extract variable. But here we can't easily.
            // Let's make fetchProfileData defined outside and call it.
            // Or simpler: force reload page or pass a callback that re-runs the fetch.
            // Actually, defining fetchProfileData inside useEffect with dependency is standard.
            // To re-trigger, we can use a "refreshTrigger" state.
            setRefreshTrigger(prev => prev + 1);
        };

        fetchProfileData();
    }, [id, supabase, refreshTrigger]);



    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-pink-500 animate-pulse">Loading profile...</div>
        </div>
    );

    if (!profile) {
        return (
            <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
                <div className="max-w-md w-full bg-zinc-900/50 border border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
                    <p className="text-zinc-400 mb-6">The user you are looking for does not exist or has not set up their profile yet.</p>
                    <Link href="/home">
                        <Button variant="outline" className="border-pink-500/50 text-pink-500 hover:bg-pink-500/10">
                            Return Home
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <ProfileView
            profile={profile}
            isOwner={isOwner}
            stats={stats}
            isFollowing={isFollowing}
            currentUserId={currentUserId}
            unlocks={unlocks}
            likedItems={likedItems}
            posts={posts}
            onPostCreated={() => setRefreshTrigger(prev => prev + 1)}
        />
    );
}


