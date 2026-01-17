import { useState, useRef } from "react";
import { Smile, Paperclip, Send, X, Image as ImageIcon } from "lucide-react";
import EmojiPicker from 'emoji-picker-react';
import { toast } from "sonner";

type Props = {
    onSend: (content: string, file: File | null) => Promise<void>;
    disabled?: boolean;
};

export default function MessageInput({ onSend, disabled }: Props) {
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [showEmoji, setShowEmoji] = useState(false);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = async () => {
        if ((!text.trim() && !file) || sending) return;

        setSending(true);
        try {
            await onSend(text, file);
            setText("");
            setFile(null);
            setShowEmoji(false);
        } catch (err) {
            console.error("Failed to send", err);
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const onEmojiClick = (emojiObject: any) => {
        setText(prev => prev + emojiObject.emoji);
    };

    return (
        <div className="p-4 border-t border-white/10 bg-black/40 relative">
            {/* Emoji Picker Popover */}
            {showEmoji && (
                <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                    <EmojiPicker
                        theme={"dark" as any}
                        onEmojiClick={onEmojiClick}
                        width={300}
                        height={400}
                    />
                </div>
            )}

            {/* File Preview */}
            {file && (
                <div className="flex items-center gap-3 mb-3 p-2 bg-white/5 rounded-lg border border-white/10 w-fit">
                    <div className="h-10 w-10 flex items-center justify-center bg-gray-800 rounded">
                        {file.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(file)} className="h-full w-full object-cover rounded" alt="preview" />
                        ) : (
                            <Paperclip className="w-5 h-5 text-gray-400" />
                        )}
                    </div>
                    <div className="text-xs max-w-[150px] truncate text-gray-300">
                        {file.name}
                    </div>
                    <button onClick={() => setFile(null)} className="p-1 hover:bg-white/10 rounded-full">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            )}

            <div className="flex items-end gap-2">
                <button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="p-3 text-gray-400 hover:text-pink-400 hover:bg-white/5 rounded-xl transition"
                    disabled={disabled}
                >
                    <Smile className="w-5 h-5" />
                </button>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-400 hover:text-blue-400 hover:bg-white/5 rounded-xl transition"
                    disabled={disabled}
                >
                    <ImageIcon className="w-5 h-5" />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*,.heic,.heif,.webp"
                    onChange={(e) => {
                        if (e.target.files?.[0]) setFile(e.target.files[0]);
                    }}
                />

                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-pink-500/50 transition">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-gray-500 resize-none max-h-[100px] min-h-[24px]"
                        rows={1}
                        style={{ height: 'auto', minHeight: '24px' }}
                        disabled={disabled}
                    />
                </div>

                <button
                    onClick={handleSend}
                    disabled={(!text.trim() && !file) || sending || disabled}
                    className="p-3 bg-pink-600 text-white rounded-xl shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
