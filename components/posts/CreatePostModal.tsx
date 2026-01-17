"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Video, Type, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreatePostModal({ currentUserId, onPostCreated, trigger }: { currentUserId: string | null, onPostCreated: () => void, trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("text"); // text, image, video
    const [caption, setCaption] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();
    const router = useRouter();

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
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const clearFile = () => {
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async () => {
        if (!currentUserId) return;
        if (!caption.trim() && !selectedFile) {
            toast.error("Please add some content");
            return;
        }

        setLoading(true);
        try {
            let mediaUrl = null;
            let contentType = activeTab;

            // 1. Upload File if exists
            if (activeTab !== 'text' && selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
                const { error: uploadError, data } = await supabase.storage
                    .from('post-media')
                    .upload(fileName, selectedFile);

                if (uploadError) throw uploadError;

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('post-media')
                    .getPublicUrl(fileName);

                mediaUrl = publicUrl;
            } else if (activeTab === 'text') {
                contentType = 'text';
            } else {
                // User selected image/video tab but didn't upload file
                toast.error(`Please upload an ${activeTab}`);
                setLoading(false);
                return;
            }

            // 2. Insert Post Record
            const { error: insertError } = await supabase
                .from('posts')
                .insert({
                    user_id: currentUserId,
                    content_type: contentType,
                    caption: caption,
                    media_url: mediaUrl
                });

            if (insertError) throw insertError;

            toast.success("Post created!");
            setIsOpen(false);

            // Reset state
            setCaption("");
            clearFile();
            setActiveTab("text");

            onPostCreated(); // Refresh feed

        } catch (error) {
            console.error("Error creating post:", error);
            toast.error("Failed to create post");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="bg-pink-600 hover:bg-pink-700 text-white rounded-full">
                        Create Post
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Post</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); clearFile(); }} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-zinc-800">
                        <TabsTrigger value="text"><Type className="w-4 h-4 mr-2" /> Text</TabsTrigger>
                        <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-2" /> Image</TabsTrigger>
                        <TabsTrigger value="video"><Video className="w-4 h-4 mr-2" /> Video</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 space-y-4">
                        <Textarea
                            placeholder="What's on your mind?"
                            className="bg-zinc-950 border-zinc-800 focus:border-pink-500 min-h-[100px]"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                        />

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
                            {loading ? "Posting..." : "Post"}
                        </Button>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
