"use client";

import React, { useEffect, useState, useRef } from 'react';
import AgoraProvider, { createAgoraClient } from '@/components/providers/AgoraProvider';
import {
    useLocalCameraTrack,
    useLocalMicrophoneTrack,
    usePublish,
    useJoin,
    useRemoteUsers,
    useRTCClient,
    RemoteUser
} from 'agora-rtc-react';

interface PrivateCallStreamProps {
    appId: string;
    channelName: string;
    uid: string | number;
    remoteAvatarUrl?: string | null;
    remoteName?: string;
}

// Simple Error Boundary to catch Camera/Mic permission errors
class StreamErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center z-50">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
                        <span className="text-red-500 text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-bold mb-1">Camera/Mic Blocked</h3>
                    <p className="text-xs text-white/60 max-w-xs">
                        {this.state.error?.message || "Please allow camera and microphone permissions in your browser to join the call."}
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-pink-600 rounded text-xs font-bold hover:bg-pink-500 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

function PrivateCallStreamInner({ appId, channelName, uid, remoteAvatarUrl, remoteName }: PrivateCallStreamProps) {
    const [token, setToken] = useState<string | null | undefined>(undefined);
    const [numericUid, setNumericUid] = useState<number>(0);
    const client = useRTCClient();

    // Ensure we are a host so we can publish
    useEffect(() => {
        if (client) {
            client.setClientRole("host").catch(console.error);
        }
    }, [client]);

    // Local tracks
    const { localMicrophoneTrack } = useLocalMicrophoneTrack(true);
    const { localCameraTrack } = useLocalCameraTrack(true);
    const vidRef = useRef<HTMLDivElement>(null);

    // Play local track in PiP
    useEffect(() => {
        if (localCameraTrack && vidRef.current) {
            localCameraTrack.play(vidRef.current);
        }
    }, [localCameraTrack]);

    // Keep refs of tracks for proper cleanup on unmount
    const tracksRef = useRef({ localCameraTrack, localMicrophoneTrack });
    useEffect(() => {
        tracksRef.current = { localCameraTrack, localMicrophoneTrack };
    }, [localCameraTrack, localMicrophoneTrack]);

    // Remote users
    const remoteUsers = useRemoteUsers();
    // In a 1-on-1 call, there is only one remote user
    const remoteUser = remoteUsers[0] ?? null;

    // Fetch Token
    useEffect(() => {
        let mounted = true;
        async function fetchToken() {
            try {
                const res = await fetch('/api/v1/auth/agora-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channelName,
                        role: 'publisher',
                        uid: String(uid),
                    })
                });
                const data = await res.json();
                if (!mounted) return;
                if (data.token !== undefined) setToken(data.token);
                if (data.numericUid) setNumericUid(data.numericUid);
            } catch (e) {
                console.error("Failed to fetch token", e);
                if (mounted) setToken(null);
            }
        }
        if (channelName && uid) fetchToken();
        return () => { mounted = false; };
    }, [channelName, uid]);

    const isReady = token !== undefined && numericUid > 0;
    
    // Join the channel
    useJoin(
        { appid: appId, channel: channelName, token: token ?? null, uid: numericUid },
        isReady
    );

    // Publish local tracks
    usePublish([localMicrophoneTrack, localCameraTrack], isReady && !!localMicrophoneTrack && !!localCameraTrack);

    // Cleanup tracks on unmount
    useEffect(() => {
        return () => {
            if (tracksRef.current.localCameraTrack) {
                tracksRef.current.localCameraTrack.stop();
                tracksRef.current.localCameraTrack.close();
            }
            if (tracksRef.current.localMicrophoneTrack) {
                tracksRef.current.localMicrophoneTrack.stop();
                tracksRef.current.localMicrophoneTrack.close();
            }
        };
    }, []);

    // Loading State
    if (!isReady) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white/50">
                Connecting...
            </div>
        );
    }

    return (
        <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center">
            {/* Remote User (Main View) */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
                {remoteUser ? (
                    <RemoteUser user={remoteUser} cover="cover" className="w-full h-full" />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4">
                        {remoteAvatarUrl ? (
                            <img 
                                src={remoteAvatarUrl} 
                                alt={remoteName || "Participant"} 
                                className="w-24 h-24 rounded-full border-2 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)] object-cover" 
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border-2 border-pink-500 flex items-center justify-center">
                                <span className="text-3xl font-bold text-white">
                                    {remoteName ? remoteName.charAt(0).toUpperCase() : '?'}
                                </span>
                            </div>
                        )}
                        <p className="text-white/50 text-sm animate-pulse">
                            Waiting for {remoteName || 'the other person'}...
                        </p>
                    </div>
                )}
            </div>

            {/* Local User (PiP) */}
            <div className="absolute bottom-3 right-3 w-28 h-36 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl bg-black/80 z-20">
                <div ref={vidRef} className="w-full h-full object-cover" />
                <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-white/70 font-semibold backdrop-blur-sm">
                    You
                </div>
            </div>
        </div>
    );
}

export default function PrivateCallStream(props: PrivateCallStreamProps) {
    const [client, setClient] = useState<any>(null);

    useEffect(() => {
        const c = createAgoraClient();
        setClient(c);
        return () => {
            // Client cleanup if necessary
        };
    }, []);

    if (!client) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white/50">
                Initializing Call...
            </div>
        );
    }

    return (
        <AgoraProvider client={client}>
            <StreamErrorBoundary>
                <PrivateCallStreamInner {...props} />
            </StreamErrorBoundary>
        </AgoraProvider>
    );
}
