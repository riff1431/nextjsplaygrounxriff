
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { Profile } from "@/components/profile/ProfileView";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import CommentsModal from "./CommentsModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash, Flag, AlertCircle } from "lucide-react";

export interface Post {
    id: string;
    user_id: string;
    content_type: 'text' | 'image' | 'video';
    caption: string | null;
    media_url: string | null;
    thumbnail_url: string | null;
    created_at: string;
    profile?: Profile; // Joined data
    likes?: { count: number }[]; // Aggregate count from Supabase
    comments?: { count: number }[]; // Aggregate count from Supabase
    user_has_liked?: boolean; // We'll need to fetch this
}

export default function PostCard({ post, user, currentUserId, onPostDeleted }: { post: Post, user: Profile, currentUserId: string | null, onPostDeleted?: () => void }) {
    const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
    const [liked, setLiked] = useState(false); // Initial state should be passed or fetched
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        // Initialize counts if available from join
        if (post.likes && post.likes[0]) setLikeCount(post.likes[0].count);
        if (post.comments && post.comments[0]) setCommentCount(post.comments[0].count);

        // Check if user liked this post
        const checkLikeStatus = async () => {
            if (!currentUserId) return;
            const { data } = await supabase
                .from('post_likes')
                .select('user_id')
                .eq('post_id', post.id)
                .eq('user_id', currentUserId)
                .single();

            if (data) setLiked(true);
        };

        // Fetch counts independently in case joins were tricky
        const fetchCounts = async () => {
            const { count: lCount } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
            if (lCount !== null) setLikeCount(lCount);

            const { count: cCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
            if (cCount !== null) setCommentCount(cCount);
        };

        checkLikeStatus();
        fetchCounts();
    }, [post.id, currentUserId]);

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

    const handleDelete = async () => {
        if (!currentUserId) return;

        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id)
                .eq('user_id', currentUserId);

            if (error) throw error;

            toast.success("Post deleted");
            onPostDeleted?.();
        } catch (error) {
            console.error("Error deleting post:", error);
            toast.error("Failed to delete post");
        }
    };

    const isOwner = currentUserId === post.user_id;

    return (
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl overflow-hidden mb-6">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-white/10">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-semibold text-white text-sm">{user.full_name || user.username}</div>
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

            {/* Content */}
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
                    <video src={post.media_url} controls className="w-full h-full" />
                </div>
            )}

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
