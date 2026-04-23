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

const IncomingRequests = ({ roomId }: { roomId?: string }) => {
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

        async function fetchRequests() {
            const { data } = await supabase
                .from("x_chat_requests")
                .select("*")
                .eq("room_id", roomId)
                .order("created_at", { ascending: false })
                .limit(20);
            if (data) setRequests(data as XChatRequest[]);
        }
        fetchRequests();

        const channel = supabase
            .channel(`x-chat-requests-${roomId}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "x_chat_requests",
                filter: `room_id=eq.${roomId}`,
            }, (payload: any) => {
                setRequests((prev) => [payload.new as XChatRequest, ...prev]);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);

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
                                            onClick={() => {
                                                if (r.message.startsWith("Voice Note Reply:")) {
                                                    setReplyingTo(r.id);
                                                } else {
                                                    handleAction(r.id, "accepted");
                                                }
                                            }}
                                            className="bg-success text-success-foreground text-xs font-bold px-4 py-1 rounded hover:opacity-90 transition-opacity"
                                        >
                                            ACCEPT
                                        </button>
                                        <button
                                            onClick={() => handleAction(r.id, "declined")}
                                            className="bg-secondary text-foreground text-xs font-bold px-4 py-1 rounded border border-border hover:bg-muted transition-colors"
                                        >
                                            DECLINE
                                        </button>
                                    </div>
                                    {replyingTo === r.id && (
                                        <div className="flex flex-col gap-2 mt-1 bg-black/20 p-2 rounded border border-border">
                                            <textarea
                                                value={replyText}
                                                onChange={e => setReplyText(e.target.value)}
                                                placeholder="Enter text reply..."
                                                className="w-full bg-input rounded px-2 py-1.5 text-xs focus:outline-emerald-500 resize-none"
                                                rows={2}
                                            />
                                            
                                            {/* Media File Display */}
                                            {mediaFile && (
                                                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded text-xs">
                                                    <span className="truncate max-w-[150px]">{mediaFile.name}</span>
                                                    <button onClick={() => setMediaFile(null)} className="text-primary hover:text-white"><X size={12} /></button>
                                                </div>
                                            )}

                                            <div className="flex gap-2 justify-between items-center">
                                                <div className="flex gap-2">
                                                    {isRecording ? (
                                                        <button onClick={stopRecording} className="p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500/40" title="Stop Recording">
                                                            <Square size={14} fill="currentColor" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={startRecording} className="p-1.5 bg-secondary text-muted-foreground rounded hover:text-white" title="Record Voice Note">
                                                            <Mic size={14} />
                                                        </button>
                                                    )}
                                                    
                                                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-secondary text-muted-foreground rounded hover:text-white" title="Upload Media">
                                                        <Upload size={14} />
                                                    </button>
                                                    <input 
                                                        type="file" 
                                                        ref={fileInputRef} 
                                                        className="hidden" 
                                                        onChange={handleFileSelect}
                                                    />
                                                </div>

                                                <div className="flex gap-2">
                                                    <button onClick={() => { setReplyingTo(null); setMediaFile(null); setReplyText(""); }} className="text-[10px] text-muted-foreground hover:text-white">Cancel</button>
                                                    <button 
                                                        onClick={() => handleAcceptWithReply(r.id)} 
                                                        disabled={uploading || (!replyText && !mediaFile)}
                                                        className="text-[10px] bg-primary text-white px-2 py-1 rounded font-bold flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        {uploading && <Loader2 size={10} className="animate-spin" />}
                                                        Send Reply
                                                    </button>
                                                </div>
                                            </div>
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
                                                    } else if (line.match(/\.(jpeg|jpg|gif|png)$/i)) {
                                                        return <img key={idx} src={line} alt="reply media" className="max-h-24 rounded mt-1" />;
                                                    } else if (line.match(/\.(mp4|ogg)$/i)) {
                                                        return <video key={idx} src={line} controls className="max-h-24 rounded mt-1" />;
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
