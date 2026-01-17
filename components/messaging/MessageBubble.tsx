import { format } from "date-fns";
import { User, Check, CheckCheck } from "lucide-react";
import Image from "next/image";

type Message = {
    id: string;
    content: string | null;
    type: 'text' | 'image' | 'video';
    media_url: string | null;
    created_at: string;
    sender_id: string;
    is_read: boolean;
};

type Props = {
    message: Message;
    isOwn: boolean;
    senderName?: string;
    senderAvatar?: string | null;
};

export default function MessageBubble({ message, isOwn, senderName, senderAvatar }: Props) {
    return (
        <div className={`flex w-full mb-4 ${isOwn ? "justify-end" : "justify-start"}`}>
            {!isOwn && (
                <div className="w-8 h-8 rounded-full bg-gray-700 mr-2 flex-shrink-0 overflow-hidden">
                    {senderAvatar ? (
                        <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-400" />
                        </div>
                    )}
                </div>
            )}

            <div className={`max-w-[75%] rounded-2xl px-4 py-2 relative group ${isOwn
                    ? "bg-pink-600 text-white rounded-br-none"
                    : "bg-gray-800 text-gray-100 rounded-bl-none border border-white/10"
                }`}>
                {/* Media Content */}
                {message.type === 'image' && message.media_url && (
                    <div className="mb-2 rounded-lg overflow-hidden relative w-full aspect-square max-w-[240px]">
                        <img
                            src={message.media_url}
                            alt="Attached image"
                            className="object-cover w-full h-full"
                        />
                    </div>
                )}

                {message.type === 'video' && message.media_url && (
                    <div className="mb-2 rounded-lg overflow-hidden w-full max-w-[240px]">
                        <video controls src={message.media_url} className="w-full rounded-lg" />
                    </div>
                )}

                {/* Text Content */}
                {message.content && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                    </p>
                )}

                {/* Metadata */}
                <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOwn ? "justify-end text-pink-200" : "text-gray-400"}`}>
                    <span>{format(new Date(message.created_at), "h:mm a")}</span>
                    {isOwn && (
                        <span>
                            {message.is_read ? (
                                <CheckCheck className="w-3 h-3 text-blue-300" />
                            ) : (
                                <Check className="w-3 h-3 text-pink-300/70" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
