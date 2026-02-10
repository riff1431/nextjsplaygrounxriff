"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Comment {
    id: string;
    text: string;
    created_at: string;
    user: {
        id: string;
        username: string;
        avatar_url: string | null;
        full_name: string | null;
    };
}

export default function CommentsModal({
    postId,
    currentUserId,
    trigger,
    onOpenChange
}: {
    postId: string,
    currentUserId: string | null,
    trigger: React.ReactNode,
    onOpenChange?: (open: boolean) => void
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const supabase = createClient();

    const fetchComments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("comments")
                .select("*, user:profiles(id, username, avatar_url, full_name)")
                .eq("post_id", postId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setComments(data as any || []);
        } catch (err) {
            console.error("Error fetching comments:", err);
            toast.error("Failed to load comments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchComments();
            onOpenChange?.(true);
        } else {
            onOpenChange?.(false);
        }
    }, [isOpen, postId]);

    const handleAddComment = async () => {
        if (!currentUserId) {
            toast.error("Please log in to comment");
            return;
        }
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from("comments")
                .insert({
                    post_id: postId,
                    user_id: currentUserId,
                    text: newComment.trim()
                });

            if (error) throw error;

            setNewComment("");
            fetchComments(); // Refresh list
            toast.success("Comment added");
        } catch (err) {
            console.error("Error adding comment:", err);
            toast.error("Failed to add comment");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-lg flex flex-col max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Comments</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[500px] space-y-4 pr-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                        </div>
                    ) : comments.length > 0 ? (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                                <Avatar className="w-8 h-8 border border-white/10 shrink-0">
                                    <AvatarImage src={comment.user.avatar_url || ""} />
                                    <AvatarFallback className="text-xs bg-zinc-800">
                                        {comment.user.username?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-baseline justify-between">
                                        <span className="font-semibold text-sm text-zinc-200">
                                            {comment.user.username}
                                        </span>
                                        <span className="text-[10px] text-zinc-500">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-zinc-300 break-words">{comment.text}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-zinc-500 py-12 text-sm">
                            No comments yet. Be the first to say something!
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center gap-2">
                    <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="min-h-[40px] max-h-[100px] bg-zinc-950 border-zinc-800 text-sm resize-none"
                    />
                    <Button
                        size="icon"
                        onClick={handleAddComment}
                        disabled={submitting || !newComment.trim()}
                        className="shrink-0 bg-pink-600 hover:bg-pink-500 rounded-full w-10 h-10"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
