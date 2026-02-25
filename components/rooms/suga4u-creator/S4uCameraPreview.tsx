"use client";

import { Video } from "lucide-react";

const S4uCameraPreview = () => {
    return (
        <div className="s4u-creator-glass-panel p-4">
            <div className="relative rounded-lg overflow-hidden h-48 bg-white/5 border border-white/10 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10" />
                <div className="relative flex flex-col items-center gap-2 text-white/50">
                    <Video className="w-10 h-10 text-pink-400/60" />
                    <span className="text-xs font-semibold">Camera Preview</span>
                    <span className="text-[10px] text-white/40">No active stream</span>
                </div>
            </div>
        </div>
    );
};

export default S4uCameraPreview;
