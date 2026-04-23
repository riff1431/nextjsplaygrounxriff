import React, { useRef, useState } from "react";
import { Square, Play } from "lucide-react";

export const VoiceNotePlayer = ({ src }: { src: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const current = audioRef.current.currentTime;
        const total = audioRef.current.duration || 1;
        setProgress((current / total) * 100);
    };

    return (
        <div className="flex items-center gap-2 bg-black/40 rounded-full p-1.5 pr-4 mt-1 border border-primary/30 w-full max-w-[250px]">
            <button 
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0 hover:bg-primary/80 transition-colors"
            >
                {isPlaying ? (
                    <Square size={12} fill="currentColor" />
                ) : (
                    <div className="ml-1 w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent" />
                )}
            </button>
            <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <audio 
                ref={audioRef} 
                src={src} 
                onPlay={() => setIsPlaying(true)} 
                onPause={() => setIsPlaying(false)}
                onEnded={() => { setIsPlaying(false); setProgress(0); }}
                onTimeUpdate={handleTimeUpdate}
                className="hidden" 
            />
        </div>
    );
};
