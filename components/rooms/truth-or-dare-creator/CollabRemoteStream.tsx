"use client";

import React, { useEffect, useRef } from 'react';
import { VideoOff, CheckCircle2 } from 'lucide-react';

interface CollabRemoteStreamProps {
    /** The Agora remote user object from useRemoteUsers() */
    user: any;
    /** Collab creator's avatar URL */
    avatarUrl?: string | null;
    /** Collab creator's display name */
    creatorName?: string;
}

/**
 * Renders a single collab creator's remote Agora video stream.
 * Manually plays the remote user's video/audio tracks into a div ref,
 * so this component does NOT need to be inside AgoraRTCProvider.
 */
export default function CollabRemoteStream({ user, avatarUrl, creatorName }: CollabRemoteStreamProps) {
    const videoRef = useRef<HTMLDivElement>(null);
    const hasVideo = user?.hasVideo ?? false;
    const hasAudio = user?.hasAudio ?? false;

    // Play the remote video track
    useEffect(() => {
        if (!user || !videoRef.current) return;

        const videoTrack = user.videoTrack;
        if (videoTrack) {
            try {
                videoTrack.play(videoRef.current, { fit: 'cover' });
            } catch (e) {
                console.error('CollabRemoteStream: Failed to play video', e);
            }
        }

        return () => {
            // Stop playback when unmounting or user changes
            if (videoTrack) {
                try { videoTrack.stop(); } catch (e) { /* ignore */ }
            }
        };
    }, [user, user?.videoTrack]);

    // Play the remote audio track
    useEffect(() => {
        if (!user) return;
        const audioTrack = user.audioTrack;
        if (audioTrack) {
            try { audioTrack.play(); } catch (e) { /* ignore */ }
        }
        return () => {
            if (audioTrack) {
                try { audioTrack.stop(); } catch (e) { /* ignore */ }
            }
        };
    }, [user, user?.audioTrack]);

    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            {user ? (
                <>
                    {/* Video container */}
                    <div ref={videoRef} className="w-full h-full" />
                    {!hasVideo && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={creatorName || 'Collab'}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-green-500/40 mb-2"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border-2 border-green-500/40 mb-2">
                                    <span className="text-2xl font-bold text-green-300">
                                        {creatorName?.charAt(0).toUpperCase() || 'C'}
                                    </span>
                                </div>
                            )}
                            <VideoOff className="w-4 h-4 text-gray-500 mb-1" />
                            <span className="text-[10px] text-gray-400">Camera Off</span>
                        </div>
                    )}
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                    <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mb-2" />
                    <span className="text-[10px] text-gray-400">Connecting...</span>
                </div>
            )}
            {/* COLLAB badge */}
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-green-500/20 border border-green-500/30 px-2 py-0.5 rounded-full backdrop-blur-sm">
                <CheckCircle2 className="w-2.5 h-2.5 text-green-400" />
                <span className="text-[9px] text-green-300 font-bold">COLLAB</span>
            </div>
            {/* Name overlay */}
            {creatorName && (
                <div className="absolute bottom-2 right-2 z-10">
                    <span className="text-[10px] text-white/70 font-medium bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        {creatorName}
                    </span>
                </div>
            )}
            {/* LIVE badge */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-red-600/90 px-2 py-0.5 rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[9px] font-bold text-white">LIVE</span>
            </div>
        </div>
    );
}
