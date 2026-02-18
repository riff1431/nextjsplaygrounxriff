"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, MapPin, Calendar, Link as LinkIcon, Users, UserPlus, UserCheck, Heart, Camera, Share2, Crown, Lock, ArrowLeft, MessageSquare, Sparkles, Star, ScrollText } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import CreatePostModal from "@/components/posts/CreatePostModal";
import PostCard, { Post } from "@/components/posts/PostCard";
import SubscriptionModal from "@/components/subscriptions/SubscriptionModal";

export interface Profile {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    website: string | null;
    bio: string | null;
    role: string | null;
    location?: string | null;
    created_at?: string | null;
    cover_url?: string | null;
    subscription_price_weekly?: number | null;
    subscription_price_monthly?: number | null;
    // Badge-related fields
    account_types?: {
        display_name: string;
        badge_color: string | null;
        badge_icon: string | null;
    } | null;
}

export interface UnlockableItem {
    id: string;
    name: string;
    description: string;
    image_url: string | null;
    type: string;
    unlocked_at?: string;
}

interface ProfileStats {
    followers: number;
    following: number;
    likes: number;
    unlocks: number;
}

interface ProfileViewProps {
    profile: Profile;
    isOwner: boolean;
    stats: ProfileStats;
    isFollowing: boolean;
    currentUserId: string | null;
    unlocks: UnlockableItem[];
    likedItems: any[]; // Using any for now, ideally define Room interface
    posts: Post[];
    onPostCreated: () => void;
}

