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
}: TodCreatorStreamViewerProps) => {
    const canStream = roomId && userId && appId;

    return (
        <div className="relative rounded-xl overflow-hidden tod-creator-neon-border-pink tod-creator-glow-pink h-full">
            {canStream && !isPaused ? (
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
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-600/90 px-3 py-1 rounded-md z-10">
                <div className="w-2 h-2 rounded-full bg-white tod-creator-animate-pulse-glow" />
                <span className="text-white font-bold text-sm">
                    {isCollabSelf ? 'YOU' : 'LIVE'}
                </span>
            </div>
            {/* Viewer count (hide for secondary slots) */}
            {viewerCount > 0 && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 tod-creator-panel-bg px-3 py-1 rounded-md z-10">
                    <Wifi className="w-4 h-4 tod-creator-text-neon-green" />
                    <span className="text-white font-semibold text-sm">
                        {viewerCount.toLocaleString()}
                    </span>
                </div>
            )}
            {/* Creator name overlay */}
            {creatorName && (
                <div className="absolute bottom-3 left-3 z-10">
                    <span className="text-[11px] text-white/80 font-medium bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {isCollabSelf ? `🎬 ${creatorName} (You)` : remoteHostId ? `👑 ${creatorName}` : creatorName}
                    </span>
                </div>
            )}
        </div>
    );
};

export default TodCreatorStreamViewer;
