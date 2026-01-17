"use client";

import React from "react";
import { MessageCircle, Search, MoreHorizontal } from "lucide-react";
import Link from "next/link";

function cx(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function MessagesPage() {
    const [selectedChat, setSelectedChat] = React.useState<number | null>(null);

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-6 pb-20 lg:pb-6">
            <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-6rem)]">

                {/* Header */}
                <div className={`flex items-center justify-between mb-4 md:mb-6 ${selectedChat !== null ? 'hidden md:flex' : 'flex'}`}>
                    <h1 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                        <MessageCircle className="w-6 h-6 text-cyan-400" />
                        Messages
                    </h1>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-full bg-white/5 hover:bg-white/10"><Search className="w-5 h-5 text-gray-400" /></button>
                    </div>
                </div>

                <div className="flex-1 flex gap-6 overflow-hidden relative">
                    {/* Chat List */}
                    <div className={`w-full md:w-1/3 flex flex-col gap-2 overflow-y-auto pr-2 absolute md:relative inset-0 bg-black z-10 ${selectedChat !== null ? 'hidden md:flex' : 'flex'}`}>
                        {[
                            { name: "NeonNyla", msg: "Loved your comment! 💖", time: "2m", unread: true, avatar: "N", color: "pink" },
                            { name: "BlueMuse", msg: "Check out my new drop...", time: "1h", unread: false, avatar: "B", color: "blue" },
                            { name: "VelvetX", msg: "See you in the lounge?", time: "3h", unread: false, avatar: "V", color: "purple" },
                        ].map((chat, i) => (
                            <div
                                key={i}
                                onClick={() => setSelectedChat(i)}
                                className={`p-3 rounded-xl hover:bg-white/5 cursor-pointer transition flex gap-3 items-center ${chat.unread ? 'bg-white/5' : ''} ${selectedChat === i ? 'bg-white/10 border-pink-500/30 border' : ''}`}
                            >
                                <div className="relative">
                                    <div className={`w-12 h-12 rounded-full bg-${chat.color}-600/20 border border-${chat.color}-500/50 flex items-center justify-center text-${chat.color}-300 font-bold`}>
                                        {chat.avatar}
                                    </div>
                                    {chat.unread && <div className="absolute top-0 right-0 w-3 h-3 bg-pink-500 rounded-full border-2 border-black"></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div className={`font-medium text-sm ${chat.unread ? 'text-white' : 'text-gray-300'}`}>{chat.name}</div>
                                        <div className="text-[10px] text-gray-500">{chat.time}</div>
                                    </div>
                                    <div className={`text-xs truncate ${chat.unread ? 'text-gray-200 font-medium' : 'text-gray-500'}`}>{chat.msg}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chat Pane */}
                    <div className={`w-full md:flex-1 rounded-2xl border border-white/10 bg-gray-900/50 flex flex-col absolute md:relative inset-0 z-20 md:z-auto ${selectedChat !== null ? 'flex' : 'hidden md:flex'}`}>

                        {selectedChat !== null ? (
                            <div className="flex-1 flex flex-col">
                                {/* Mobile Chat Header */}
                                <div className="p-3 border-b border-white/10 flex items-center gap-3 md:hidden">
                                    <button onClick={() => setSelectedChat(null)} className="text-sm text-gray-400 hover:text-white">← Back</button>
                                    <span className="font-semibold text-white">Chat</span>
                                </div>
                                <div className="flex-1 flex items-center justify-center text-center p-8">
                                    <div className="opacity-50">
                                        <MessageCircle className="w-12 h-12 mx-auto mb-4 text-pink-500" />
                                        <h3 className="text-lg font-medium text-pink-300">Conversation Active</h3>
                                        <p className="text-sm text-gray-600">This is a responsive placeholder for chat {selectedChat}.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center p-8">
                                <div className="opacity-50">
                                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                                    <h3 className="text-lg font-medium text-gray-400">Select a conversation</h3>
                                    <p className="text-sm text-gray-600">Choose a chat from the left to start messaging.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
