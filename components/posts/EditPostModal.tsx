"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Video, Type, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadToLocalServer } from "@/utils/uploadHelper";
import { cs } from "@/utils/currency";
import { Post } from "./PostCard";

interface EditPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post;
    onPostUpdated: (updatedPost: Post) => void;
}

export default function EditPostModal({ isOpen, onClose, post, onPostUpdated }: EditPostModalProps) {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("text"); // text, image, video
    const [caption, setCaption] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [price, setPrice] = useState("");
    const [isMediaDeleted, setIsMediaDeleted] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    // Populate state with post details on open
    useEffect(() => {
        if (isOpen) {
            setActiveTab(post.content_type || "text");
            setCaption(post.caption || "");
            setSelectedFile(null);
            setPreviewUrl(post.media_url || null);
            setIsPaid(post.is_paid || false);
            setPrice(post.price?.toString() || "");
            setIsMediaDeleted(false);
        }
    }, [isOpen, post]);

    // Clean up temporary blob URL on unmount or previewUrl change
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type based on active tab
        if (activeTab === 'image' && !file.type.startsWith('image/')) {
            toast.error("Please select an image file");
            return;
        }
        if (activeTab === 'video' && !file.type.startsWith('video/')) {
            toast.error("Please select a video file");
            return;
        }

        // Limit size (e.g. 50MB for video, 5MB for image)
        const maxSize = activeTab === 'video' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File too large. Max size: ${activeTab === 'video' ? '50MB' : '5MB'}`);
            return;
        }

        setSelectedFile(file);
        setIsMediaDeleted(false);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const clearFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsMediaDeleted(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async () => {
        if (!caption.trim() && !selectedFile && !previewUrl) {
            toast.error("Please add some content");
            return;
        }

        setLoading(true);
        try {
            let finalMediaUrl = previewUrl;

            // 1. Upload new file if exists
            if (activeTab !== 'text' && selectedFile) {
                const publicUrl = await uploadToLocalServer(selectedFile);
                finalMediaUrl = publicUrl;
            } else if (activeTab === 'text') {
                finalMediaUrl = null;
            } else if (activeTab !== 'text' && isMediaDeleted && !selectedFile) {
                // User chose image or video but deleted the old one without picking a new one
                toast.error(`Please upload an ${activeTab} or switch to the Text tab`);
                setLoading(false);
                return;
            }

            const updatedFields = {
                content_type: activeTab as 'text' | 'image' | 'video',
                caption: caption,
                media_url: finalMediaUrl,
                thumbnail_url: activeTab === 'video' && selectedFile ? null : post.thumbnail_url, // clear old thumbnail if new video uploaded
                is_paid: isPaid,
                price: isPaid && price ? parseFloat(price) : 0,
                updated_at: new Date().toISOString()
            };

            // 2. Update Post in Supabase
            const { error: updateError } = await supabase
                .from('posts')
                .update(updatedFields)
                .eq('id', post.id);

            if (updateError) throw updateError;

            toast.success("Post updated!");
            onPostUpdated({
                ...post,
                ...updatedFields
            });
            onClose();

        } catch (error) {
            console.error("Error updating post:", error);
            toast.error("Failed to update post");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Post</DialogTitle>
                </DialogHeader>

                <Tabs 
                    value={activeTab} 
                    onValueChange={(val) => { 
                        setActiveTab(val);
                        // If they switch back to the original content type, restore original media, else clear
                        if (val === post.content_type) {
                            setPreviewUrl(post.media_url || null);
                            setIsMediaDeleted(false);
                            setSelectedFile(null);
                        } else {
                            clearFile();
                        }
                    }} 
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
                        <TabsTrigger value="text"><Type className="w-4 h-4 mr-2" /> Text</TabsTrigger>
                        <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-2" /> Image</TabsTrigger>
                        <TabsTrigger value="video"><Video className="w-4 h-4 mr-2" /> Video</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 space-y-4">
                        <Textarea
                            placeholder="What's on your mind?"
                            className="bg-zinc-950 border-zinc-800 focus:border-pink-500 min-h-[100px] text-white"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                        />

                        <div className="flex items-center gap-4 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="editIsPaid"
                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-pink-500 focus:ring-pink-500"
                                    checked={isPaid}
                                    onChange={(e) => setIsPaid(e.target.checked)}
                                />
                                <label htmlFor="editIsPaid" className="text-sm font-medium text-zinc-300">Paid Post</label>
                            </div>

                            {isPaid && (
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-sm text-zinc-500">{cs()}</span>
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        className="bg-transparent border-b border-zinc-700 focus:border-pink-500 outline-none text-sm w-full py-1 text-white"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        min="1"
                                    />
                                </div>
                            )}
                        </div>

                        {activeTab !== 'text' && (
                            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-4 flex flex-col items-center justify-center min-h-[150px] relative bg-zinc-950/50">
                                {previewUrl ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        {activeTab === 'image' ? (
                                            <img src={previewUrl} alt="Preview" className="max-h-[200px] rounded-md object-contain" />
                                        ) : (
                                            <video src={previewUrl} controls className="max-h-[200px] rounded-md" />
                                        )}
                                        <button
                                            onClick={clearFile}
                                            className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                                        <p className="text-sm text-zinc-500 mb-2">
                                            Upload {activeTab === 'image' ? 'Image' : 'Video'}
                                        </p>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Select File
                                        </Button>
                                    </>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept={activeTab === 'image' ? "image/*" : "video/*"}
                                    onChange={handleFileSelect}
                                />
                            </div>
                        )}

                        <Button
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-2 rounded-xl shadow-lg shadow-pink-500/20"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {loading ? "Saving Changes..." : "Save Changes"}
                        </Button>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
