"use client";

import { Wifi } from "lucide-react";
import Image from "next/image";

const TodCreatorStreamViewer = () => (
    <div className="relative rounded-xl overflow-hidden tod-creator-neon-border-pink tod-creator-glow-pink h-full">
        <Image
            src="/rooms/truth-or-dare-creator-bg.jpeg"
            alt="Live stream"
            fill
            className="object-cover"
            priority
        />
        {/* LIVE badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600/90 px-3 py-1 rounded-md">
            <div className="w-2 h-2 rounded-full bg-white tod-creator-animate-pulse-glow" />
            <span className="text-white font-bold text-sm">LIVE</span>
        </div>
        {/* Viewer count */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 tod-creator-panel-bg px-3 py-1 rounded-md">
            <Wifi className="w-4 h-4 tod-creator-text-neon-green" />
            <span className="text-white font-semibold text-sm">4,532</span>
        </div>
    </div>
);

export default TodCreatorStreamViewer;
