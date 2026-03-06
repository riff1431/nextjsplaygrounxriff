"use client";

import { Wifi } from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";

const LiveStreamWrapper = dynamic(() => import("@/components/rooms/LiveStreamWrapper"), { ssr: false });

interface TodCreatorStreamViewerProps {
    roomId?: string | null;
    userId?: string | null;
    appId?: string;
    avatarUrl?: string | null;
    creatorName?: string;
    viewerCount?: number;
}

const TodCreatorStreamViewer = ({
    roomId,
    userId,
    appId,
    avatarUrl,
    creatorName,
    viewerCount = 0,
}: TodCreatorStreamViewerProps) => {
    const canStream = roomId && userId && appId;

    return (
        <div className="relative rounded-xl overflow-hidden tod-creator-neon-border-pink tod-creator-glow-pink h-full">
            {canStream ? (
                <LiveStreamWrapper
                    role="host"
                    roomId={roomId}
                    uid={userId}
                    hostId={userId}
                    appId={appId}
                    hostAvatarUrl={avatarUrl}
                    hostName={creatorName}
                />
            ) : (
                <Image
                    src="/rooms/truth-or-dare-creator-bg.jpeg"
                    alt="Live stream"
                    fill
                    className="object-cover"
                    priority
                />
            )}
            {/* LIVE badge */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600/90 px-3 py-1 rounded-md z-10">
                <div className="w-2 h-2 rounded-full bg-white tod-creator-animate-pulse-glow" />
                <span className="text-white font-bold text-sm">LIVE</span>
            </div>
            {/* Viewer count */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 tod-creator-panel-bg px-3 py-1 rounded-md z-10">
                <Wifi className="w-4 h-4 tod-creator-text-neon-green" />
                <span className="text-white font-semibold text-sm">
                    {viewerCount > 0 ? viewerCount.toLocaleString() : "0"}
                </span>
            </div>
        </div>
    );
};

export default TodCreatorStreamViewer;
