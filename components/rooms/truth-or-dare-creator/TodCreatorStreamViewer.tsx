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
    /** If set, render as a fan/viewer watching this specific host's remote stream */
    remoteHostId?: string | null;
    /** If true, this is the collab creator's own camera (broadcasts as host on the channel) */
    isCollabSelf?: boolean;
    /** Callback to expose Agora remote users to parent (only used when broadcasting as host) */
    onRemoteUsersChange?: (users: any[]) => void;
    /** If true, the stream should release the camera (e.g. for a modal call) */
    isPaused?: boolean;
    isGrid?: boolean;
}

const TodCreatorStreamViewer = ({
    roomId,
    userId,
    appId,
    avatarUrl,
    creatorName,
    viewerCount = 0,
    remoteHostId,
    isCollabSelf,
    onRemoteUsersChange,
    isPaused,
    isGrid,
}: TodCreatorStreamViewerProps) => {
    const canStream = roomId && userId && appId;
    const activeStream = canStream && !isPaused;

    return (
        <div className="relative rounded-xl overflow-hidden tod-creator-neon-border-pink tod-creator-glow-pink h-full">
            {activeStream ? (
                remoteHostId ? (
                    /* Viewing a remote host's stream (collab creator watching the main host) */
                    <LiveStreamWrapper
                        role="fan"
                        roomId={roomId}
                        uid={userId}
                        hostId={remoteHostId}
                        appId={appId}
                        hostAvatarUrl={avatarUrl}
                        hostName={creatorName}
                        isGrid={isGrid}
                    />
                ) : (
                    /* Broadcasting own camera (both host and collab creator publish) */
                    <LiveStreamWrapper
                        role="host"
                        roomId={roomId}
                        uid={userId}
                        hostId={userId}
                        appId={appId}
                        hostAvatarUrl={avatarUrl}
                        hostName={creatorName}
                        onRemoteUsersChange={onRemoteUsersChange}
                        isGrid={isGrid}
                    />
                )
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
            {(activeStream || remoteHostId) && (
                <div className={`absolute flex items-center bg-red-600/90 rounded-md z-10 ${
                    isGrid 
                    ? "top-2 left-2 gap-1 px-1.5 py-0.5" 
                    : "top-4 left-4 gap-1.5 px-3 py-1"
                }`}>
                    <div className={`rounded-full bg-white tod-creator-animate-pulse-glow ${isGrid ? "w-1.5 h-1.5" : "w-2 h-2"}`} />
                    <span className={`text-white font-bold ${isGrid ? "text-[9px]" : "text-sm"}`}>
                        {isCollabSelf ? 'YOU' : 'LIVE'}
                    </span>
                </div>
            )}
            {/* Viewer count (hide for secondary slots) */}
            {(activeStream || remoteHostId) && viewerCount > 0 && (
                <div className={`absolute flex items-center tod-creator-panel-bg rounded-md z-10 ${
                    isGrid 
                    ? "top-2 right-2 gap-1 px-1.5 py-0.5" 
                    : "top-4 right-4 gap-1.5 px-3 py-1"
                }`}>
                    <Wifi className={`tod-creator-text-neon-green ${isGrid ? "w-3 h-3" : "w-4 h-4"}`} />
                    <span className={`text-white font-semibold ${isGrid ? "text-[9px]" : "text-sm"}`}>
                        {viewerCount.toLocaleString()}
                    </span>
                </div>
            )}
            {/* Creator name overlay */}
            {creatorName && (
                <div className={`absolute z-10 ${isGrid ? "bottom-2 left-2" : "bottom-3 left-3"}`}>
                    <span className={`text-white/80 font-medium bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm ${
                        isGrid ? "text-[9px]" : "text-[11px]"
                    }`}>
                        {isCollabSelf ? `🎬 ${creatorName} (You)` : remoteHostId ? `👑 ${creatorName}` : creatorName}
                    </span>
                </div>
            )}
        </div>
    );
};

export default TodCreatorStreamViewer;
