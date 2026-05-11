"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { uploadToLocalServer } from "@/utils/uploadHelper";
import { Mic, Square, Upload, X, Loader2 } from "lucide-react";

import { VoiceNotePlayer } from "@/components/common/VoiceNotePlayer";

interface XChatRequest {
    id: string;
    fan_name: string;
    message: string;
    avatar_url?: string;
    status: "pending" | "accepted" | "declined";
    creator_reply?: string;
}

const IncomingRequests = ({ roomId, sessionId }: { roomId?: string; sessionId?: string | null }) => {
    const supabase = createClient();
    const [requests, setRequests] = useState<XChatRequest[]>([]);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!roomId) return;

        // Reset for fresh session
        setRequests([]);

        async function fetchRequests() {
            let query = supabase
                .from("x_chat_requests")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(20);
            if (sessionId) query = query.eq("session_id", sessionId);
            const { data } = await query;
            if (data) setRequests(data as XChatRequest[]);
        }
        fetchRequests();

        const channel = supabase
            .channel(`x-chat-requests-${roomId}-${sessionId || 'all'}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "x_chat_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload: any) => {
                const newReq = payload.new as XChatRequest;
                // Only add if it belongs to this session
                if (sessionId && (newReq as any).session_id !== sessionId) return;
                setRequests((prev) => [newReq, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, sessionId]);

    const handleAction = async (id: string, action: "accepted" | "declined", replyStr?: string) => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: action, creator_reply: replyStr } : r))
        );
        if (roomId) {
            await fetch(`/api/v1/rooms/${roomId}/x-chat/request`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: id, status: action, creator_reply: replyStr }),
            });
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setMediaFile(e.target.files[0]);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
                setMediaFile(audioFile);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Failed to start recording", err);
            alert("Microphone access denied or error occurred.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleAcceptWithReply = async (id: string) => {
        setUploading(true);
        try {
            let mediaUrl = "";
            if (mediaFile) {
                mediaUrl = await uploadToLocalServer(mediaFile);
            }
            
            const finalReply = [replyText, mediaUrl].filter(Boolean).join("\n");
            await handleAction(id, "accepted", finalReply);
            
            setReplyingTo(null);
            setReplyText("");
            setMediaFile(null);
        } catch (error) {
            console.error("Error sending reply:", error);
            alert("Failed to send reply");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="panel-glass rounded-lg flex flex-col min-h-0 flex-1">
            <div className="px-4 py-3 border-b border-border flex-shrink-0">
                <h2 className="font-display text-sm tracking-widest gold-text text-center">
                    ⭐ INCOMING REQUESTS
                </h2>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin flex-1">
                {requests.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No requests yet</p>
                )}
                {requests.map((r, i) => (
                    <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-2 rounded-lg bg-secondary/50"
                    >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-black/40 border border-border">
                            {r.avatar_url ? (
                                <img src={r.avatar_url} alt={r.fan_name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl text-center leading-none">😎</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground">{r.fan_name}</p>
                            <p className="text-xs text-muted-foreground">⭐ {r.message}</p>
                            {r.status === "pending" ? (
                                <div className="flex flex-col gap-2 mt-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setReplyingTo(r.id)}
                                            className="bg-success text-success-foreground text-xs font-bold px-4 py-1.5 rounded hover:opacity-90 transition-opacity"
                                        >
                                            ACCEPT
                                        </button>
                                        <button
                                            onClick={() => handleAction(r.id, "declined")}
                                            className="bg-secondary text-foreground text-xs font-bold px-4 py-1.5 rounded border border-border hover:bg-muted transition-colors"
                                        >
                                            DECLINE
                                        </button>
                                    </div>
                                    {replyingTo === r.id && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="panel-glass max-w-md w-full rounded-2xl p-5 border border-white/10 shadow-2xl relative"
                                            >
                                                <button 
                                                    onClick={() => { setReplyingTo(null); setMediaFile(null); setReplyText(""); }} 
                                                    className="absolute top-4 right-4 text-white/50 hover:text-white"
                                                >
                                                    <X size={18} />
                                                </button>
                                                <h3 className="text-lg font-bold text-gold mb-1">Accept Request</h3>
                                                <p className="text-sm text-white/70 mb-4">You are accepting {r.fan_name}'s request. Attach media or a message (optional).</p>
                                                
                                                <textarea
                                                    value={replyText}
                                                    onChange={e => setReplyText(e.target.value)}
                                                    placeholder="Type a message to the fan..."
                                                    className="w-full bg-black/40 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 border border-white/10 resize-none"
                                                    rows={3}
                                                />
                                                
                                                {/* Media File Display */}
                                                {mediaFile && (
                                                    <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2 rounded-lg mt-3">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <Upload size={14} className="text-gold flex-shrink-0" />
                                                            <span className="truncate text-sm">{mediaFile.name}</span>
                                                        </div>
                                                        <button onClick={() => setMediaFile(null)} className="text-white/50 hover:text-red-400 p-1">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="flex gap-3 justify-between items-center mt-4 pt-4 border-t border-white/10">
                                                    <div className="flex gap-2">
                                                        {isRecording ? (
                                                            <button onClick={stopRecording} className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-500 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition-colors" title="Stop Recording">
                                                                <Square size={14} fill="currentColor" />
                                                                <span className="text-xs font-bold hidden sm:inline">Stop</span>
                                                            </button>
                                                        ) : (
                                                            <button onClick={startRecording} className="flex items-center gap-2 px-3 py-2 bg-white/5 text-white/70 rounded-lg border border-white/10 hover:text-white hover:bg-white/10 transition-colors" title="Record Voice Note">
                                                                <Mic size={14} />
                                                                <span className="text-xs hidden sm:inline">Voice</span>
                                                            </button>
                                                        )}
                                                        
                                                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white/5 text-white/70 rounded-lg border border-white/10 hover:text-white hover:bg-white/10 transition-colors" title="Upload Media">
                                                            <Upload size={14} />
                                                            <span className="text-xs hidden sm:inline">Upload</span>
                                                        </button>
                                                        <input 
                                                            type="file" 
                                                            ref={fileInputRef} 
                                                            className="hidden" 
                                                            onChange={handleFileSelect}
                                                        />
                                                    </div>

                                                    <button 
                                                        onClick={() => handleAcceptWithReply(r.id)} 
                                                        disabled={uploading}
                                                        className="bg-gold text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-yellow-400 transition-colors disabled:opacity-50"
                                                    >
                                                        {uploading && <Loader2 size={14} className="animate-spin" />}
                                                        Submit Accept
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-1 flex flex-col gap-1">
                                    <span className={`text-xs font-bold inline-block ${r.status === "accepted" ? "text-green-400" : "text-muted-foreground"}`}>
                                        {r.status === "accepted" ? "✓ Accepted" : "✗ Declined"}
                                    </span>
                                    {r.creator_reply && (
                                        <div className="text-xs bg-primary/10 border border-primary/20 text-primary px-2 py-1.5 rounded break-words flex flex-col gap-1">
                                            <span className="font-semibold">↳ Reply:</span>
                                            {r.creator_reply.split('\n').map((line, idx) => {
                                                const isLink = line.startsWith('http') || line.startsWith('/api/');
                                                if (isLink) {
                                                    if (line.match(/\.(webm|mp3|wav|m4a)$/i)) {
                                                        return <VoiceNotePlayer key={idx} src={line} />;
                                                    } else if (line.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
                                                        return <img key={idx} src={line} alt="reply media" className="max-w-full max-h-32 object-contain rounded mt-1" />;
                                                    } else if (line.match(/\.(mp4|ogg)$/i)) {
                                                        return <video key={idx} src={line} controls className="max-w-full max-h-32 object-contain rounded mt-1" />;
                                                    }
                                                    return <a key={idx} href={line} target="_blank" rel="noopener noreferrer" className="underline text-blue-400 mt-1 block truncate">{line}</a>;
                                                }
                                                return <span key={idx}>{line}</span>;
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default IncomingRequests;
