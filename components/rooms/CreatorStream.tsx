"use client";

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
    LocalUser,
    useLocalCameraTrack,
    useLocalMicrophoneTrack,
    usePublish,
    useJoin,
    useIsConnected,
    useRemoteUsers,
    useRTCClient,
} from 'agora-rtc-react';
import { Mic, MicOff, Video, VideoOff, Play, Square, Users } from 'lucide-react';
import ActiveRequestOverlay from './ActiveRequestOverlay';
import CreatorRequestManager from './CreatorRequestManager';

interface CreatorStreamProps {
    appId: string;
    channelName: string;
    uid: string | number;
    avatarUrl?: string | null;
    creatorName?: string;
}

interface FanProfile {
    id: string;
    username: string;
    avatar_url: string | null;
}

export default function CreatorStream({ appId, channelName, uid, avatarUrl, creatorName }: CreatorStreamProps) {
    const supabase = createClient();
    const [token, setToken] = useState<string | null>(null);
    const [numericUid, setNumericUid] = useState<number>(0);
    const [isStreaming, setIsStreaming] = useState(true);
    const client = useRTCClient();

    // Ensure Creator is a Host so they can publish
    useEffect(() => {
        if (client) {
            client.setClientRole("host")
                .then(() => console.log("CreatorStream: Role set to HOST"))
                .catch(err => console.error("CreatorStream: Failed to set role", err));
        }
    }, [client]);

    // Tracks - Always active for preview
    const { localMicrophoneTrack } = useLocalMicrophoneTrack(true);
    const { localCameraTrack } = useLocalCameraTrack(true);

    // Countdown State
    const [countdown, setCountdown] = useState<number | null>(null);

    // Fan Presence State
    const remoteUsers = useRemoteUsers(); // Track connected fans
    const [fans, setFans] = useState<FanProfile[]>([]);

    // Final safety cleanup on unmount - Defined early to avoid Hook Order errors
    useEffect(() => {
        return () => {
            localCameraTrack?.stop();
            localCameraTrack?.close();
            localMicrophoneTrack?.stop();
            localMicrophoneTrack?.close();
        };
    }, []);

    // Fetch Fan Profiles when remoteUsers change
    useEffect(() => {
        async function fetchFanProfiles() {
            if (remoteUsers.length === 0) {
                setFans([]);
                return;
            }

            // remoteUsers uid comes as string/number based on join method
            // We expect string UUIDs for fans
            const fanIds = remoteUsers.map(u => String(u.uid));

            // Avoid re-fetching if we already have these profiles?
            // For simplicity, just fetch current list to keep it synced.
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', fanIds);

                if (data) {
                    setFans(data);
                }
            } catch (e) {
                console.error("Error fetching fan profiles:", e);
            }
        }

        // Debounce slightly or just run
        fetchFanProfiles();
    }, [remoteUsers.length, JSON.stringify(remoteUsers.map(u => u.uid))]);


    const startStreamSequence = () => {
        setCountdown(3);
    };

    useEffect(() => {
        if (countdown === null) return;
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            // Countdown finished
            setCountdown(null);
            setIsStreaming(true);
        }
    }, [countdown]);

    const [error, setError] = useState<string | null>(null);

    // Fetch Token
    useEffect(() => {
        let mounted = true;
        async function fetchToken() {
            try {
                setError(null);
                const res = await fetch('/api/v1/auth/agora-token', {
                    method: 'POST',
                    body: JSON.stringify({
                        channelName,
                        role: 'publisher',
                        uid,
                        expireTime: 3600 * 24
                    })
                });
                const data = await res.json();

                if (!mounted) return;

                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.token !== undefined) {
                    setToken(data.token);
                } else {
                    throw new Error("No token returned from API");
                }
                if (data.numericUid) setNumericUid(data.numericUid);
            } catch (e: any) {
                console.error("Failed to fetch token", e);
                if (mounted) setError(e.message || "Failed to load studio token.");
            }
        }
        if (channelName && uid) fetchToken();
        return () => { mounted = false; };
    }, [channelName, uid]);

    // Join & Publish
    console.log("CreatorStream: Joining with UID:", uid);
    // Join always to establish connection? Or only when streaming? 
    // Usually better to join early, publish later. Let's keep join conditional or always? 
    // If we join always, we are "in the room". 
    // Let's stick to: Join always (so we can get remote users/chat), Publish only when isStreaming.

    useJoin(
        { appid: appId, channel: channelName, token: token || null, uid: numericUid || uid },
        !!token && numericUid > 0
    );

    const tracksToPublish = [localMicrophoneTrack, localCameraTrack].filter(t => t !== null);
    usePublish(tracksToPublish as any, isStreaming && !!token && tracksToPublish.length > 0);

    // Mute toggles
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);

    useEffect(() => {
        if (localMicrophoneTrack) localMicrophoneTrack.setEnabled(micOn);
    }, [micOn, localMicrophoneTrack]);

    useEffect(() => {
        if (localCameraTrack) localCameraTrack.setEnabled(camOn);
    }, [camOn, localCameraTrack]);

    const vidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Play local video whenever track is available (Preview Mode)
        if (localCameraTrack && vidRef.current) {
            localCameraTrack.play(vidRef.current, { fit: 'cover' });
        }
        return () => {
            // Do NOT stop/close track here, just stop playback if needed, 
            // but Agora SDK handles playing on same element well.
            // If we want to be safe:
            // localCameraTrack?.stop(); 
            // But we want it to persist. 
        };
    }, [localCameraTrack]);

    // Cleanup tracks ONLY on component unmount (handled by top-level useEffect)
    // Removed the "stop tracks when !isStreaming" effect.

    const isConnected = useIsConnected();

    if (error) {
        return (
            <div className="w-full h-full bg-gray-900 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                <div className="text-red-400 mb-2">Studio Error</div>
                <div className="text-gray-400 text-sm mb-4">{error}</div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-white transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!token) return (
        <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                <div className="text-xs text-gray-500">Preparing studio...</div>
            </div>
        </div>
    );

    return (
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden group">
            {/* Video Surface */}
            <div className="absolute inset-0 z-0">
                {/* Direct Video Render */}
                <div ref={vidRef} className="w-full h-full object-cover" />

                {!camOn && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden bg-black">
                        {/* Blurred Background with Avatar */}
                        <div className="absolute inset-0">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt=""
                                    className="w-full h-full object-cover scale-110 blur-2xl opacity-40"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-900 via-purple-950 to-black" />
                            )}
                        </div>

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

                        {/* Centered Avatar with Ring */}
                        <div className="relative z-10 flex flex-col items-center gap-6">
                            <div className="relative">
                                {/* Gold Glow Effects */}
                                <div className="absolute -inset-4 rounded-full bg-gold/20 opacity-50 blur-xl animate-pulse" />
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-gold/50 via-gold to-gold/50 opacity-75 blur-sm" />

                                {/* Avatar */}
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={creatorName || 'Creator'}
                                        className="relative w-28 h-28 rounded-full object-cover border-2 border-gold shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                                    />
                                ) : (
                                    <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gold/20 to-gold/10 flex items-center justify-center border-2 border-gold shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                                        <span className="text-4xl font-bold text-gold">
                                            {creatorName ? creatorName.charAt(0).toUpperCase() : 'C'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Name & Status */}
                            <div className="text-center space-y-2">
                                {creatorName && (
                                    <h3 className="text-white font-bold text-xl tracking-tight drop-shadow-lg">
                                        {creatorName}
                                    </h3>
                                )}
                                <div className="flex items-center justify-center gap-2 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-xl">
                                    <VideoOff className="w-4 h-4 text-gold/90" />
                                    <span className="text-xs font-medium text-gold/90 uppercase tracking-widest">Camera Off</span>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Orbs */}
                        <div className="absolute -top-10 -left-10 w-64 h-64 bg-gold/5 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
                    </div>
                )}
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 to-purple-600 animate-pulse scale-150 transform">
                        {countdown === 0 ? "GO!" : countdown}
                    </div>
                </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => setMicOn(!micOn)}
                    className={`p-2 rounded-full ${micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/80 text-white'}`}
                >
                    {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <button
                    onClick={() => isStreaming ? setIsStreaming(false) : startStreamSequence()}
                    disabled={countdown !== null}
                    className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition ${isStreaming
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : countdown !== null ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                >
                    {isStreaming ? (
                        <>
                            <Square className="w-3 h-3 fill-current" /> Stop
                        </>
                    ) : countdown !== null ? (
                        <>
                            <span className="animate-spin text-lg">⏳</span> Ready...
                        </>
                    ) : (
                        <>
                            <Play className="w-3 h-3 fill-current" /> Go Live
                        </>
                    )}
                </button>

                <button
                    onClick={() => setCamOn(!camOn)}
                    className={`p-2 rounded-full ${camOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/80 text-white'}`}
                >
                    {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
            </div>

            {/* LIVE Status Badge */}
            <div className="absolute top-4 right-4 z-10">
                {isStreaming && isConnected ? (
                    <span className="px-2 py-1 rounded-md bg-red-600 text-[10px] font-bold text-white shadow-lg animate-pulse">
                        LIVE
                    </span>
                ) : (
                    <span className="px-2 py-1 rounded-md bg-black/60 border border-white/10 text-[10px] text-gray-400">
                        OFFLINE
                    </span>
                )}
            </div>

            {/* Fan Presence Overlay (Bottom Left) */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                {/* Participant Count */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-white shadow-lg w-fit">
                    <Users className="w-3 h-3 text-pink-400" />
                    <span className="font-bold">{remoteUsers.length}</span> Watching
                </div>

                {/* Avatars (Max 10) */}
                {fans.length > 0 && (
                    <div className="flex -space-x-2 overflow-hidden py-1 px-1">
                        {fans.slice(0, 10).map((fan) => (
                            <div key={fan.id} className="relative group/avatar cursor-pointer">
                                <img
                                    src={fan.avatar_url || `https://ui-avatars.com/api/?name=${fan.username}&background=random`}
                                    alt={fan.username}
                                    className="w-8 h-8 rounded-full border-2 border-black object-cover"
                                />
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/avatar:opacity-100 transition whitespace-nowrap pointer-events-none">
                                    {fan.username}
                                </div>
                            </div>
                        ))}
                        {fans.length > 10 && (
                            <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 text-white text-[10px] flex items-center justify-center font-bold">
                                +{fans.length - 10}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
