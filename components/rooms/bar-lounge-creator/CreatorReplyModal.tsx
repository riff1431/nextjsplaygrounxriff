"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Video, Mic, Send, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cs } from "@/utils/currency";

interface CreatorReplyModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: any;
    onSend: (requestId: string, replyData: { text?: string; mediaUrl?: string; mediaType?: string }) => void;
}

const CreatorReplyModal = ({ isOpen, onClose, request, onSend }: CreatorReplyModalProps) => {
    const supabase = createClient();
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !request) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        setFile(selected);
        setPreviewUrl(URL.createObjectURL(selected));
    };

    const handleSend = async () => {
        setIsUploading(true);
        let mediaUrl = undefined;
        let mediaType = undefined;

        if (file) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "replies");

            try {
                const res = await fetch("/api/v1/storage/upload", {
                    method: "POST",
                    body: formData,
                });
                
                const data = await res.json();
                
                if (data.success && data.publicUrl) {
                    mediaUrl = data.publicUrl;
                    mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio';
                } else {
                    console.error("Upload error", data.error);
                }
            } catch (err) {
                console.error("Failed to upload file:", err);
            }
        }

        onSend(request.id, { text, mediaUrl, mediaType });
        
        // Reset state
        setText("");
        setFile(null);
        setPreviewUrl(null);
        setIsUploading(false);
        onClose();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg p-6 rounded-2xl border flex flex-col gap-4 shadow-2xl"
                    style={{
                        background: "hsla(270, 50%, 10%, 0.95)",
                        borderColor: "hsla(45, 90%, 55%, 0.3)",
                        boxShadow: "0 0 40px rgba(255, 215, 0, 0.15)",
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-2">
                        <div>
                            <h3 className="text-xl font-bold" style={{ color: "hsl(45, 100%, 95%)" }}>VIP Reply</h3>
                            <p className="text-sm opacity-70" style={{ color: "hsl(45, 100%, 95%)" }}>
                                Replying to <span className="font-semibold text-gold">{request.fan_name}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-white/70" />
                        </button>
                    </div>

                    {/* Request Context Box */}
                    <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-sm italic text-white/80">
                        "{request.label || request.message}"
                        {request.amount > 0 && <span className="text-gold font-bold ml-2">{cs()}{request.amount}</span>}
                    </div>

                    {/* Media Preview Area */}
                    {previewUrl && (
                        <div className="relative rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center max-h-[200px]">
                            {file?.type.startsWith('video/') ? (
                                <video src={previewUrl} className="max-h-[200px] object-contain" controls />
                            ) : file?.type.startsWith('audio/') ? (
                                <div className="p-6 w-full flex justify-center"><audio src={previewUrl} controls className="w-full" /></div>
                            ) : (
                                <img src={previewUrl} alt="Preview" className="max-h-[200px] object-contain" />
                            )}
                            <button
                                onClick={() => { setFile(null); setPreviewUrl(null); }}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-red-500/80 transition-colors"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    )}

                    {/* Text Input */}
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type your response..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 resize-none h-24 focus:outline-none focus:border-gold/50 transition-colors"
                    />

                    {/* Actions Row */}
                    <div className="flex justify-between items-center mt-2">
                        {/* Media Buttons */}
                        <div className="flex gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*,video/*,audio/*"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-2 text-sm text-white/80"
                            >
                                <ImageIcon className="w-4 h-4 text-pink-400" />
                                <Video className="w-4 h-4 text-purple-400" />
                                <Mic className="w-4 h-4 text-blue-400" />
                                <span className="ml-1">Attach</span>
                            </button>
                        </div>

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={isUploading || (!text.trim() && !file)}
                            className="px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                            style={{
                                background: "hsl(45, 90%, 55%)",
                                color: "#000",
                                boxShadow: "0 0 15px rgba(255, 215, 0, 0.4)"
                            }}
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {isUploading ? "Sending..." : "Send Reply"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreatorReplyModal;
