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
    useConnectionState,
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
    /** Callback to expose Agora remote users to parent (for rendering collab streams) */
    onRemoteUsersChange?: (users: any[]) => void;
    isGrid?: boolean;
}

interface FanProfile {
    id: string;
    username: string;
    avatar_url: string | null;
}

function toNumericUid(input: string | number): number {
    if (typeof input === 'number') return Math.abs(input) % 0x7FFFFFFF || 1;
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
        hash = hash >>> 0;
    }
    return hash || 1;
}

export default function CreatorStream({ appId, channelName, uid, avatarUrl, creatorName, onRemoteUsersChange, isGrid }: CreatorStreamProps) {
    const supabase = createClient();
    const [token, setToken] = useState<string | null | undefined>(undefined);
    const [dynamicAppId, setDynamicAppId] = useState<string>(appId);
    const [numericUid, setNumericUid] = useState<number>(0);
    const [isStreaming, setIsStreaming] = useState(true);
    const [roleSet, setRoleSet] = useState(false);
    const client = useRTCClient();

    // Ensure Creator is a Host so they can publish
    useEffect(() => {
        if (client) {
            setRoleSet(false);
            client.setClientRole("host")
                .then(() => {
                    console.log("CreatorStream: Role set to HOST");
                    setRoleSet(true);
                })
                .catch(err => {
                    console.error("CreatorStream: Failed to set role", err);
                });
        }
    }, [client]);

    // Tracks - Always active for preview
    const { localMicrophoneTrack } = useLocalMicrophoneTrack(true);
    const { localCameraTrack } = useLocalCameraTrack(true);

    // Countdown State
    const [countdown, setCountdown] = useState<number | null>(null);

    // Fan Presence State
    const remoteUsers = useRemoteUsers(); // Track connected fans/collab creators
    const [fans, setFans] = useState<FanProfile[]>([]);
    // Real-time watcher count from room_participants (accurate for audience-role fans)
    const [watcherCount, setWatcherCount] = useState<number>(0);

    // Expose remote users to parent for collab slot rendering
    useEffect(() => {
        onRemoteUsersChange?.(remoteUsers);
    }, [remoteUsers, remoteUsers.length, onRemoteUsersChange]);

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

            try {
                // Fetch room participants to get their UUIDs
                const { data: participants } = await supabase
                    .from('room_participants')
                    .select('user_id')
                    .eq('room_id', channelName);

                if (!participants || participants.length === 0) {
                    setFans([]);
                    return;
                }

                const userIds = participants.map(p => p.user_id).filter(Boolean);

                const { data } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', userIds);

                if (data) {
                    // Match remoteUsers (numeric) to profiles (UUIDs hashed to numeric)
                    const matched = data.filter(p =>
                         remoteUsers.some(u => Number(u.uid) === toNumericUid(p.id))
                    );
                    setFans(matched);
                }
            } catch (e) {
                console.error("Error fetching fan profiles:", e);
            }
        }

        fetchFanProfiles();
    }, [remoteUsers.length, JSON.stringify(remoteUsers.map(u => u.uid))]);

    // Real-time watcher count from room_participants
    useEffect(() => {
        if (!channelName) return;

        async function fetchWatcherCount() {
            const { data } = await supabase
                .from('room_participants')
                .select('user_id')
                .eq('room_id', channelName);
            const unique = new Set((data || []).map((p: any) => p.user_id).filter(Boolean));
            setWatcherCount(unique.size);
        }

        fetchWatcherCount();

        const channel = supabase
            .channel(`creator-stream-participants-${channelName}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'room_participants',
                filter: `room_id=eq.${channelName}`,
            }, () => {
                fetchWatcherCount();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [channelName]);


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
                    setToken(null);
                }
                if (data.appId) setDynamicAppId(data.appId);
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
    console.log("CreatorStream: Joining with UID:", numericUid);

    useJoin(
        { appid: dynamicAppId, channel: channelName, token: token ?? null, uid: numericUid },
        token !== undefined && numericUid > 0 && roleSet
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
    const connectionState = useConnectionState();

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

    if (token === undefined) return (
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
                        <div className={`relative z-10 flex flex-col items-center ${isGrid ? "gap-2" : "gap-6"}`}>
                            <div className="relative">
                                {/* Gold Glow Effects */}
                                <div className={`absolute rounded-full bg-gold/20 opacity-50 blur-xl animate-pulse ${isGrid ? "-inset-2" : "-inset-4"}`} />
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-gold/50 via-gold to-gold/50 opacity-75 blur-sm" />

                                {/* Avatar */}
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={creatorName || 'Creator'}
                                        className={`relative rounded-full object-cover border-2 border-gold shadow-[0_0_30px_rgba(212,175,55,0.3)] ${
                                            isGrid ? "w-12 h-12" : "w-28 h-28"
                                        }`}
                                    />
                                ) : (
                                    <div className={`relative rounded-full bg-gradient-to-br from-gold/20 to-gold/10 flex items-center justify-center border-2 border-gold shadow-[0_0_30px_rgba(212,175,55,0.3)] ${
                                        isGrid ? "w-12 h-12" : "w-28 h-28"
                                    }`}>
                                        <span className={`font-bold text-gold ${isGrid ? "text-lg" : "text-4xl"}`}>
                                            {creatorName ? creatorName.charAt(0).toUpperCase() : 'C'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Name & Status */}
                            <div className="text-center space-y-1.5">
                                {creatorName && !isGrid && (
                                    <h3 className="text-white font-bold text-xl tracking-tight drop-shadow-lg">
                                        {creatorName}
                                    </h3>
                                )}
                                <div className={`flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-xl ${
                                    isGrid ? "px-2 py-0.5 gap-1" : "px-4 py-1.5 gap-2"
                                }`}>
                                    <VideoOff className={`text-gold/90 ${isGrid ? "w-3 h-3" : "w-4 h-4"}`} />
                                    <span className={`font-medium text-gold/90 uppercase tracking-widest ${
                                        isGrid ? "text-[8px]" : "text-xs"
                                    }`}>Camera Off</span>
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
            <div className={`absolute left-1/2 -translate-x-1/2 z-10 flex items-center bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-100 transition-opacity ${
                isGrid 
                ? "bottom-2 gap-1.5 px-2 py-1" 
                : "bottom-4 gap-3 px-4 py-2 lg:opacity-0 lg:group-hover:opacity-100"
            }`}>
                <button
                    onClick={() => setMicOn(!micOn)}
                    className={`rounded-full transition ${isGrid ? 'p-1.5' : 'p-2'} ${micOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/80 text-white'}`}
                >
                    {micOn ? <Mic className={isGrid ? "w-3 h-3" : "w-4 h-4"} /> : <MicOff className={isGrid ? "w-3 h-3" : "w-4 h-4"} />}
                </button>

                <button
                    onClick={() => isStreaming ? setIsStreaming(false) : startStreamSequence()}
                    disabled={countdown !== null}
                    className={`rounded-full font-bold flex items-center transition ${
                        isGrid 
                        ? 'px-2.5 py-1 text-[9px] gap-1' 
                        : 'px-4 py-2 text-xs gap-2'
                    } ${isStreaming
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : countdown !== null ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'
                        }`}
                >
                    {isStreaming ? (
                        <>
                            <Square className={`${isGrid ? "w-2.5 h-2.5" : "w-3 h-3"} fill-current`} /> {!isGrid && "Stop"}
                        </>
                    ) : countdown !== null ? (
                        <>
                            <span className="animate-spin text-xs">⏳</span> {!isGrid && "Ready..."}
                        </>
                    ) : (
                        <>
                            <Play className={`${isGrid ? "w-2.5 h-2.5" : "w-3 h-3"} fill-current`} /> {!isGrid && "Go Live"}
                        </>
                    )}
                </button>

                <button
                    onClick={() => setCamOn(!camOn)}
                    className={`rounded-full transition ${isGrid ? 'p-1.5' : 'p-2'} ${camOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-500/80 text-white'}`}
                >
                    {camOn ? <Video className={isGrid ? "w-3 h-3" : "w-4 h-4"} /> : <VideoOff className={isGrid ? "w-3 h-3" : "w-4 h-4"} />}
                </button>
            </div>

            {/* LIVE Status Badge */}
            {!isGrid && (
                <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                    {isStreaming && isConnected ? (
                        <span className="px-2 py-1 rounded-md bg-red-600 text-[10px] font-bold text-white shadow-lg animate-pulse">
                            LIVE
                        </span>
                    ) : isStreaming && !isConnected ? (
                        <>
                            <span className="px-2 py-1 rounded-md bg-yellow-600/90 text-[10px] font-bold text-white shadow-lg">
                                {!roleSet ? "INITIALIZING..." : connectionState === 'DISCONNECTED' ? 'CONNECTION FAILED' : connectionState.toUpperCase()}
                            </span>
                            {connectionState === 'DISCONNECTED' && roleSet && (
                                <div className="bg-red-950/90 text-red-200 text-[10px] p-2 rounded-md border border-red-500/50 max-w-[200px] text-right shadow-xl">
                                    <strong>Broadcast Failed:</strong> Could not connect to Agora Edge Servers.<br/>
                                    Please verify your <code>NEXT_PUBLIC_AGORA_APP_ID</code> and Certificate.
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="px-2 py-1 rounded-md bg-black/60 border border-white/10 text-[10px] text-gray-400">
                            OFFLINE
                        </span>
                    )}
                </div>
            )}

            {/* Fan Presence Overlay (Top Left on Mobile, Bottom Left on Desktop) */}
            {!isGrid && (
                <div className="absolute top-3 left-3 sm:top-auto sm:bottom-4 sm:left-4 z-20 flex flex-col gap-1 sm:gap-2">
                    {/* Participant Count */}
                    <div className="flex items-center gap-1 sm:gap-2 px-1.5 py-0.5 sm:px-3 sm:py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[9px] sm:text-xs text-white shadow-lg w-fit">
                        <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-pink-400" />
                        <span className="font-bold">{watcherCount}</span> Watching
                    </div>

                    {/* Avatars (Max 10) */}
                    {fans.length > 0 && (
                        <div className="flex -space-x-1 sm:-space-x-2 overflow-hidden py-0.5 px-0.5">
                            {fans.slice(0, 10).map((fan) => (
                                <div key={fan.id} className="relative group/avatar cursor-pointer">
                                    <img
                                        src={fan.avatar_url || `https://ui-avatars.com/api/?name=${fan.username}&background=random`}
                                        alt={fan.username}
                                        className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border-2 border-black object-cover"
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/avatar:opacity-100 transition whitespace-nowrap pointer-events-none">
                                        {fan.username}
                                    </div>
                                </div>
                            ))}
                            {fans.length > 10 && (
                                <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full border-2 border-black bg-gray-800 text-white text-[8px] sm:text-[10px] flex items-center justify-center font-bold">
                                    +{fans.length - 10}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
