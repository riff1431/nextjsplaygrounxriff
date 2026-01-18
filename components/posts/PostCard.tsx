
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { Profile } from "@/components/profile/ProfileView";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import CommentsModal from "./CommentsModal";
import UnlockPostModal from "./UnlockPostModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash, Flag, AlertCircle, Lock, Unlock } from "lucide-react";

export interface Post {
    id: string;
    user_id: string;
    content_type: 'text' | 'image' | 'video';
    caption: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
    created_at: string;
    is_paid?: boolean;
    price?: number;
    profile?: Profile; // Joined data
    likes?: { count: number }[]; // Aggregate count from Supabase
    comments?: { count: number }[]; // Aggregate count from Supabase
    user_has_liked?: boolean; // We'll need to fetch this
}

export default function PostCard({ post, user, currentUserId, onPostDeleted, isSubscribed }: { post: Post, user: Profile, currentUserId: string | null, onPostDeleted?: () => void, isSubscribed?: boolean }) {
    const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
    const [liked, setLiked] = useState(false); // Initial state should be passed or fetched
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(isSubscribed || false); // Initialize with prop
    const [unlocking, setUnlocking] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        // Update state if prop changes
        if (isSubscribed) setIsUnlocked(true);
    }, [isSubscribed]);

    useEffect(() => {
        // Initialize counts if available from join
        if (post.likes && post.likes[0]) setLikeCount(post.likes[0].count);
        if (post.comments && post.comments[0]) setCommentCount(post.comments[0].count);

        // Check if user liked this post OR Unlocked it
        const checkStatus = async () => {
            if (!currentUserId) return;

            // Like Status
            const { data: likeData } = await supabase
                .from('post_likes')
                .select('user_id')
                .eq('post_id', post.id)
                .eq('user_id', currentUserId)
                .single();

            if (likeData) setLiked(true);

            // If already subscribed, no need to check unlocks
            if (isSubscribed) return;

            // Unlock Status (if paid)
            if (post.is_paid) {
                const { data: unlockData } = await supabase
                    .from('post_unlocks')
                    .select('id')
                    .eq('post_id', post.id)
                    .eq('user_id', currentUserId)
                    .single();

                if (unlockData) setIsUnlocked(true);
            }

            // Check for Active Subscription (only if not passed as prop and not already unlocked)
            if (post.is_paid && !isUnlocked && !isSubscribed) {
                const { data: subData } = await supabase
                    .from('subscriptions')
                    .select('id')
                    .eq('user_id', currentUserId)
                    .eq('creator_id', post.user_id)
                    .eq('status', 'active')
                    .gt('current_period_end', new Date().toISOString())
                    .single();

                if (subData) setIsUnlocked(true);
            }
        };

        // Fetch counts independently in case joins were tricky
        const fetchCounts = async () => {
            const { count: lCount } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
            if (lCount !== null) setLikeCount(lCount);

            const { count: cCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
            if (cCount !== null) setCommentCount(cCount);
        };

        checkStatus();
        fetchCounts();
    }, [post.id, currentUserId, post.is_paid, isSubscribed]);

    const handleLike = async () => {
        if (!currentUserId) {
            toast.error("Please log in to like posts");
            return;
        }

        // Optimistic UI update
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

        try {
            if (newLiked) {
                await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId });
            } else {
                await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId);
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            // Revert on error
            setLiked(!newLiked);
            setLikeCount(prev => !newLiked ? prev + 1 : Math.max(0, prev - 1));
            toast.error("Failed to update like");
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/post/${post.id}`; // Assuming we'll have single post view
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const handleUnlock = () => {
        if (!currentUserId) {
            toast.error("Please login to unlock content");
            return;
        }
        setShowUnlockModal(true);
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        try {
            const { error } = await supabase.from('posts').delete().eq('id', post.id);
            if (error) throw error;
            toast.success("Post deleted");
            onPostDeleted?.();
        } catch (error) {
            console.error("Error deleting post:", error);
            toast.error("Failed to delete post");
        }
    };

    const isOwner = currentUserId === post.user_id;
    const canView = !post.is_paid || isOwner || isUnlocked;

    return (
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden mb-6 relative group">
            <UnlockPostModal
                isOpen={showUnlockModal}
                onClose={() => setShowUnlockModal(false)}
                post={post}
                currentUserId={currentUserId}
                onUnlockSuccess={() => setIsUnlocked(true)}
            />
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-white/10">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-semibold text-white text-sm flex items-center gap-2">
                            {user.full_name || user.username}
                            {post.is_paid && (
                                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-pink-500/20">
                                    Premium
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-zinc-500">@{user.username} • {timeAgo}</div>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200">
                        {isOwner ? (
                            <DropdownMenuItem
                                className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                                onClick={handleDelete}
                            >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete Post
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem
                                className="focus:bg-zinc-800 cursor-pointer"
                                onClick={() => toast.success("Post reported")}
                            >
                                <Flag className="w-4 h-4 mr-2" />
                                Report
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content Container */}
            <div className="relative">
                {!canView && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md transition-all p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mb-4 border border-white/10 shadow-xl shadow-pink-500/10 backdrop-blur-xl">
                            <Lock className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Premium Content</h3>
                        <p className="text-zinc-300 text-sm mb-6 max-w-[200px]">Unlock to view this exclusive post from @{user.username}</p>

                        <button
                            onClick={handleUnlock}
                            disabled={unlocking}
                            className={`
                                relative group overflow-hidden rounded-full
                                bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 
                                bg-[length:200%_auto] animate-gradient
                                px-8 py-3 font-bold text-white shadow-lg shadow-pink-500/25
                                transition-all hover:scale-105 hover:shadow-pink-500/40
                                disabled:opacity-70 disabled:cursor-not-allowed
                            `}
                        >
                            <span className="relative flex items-center gap-2">
                                {unlocking ? (
                                    <>Unlocking...</>
                                ) : (
                                    <>
                                        Unlock for <span className="text-yellow-300">${post.price}</span> <Unlock className="w-4 h-4 ml-1" />
                                    </>
                                )}
                            </span>
                        </button>
                    </div>
                )}

                {/* Actual Content (Blurred if locked is handled by overlay backdrop-blur, but we can also blur image specifically) */}
                <div className={canView ? "" : "blur-lg pointer-events-none select-none"}>
                    <div className="px-4 pb-2">
                        {post.caption && (
                            <p className="text-zinc-200 text-sm mb-3 whitespace-pre-wrap">{post.caption}</p>
                        )}
                    </div>

                    {post.content_type === 'image' && post.media_url && (
                        <div className="w-full bg-black flex items-center justify-center max-h-[600px] overflow-hidden">
                            <img src={post.media_url} alt="Post content" className="w-full object-contain max-h-[600px]" />
                        </div>
                    )}

                    {post.content_type === 'video' && post.media_url && (
                        <div className="w-full bg-black aspect-video">
                            <video src={post.media_url} controls={canView} className="w-full h-full" />
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-white/5 flex items-center gap-6">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 transition-colors group ${liked ? "text-pink-500" : "text-zinc-400 hover:text-pink-500"}`}
                >
                    <Heart className={`w-5 h-5 transition-transform ${liked ? "fill-current scale-110" : "group-hover:scale-110"}`} />
                    <span className="text-sm">{likeCount > 0 ? likeCount : "Like"}</span>
                </button>

                <CommentsModal
                    postId={post.id}
                    currentUserId={currentUserId}
                    onOpenChange={setIsCommentsOpen}
                    trigger={
                        <button className="flex items-center gap-2 text-zinc-400 hover:text-blue-500 transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-sm">{commentCount > 0 ? commentCount : "Comment"}</span>
                        </button>
                    }
                />

                <button onClick={handleShare} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors ml-auto">
                    <Share2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