export default function ProfileView({ profile, isOwner, stats: initialStats, isFollowing: initialIsFollowing, currentUserId, unlocks, likedItems, posts, onPostCreated }: ProfileViewProps) {
    const [stats, setStats] = useState(initialStats);
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const checkSubscription = async () => {
            if (!currentUserId || !profile.id) return;

            const { data, error } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', currentUserId)
                .eq('creator_id', profile.id)
                .eq('status', 'active')
                .gt('current_period_end', new Date().toISOString())
                .maybeSingle();

            if (error) {
                console.error("Error checking subscription:", error);
                return;
            }

            if (data) setIsSubscribed(true);
        };
        checkSubscription();
    }, [currentUserId, profile.id]);

    // Calculate Dynamic Level
    const getLevelName = (followers: number) => {
        if (followers < 100) return "Rookie";
        if (followers < 1000) return "Rising Star";
        if (followers < 10000) return "Pro";
        if (followers < 50000) return "Elite";
        return "Legend";
    };
    const levelName = getLevelName(stats.followers);

    const handleFollowToggle = async () => {
        if (!currentUserId) {
            toast.error("Please log in to follow users");
            router.push("/auth");
            return;
        }

        setLoading(true);
        try {
            if (isFollowing) {
                const { error } = await supabase
                    .from("follows")
                    .delete()
                    .eq("follower_id", currentUserId)
                    .eq("following_id", profile.id);

                if (error) throw error;

                setIsFollowing(false);
                setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
                toast.success(`Unfollowed ${profile.username}`);
            } else {
                const { error } = await supabase
                    .from("follows")
                    .insert({ follower_id: currentUserId, following_id: profile.id });

                if (error) throw error;

                setIsFollowing(true);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
                toast.success(`Following ${profile.username}`);
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        toast.success("Profile link copied to clipboard!");
    };

    // Calculate "Unlocks" - using a mock or placeholder for now as per plan
    const unlocksCount = 85; // Placeholder value

    const [joinDate, setJoinDate] = useState("Loading...");

    useEffect(() => {
        if (profile.created_at) {
            setJoinDate(new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }));
        } else {
            setJoinDate("March 2025");
        }
    }, [profile.created_at]);

    return (
        <div className="min-h-screen bg-black text-white pb-20 font-sans">
            {/* 1. Cover Area with Hex Grid */}
            <div className="relative h-48 md:h-64 w-full overflow-hidden">
                {profile.cover_url ? (
                    <div className="absolute inset-0 z-0">
                        <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/60 to-black z-0"></div>
                )}
                {/* Hex Grid Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay"></div>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

                {/* Back Button */}
                <button
                    onClick={() => router.push("/home")}
                    className="absolute top-4 left-4 bg-black/40 hover:bg-black/60 text-white/80 p-2 rounded-full backdrop-blur-md transition-colors border border-white/10 z-10"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Cover Edit Button */}
                {isOwner && (
                    <Link href="/settings/profile">
                        <button className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white/80 p-2 rounded-full backdrop-blur-md transition-colors border border-white/10">
                            <Camera className="w-5 h-5" />
                        </button>
                    </Link>
                )}
            </div>

            <div className="container mx-auto px-4 max-w-4xl relative z-10">
                <div className="flex flex-col md:flex-row items-start gap-6 -mt-16 mb-6">
                    {/* 2. Avatar */}
                    <div className="relative group">
                        <Avatar className="w-32 h-32 md:w-36 md:h-36 border-4 border-black shadow-2xl ring-2 ring-purple-500/30">
                            <AvatarImage src={profile.avatar_url || ""} alt={profile.username || "User"} className="object-cover" />
                            <AvatarFallback className="bg-zinc-900 text-3xl font-bold text-zinc-500">
                                {(profile.username?.[0] || profile.full_name?.[0] || "?").toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        {isOwner && (
                            <button className="absolute bottom-1 right-1 bg-pink-600 hover:bg-pink-500 text-white p-2 rounded-full shadow-lg border-2 border-black transition-colors">
                                <Camera className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* 3. Header Info & Actions */}
                    <div className="flex-1 w-full pt-16 md:pt-16 pb-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h1 className="text-3xl font-bold text-white tracking-tight">
                                    {profile.full_name || profile.username || "Anonymous"}
                                </h1>

                                {/* Account Type Badge (e.g. Sugar Daddy/Mommy) */}
                                {profile.account_types && (
                                    <span
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-lg"
                                        style={{
                                            backgroundColor: `${profile.account_types.badge_color || '#ec4899'}20`,
                                            color: profile.account_types.badge_color || '#ec4899',
                                            borderColor: `${profile.account_types.badge_color || '#ec4899'}40`,
                                            boxShadow: `0 0 15px ${profile.account_types.badge_color || '#ec4899'}30`
                                        }}
                                    >
                                        <span>{profile.account_types.badge_icon || '✨'}</span>
                                        {profile.account_types.display_name}
                                    </span>
                                )}

                                {/* Creator Level Badge */}
                                {profile.role === 'creator' && (
                                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                        {levelName}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-zinc-400 text-sm font-medium mb-3">
                                @{profile.username || "user"} • Joined {joinDate}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                                {profile.location && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-pink-500" />
                                        <span>{profile.location}</span>
                                    </div>
                                )}
                                {profile.website && (
                                    <div className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                                        <LinkIcon className="w-4 h-4 text-blue-500" />
                                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="truncate max-w-[200px]">
                                            {profile.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                            {isOwner ? (
                                <Link href="/settings/profile" className="w-full md:w-auto">
                                    <Button variant="outline" className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white rounded-full px-6">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Profile
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Button
                                        onClick={() => {
                                            if (isSubscribed) {
                                                router.push('/account/subscription');
                                            } else if ((profile.subscription_price_weekly || 0) > 0 || (profile.subscription_price_monthly || 0) > 0) {
                                                setIsSubscriptionModalOpen(true);
                                            } else {
                                                handleFollowToggle();
                                            }
                                        }}
                                        disabled={loading}
                                        className={`w-full md:w-auto rounded-full px-6 transition-all ${isSubscribed
                                            ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                                            : isFollowing
                                                ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
                                                : "bg-white text-black hover:bg-zinc-200 border border-transparent font-semibold"
                                            }`}
                                    >
                                        {loading ? (
                                            <span className="animate-pulse">Loading...</span>
                                        ) : isSubscribed ? (
                                            <>
                                                <Crown className="w-4 h-4 mr-2 fill-current" /> Subscribed
                                            </>
                                        ) : isFollowing && !((profile.subscription_price_weekly || 0) > 0 || (profile.subscription_price_monthly || 0) > 0) ? (
                                            "Following"
                                        ) : (profile.subscription_price_weekly || 0) > 0 || (profile.subscription_price_monthly || 0) > 0 ? (
                                            "Subscribe"
                                        ) : (
                                            "Follow"
                                        )}
                                    </Button>
                                    <Button
                                        onClick={() => router.push(`/account/messages?chatWith=${profile.id}`)}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-full p-3 md:px-4 aspect-square md:aspect-auto flex items-center justify-center border border-white/10"
                                        title="Send Message"
                                    >
                                        <MessageSquare className="w-5 h-5 md:mr-0" />
                                        <span className="hidden md:inline ml-2">Message</span>
                                    </Button>
                                </>
                            )}

                            <SubscriptionModal
                                isOpen={isSubscriptionModalOpen}
                                onClose={() => setIsSubscriptionModalOpen(false)}
                                creator={profile}
                                currentUserId={currentUserId}
                                onSuccess={() => {
                                    setIsSubscribed(true);
                                    if (!isFollowing) {
                                        setIsFollowing(true);
                                        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
                                    }
                                }}
                            />

                            <Button
                                onClick={handleShare}
                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-400/20"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                <span className="hidden md:inline">Share</span>
                            </Button>

                            {/* Get Confession Button — visible to everyone viewing this profile */}
                            <Button
                                onClick={() => router.push(`/rooms/confessions?creator=${encodeURIComponent(profile.username || profile.full_name || profile.id)}`)}
                                className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-full px-4 shadow-[0_0_18px_rgba(225,29,72,0.35)] border border-rose-400/20 font-semibold transition-all"
                                title="See this creator's confessions"
                            >
                                <ScrollText className="w-4 h-4 mr-2" />
                                <span>Get Confession</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 4. Stats Row */}
                <div className="grid grid-cols-3 gap-8 py-6 mb-2 border-y border-white/5 max-w-lg">
                    <div className="text-center md:text-left">
                        <div className="text-2xl font-bold text-white leading-none mb-1">{stats.following}</div>
                        <div className="text-[10px] md:text-xs text-zinc-500 font-bold uppercase tracking-widest">Following</div>
                    </div>
                    <div className="text-center md:text-left">
                        <div className="text-2xl font-bold text-white leading-none mb-1">{stats.followers}</div>
                        <div className="text-[10px] md:text-xs text-zinc-500 font-bold uppercase tracking-widest">Followers</div>
                    </div>
                    <div className="text-center md:text-left">
                        <div className="text-2xl font-bold text-white leading-none mb-1">{stats.unlocks}</div>
                        <div className="text-[10px] md:text-xs text-zinc-500 font-bold uppercase tracking-widest">Unlocks</div>
                    </div>
                </div>

                {/* 5. Tabs Navigation */}
                <Tabs defaultValue="posts" className="mt-8 w-full">
                    <TabsList className="w-full justify-start bg-transparent border-b border-white/10 p-0 h-auto gap-8 rounded-none">
                        <TabsTrigger
                            value="posts"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-500 rounded-none pb-3 px-1 font-medium text-sm transition-all"
                        >
                            Posts
                        </TabsTrigger>
                        <TabsTrigger
                            value="collection"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-500 rounded-none pb-3 px-1 font-medium text-sm transition-all"
                        >
                            Collection
                        </TabsTrigger>
                        <TabsTrigger
                            value="likes"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-500 rounded-none pb-3 px-1 font-medium text-sm transition-all"
                        >
                            Likes
                        </TabsTrigger>
                        <TabsTrigger
                            value="about"
                            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-500 rounded-none pb-3 px-1 font-medium text-sm transition-all"
                        >
                            About
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="posts" className="mt-8 max-w-2xl mx-auto">
                        {/* Create Post Widget (Owner & Creator Only) */}
                        {isOwner && profile.role === 'creator' && (
                            <div className="mb-8 flex items-center gap-4 bg-zinc-900/30 p-4 rounded-xl border border-white/5">
                                <Avatar className="w-10 h-10 border border-white/10">
                                    <AvatarImage src={profile.avatar_url || ""} />
                                    <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <CreatePostModal currentUserId={currentUserId} onPostCreated={onPostCreated} />
                                </div>
                            </div>
                        )}

                        {posts.length > 0 ? (
                            posts.map(post => (
                                <PostCard key={post.id} post={post} user={profile} currentUserId={currentUserId} onPostDeleted={onPostCreated} isSubscribed={isSubscribed} />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                                    <Edit className="w-8 h-8 opacity-50" />
                                </div>
                                <h3 className="text-zinc-400 font-medium mb-1">No posts yet</h3>
                                {isOwner && <p className="text-sm">Share your first update with your fans!</p>}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="collection" className="mt-8 min-h-[300px]">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Empty State/Placeholder or List */}
                            {unlocks.length > 0 ? (
                                unlocks.map((item) => (
                                    <div key={item.id} className="bg-zinc-900/50 border border-white/10 rounded-xl p-4 flex flex-col items-center text-center transition hover:border-pink-500/50 hover:bg-zinc-900">
                                        <div className="w-16 h-16 mb-3 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center border border-white/5">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-10 h-10 object-contain" />
                                            ) : (
                                                <Crown className="w-8 h-8 text-pink-400" />
                                            )}
                                        </div>
                                        <h4 className="text-white font-medium text-sm mb-1">{item.name}</h4>
                                        <p className="text-xs text-zinc-500 line-clamp-2">{item.description}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 text-zinc-600">
                                    <Lock className="w-12 h-12 mb-4 opacity-50" />
                                    <p>No unlocked items yet</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="likes" className="mt-8 min-h-[300px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {likedItems && likedItems.length > 0 ? (
                                likedItems.map((item) => (
                                    <Link href={`/rooms/${item.id}`} key={item.id}>
                                        <div className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden group hover:border-pink-500/50 transition-all">
                                            <div className="h-32 w-full relative">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                        <Heart className="w-8 h-8 text-zinc-600" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-white text-sm font-medium">View Room</span>
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h4 className="text-white font-medium mb-1 truncate">{item.name}</h4>
                                                <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{item.description}</p>
                                                {item.status === 'live' && (
                                                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] px-2 py-0.5">
                                                        LIVE
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 text-zinc-600">
                                    <Heart className="w-12 h-12 mb-4 opacity-50" />
                                    <p>No liked content</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="about" className="mt-8">
                        <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 md:p-8 max-w-2xl backdrop-blur-sm">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-pink-500" />
                                About
                            </h3>
                            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                                {profile.bio || "No bio yet."}
                            </p>

                            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Role</div>
                                    <div className="capitalize text-white font-medium">{profile.role || "Fan"}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Verification</div>
                                    <div className="text-green-500 font-medium flex items-center gap-1">
                                        <UserCheck className="w-3 h-3" /> Verified
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div >
    );
}
