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

interface GroupCallStreamProps {
    appId: string;
    channelName: string;
    uid: string | number;
    role: "creator" | "fan";
}

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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center z-50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
                        <span className="text-red-500 text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-bold mb-1">Camera/Mic Blocked</h3>
                    <p className="text-xs text-white/60 max-w-xs">
                        {this.state.error?.message || "Please allow camera and microphone permissions to join the call."}
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

function GroupCallStreamInner({ appId, channelName, uid, role }: GroupCallStreamProps) {
    const [token, setToken] = useState<string | null | undefined>(undefined);
    const [agoraUid, setAgoraUid] = useState<string | number | null>(null);
    const client = useRTCClient();

    // Everyone broadcasts in a group call
    useEffect(() => {
        if (client) {
            client.setClientRole("host").catch(console.error);
        }
    }, [client]);

    // Local tracks
    const { localMicrophoneTrack, error: micError } = useLocalMicrophoneTrack(true);
    const { localCameraTrack, error: camError } = useLocalCameraTrack(true);
    const trackError = micError || camError;
    const vidRef = useRef<HTMLDivElement>(null);

    // Play local track
    useEffect(() => {
        if (localCameraTrack && vidRef.current) {
            localCameraTrack.play(vidRef.current);
        }
    }, [localCameraTrack]);

    const tracksRef = useRef({ localCameraTrack, localMicrophoneTrack });
    useEffect(() => {
        tracksRef.current = { localCameraTrack, localMicrophoneTrack };
    }, [localCameraTrack, localMicrophoneTrack]);

    const remoteUsers = useRemoteUsers();

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
                if (data.stringUid) setAgoraUid(data.stringUid);
                else if (data.numericUid) setAgoraUid(data.numericUid);
            } catch (e) {
                console.error("Failed to fetch token", e);
                if (mounted) setToken(null);
            }
        }
        if (channelName && uid) fetchToken();
        return () => { mounted = false; };
    }, [channelName, uid]);

    const isReady = token !== undefined && agoraUid !== null;
    
    useJoin(
        { appid: appId, channel: channelName, token: token ?? null, uid: agoraUid },
        isReady
    );

    const tracksToPublish = [localMicrophoneTrack, localCameraTrack].filter(t => t !== null);
    usePublish(tracksToPublish as any, isReady && tracksToPublish.length > 0);

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

    if (!isReady) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-black text-xs text-white/50 rounded-xl">
                Connecting to Group Call...
            </div>
        );
    }

    // Dynamic grid layout calculation
    const totalParticipants = remoteUsers.length + 1; // +1 for local user
    let gridCols = 1;
    let gridRows = 1;

    if (totalParticipants === 2) {
        gridCols = 2;
    } else if (totalParticipants >= 3 && totalParticipants <= 4) {
        gridCols = 2;
        gridRows = 2;
    } else if (totalParticipants >= 5 && totalParticipants <= 6) {
        gridCols = 3;
        gridRows = 2;
    } else if (totalParticipants >= 7 && totalParticipants <= 9) {
        gridCols = 3;
        gridRows = 3;
    } else if (totalParticipants >= 10) {
        gridCols = 4;
        gridRows = Math.ceil(totalParticipants / 4);
    }

    return (
        <div className="absolute inset-0 bg-black rounded-xl overflow-hidden p-1">
            <div 
                className="w-full h-full grid gap-1"
                style={{ 
                    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`
                }}
            >
                {/* Local User */}
                <div className="relative rounded-lg overflow-hidden bg-gray-900 border border-white/10">
                    <div ref={vidRef} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white/90 font-bold backdrop-blur-md">
                        You {role === 'creator' ? '(Creator)' : ''}
                    </div>
                </div>

                {/* Remote Users */}
                {remoteUsers.map(user => (
                    <div key={user.uid} className="relative rounded-lg overflow-hidden bg-gray-900 border border-white/10">
                        <RemoteUser user={user} cover="cover" className="w-full h-full" />
                        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white/90 font-bold backdrop-blur-md">
                            Participant
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function GroupCallStream(props: GroupCallStreamProps) {
    const [client, setClient] = useState<any>(null);

    useEffect(() => {
        const c = createAgoraClient();
        setClient(c);
        return () => {
            // cleanup if needed
        };
    }, []);

    if (!client) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-black text-xs text-white/50 rounded-xl">
                Initializing Video Engine...
            </div>
        );
    }

    return (
        <AgoraProvider client={client}>
            <StreamErrorBoundary>
                <GroupCallStreamInner {...props} />
            </StreamErrorBoundary>
        </AgoraProvider>
    );
}
