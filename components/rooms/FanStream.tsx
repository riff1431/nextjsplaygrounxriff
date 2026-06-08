"use client";

import React, { useEffect, useState } from 'react';
import {
    RemoteUser,
    useJoin,
    useRemoteUsers,
    useRTCClient,
    useConnectionState,
    useIsConnected,
} from 'agora-rtc-react';
import { VideoOff } from 'lucide-react';

interface FanStreamProps {
    appId?: string;
    channelName: string;
    uid: string | number; // fan's Supabase UUID
    hostId: string | number;
    hostAvatarUrl?: string | null;
    hostName?: string;
    /** If provided, callback when the number of remote broadcasters changes */
    onRemoteCountChange?: (count: number) => void;
    collabCreators?: { id: string, name: string, avatarUrl?: string }[];
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

export default function FanStream({ appId, channelName, uid, hostId, hostAvatarUrl, hostName, collabCreators, onRemoteCountChange }: FanStreamProps) {
    const [token, setToken] = useState<string | null | undefined>(undefined); // undefined = loading
    const [dynamicAppId, setDynamicAppId] = useState<string>("");
    const [numericUid, setNumericUid] = useState<number>(0);
    const [roleSet, setRoleSet] = useState(false);
    const client = useRTCClient();

    // Fetch Token + numeric UID
    useEffect(() => {
        let mounted = true;
        async function fetchToken() {
            try {
                const res = await fetch('/api/v1/auth/agora-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        channelName,
                        role: 'subscriber', // fan is an audience member
                        uid: String(uid),
                    })
                });
                const data = await res.json();
                if (!mounted) return;
                if (data.token !== undefined) {
                    setToken(data.token);
                } else {
                    setToken(null);
                }
                if (data.appId) setDynamicAppId(data.appId);
                if (data.numericUid) setNumericUid(data.numericUid);
            } catch (e) {
                console.error("FanStream: Failed to fetch token, falling back to local App ID:", e);
                if (mounted) {
                    setToken(null); // default to App ID only
                    if (appId) setDynamicAppId(appId);
                    setNumericUid(toNumericUid(uid));
                }
            }
        }
        if (channelName && uid) fetchToken();
        return () => { mounted = false; };
    }, [channelName, uid, appId]);

    // Set client role to "audience" so we receive streams without publishing
    useEffect(() => {
        if (client) {
            setRoleSet(false);
            client.setClientRole("audience")
                .then(() => {
                    console.log("FanStream: Role set to AUDIENCE");
                    setRoleSet(true);
                })
                .catch((e: any) => {
                    console.error("FanStream: Failed to set audience role", e);
                });
        }
    }, [client]);

    // Join as audience — only when token has resolved (null = App ID only, number = with token)
    const isReady = token !== undefined && numericUid > 0 && dynamicAppId !== "" && roleSet;
    useJoin(
        { appid: dynamicAppId, channel: channelName, token: token ?? null, uid: numericUid },
        isReady
    );

    // All remote broadcasters (host + collab creators)
    const remoteUsers = useRemoteUsers();
    const connectionState = useConnectionState();
    const isConnected = useIsConnected();

    // Notify parent when remote user count changes
    useEffect(() => {
        onRemoteCountChange?.(remoteUsers.length);
    }, [remoteUsers.length, onRemoteCountChange]);

    // Loading state
    if (!isReady) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black text-gray-500 text-xs">
                Connecting to stream...
            </div>
        );
    }

    const StreamPlaceholder = ({ label }: { label: string }) => (
        <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden bg-black">
            <div className="absolute inset-0">
                {hostAvatarUrl ? (
                    <img src={hostAvatarUrl} alt="" className="w-full h-full object-cover scale-110 blur-2xl opacity-40" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-purple-950 to-black" />
                )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
            
            <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="absolute -inset-4 rounded-full bg-gold/20 opacity-50 blur-xl animate-pulse" />
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-gold/50 via-gold to-gold/50 opacity-75 blur-sm" />
                    {hostAvatarUrl ? (
                        <img 
                            src={hostAvatarUrl} 
                            alt={hostName || 'Creator'} 
                            className="relative w-28 h-28 rounded-full object-cover border-2 border-gold shadow-[0_0_30px_rgba(212,175,55,0.3)]" 
                        />
                    ) : (
                        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gold/20 to-gold/10 flex items-center justify-center border-2 border-gold shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                            <span className="text-4xl font-bold text-gold">{hostName?.charAt(0).toUpperCase() || 'C'}</span>
                        </div>
                    )}
                </div>
                
                <div className="text-center space-y-2">
                    {hostName && (
                        <h3 className="text-white font-bold text-xl tracking-tight drop-shadow-lg">
                            {hostName}
                        </h3>
                    )}
                        {connectionState === 'DISCONNECTED' && !isConnected ? (
                            <div className="flex items-center justify-center gap-2 bg-red-950/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-red-500/30 shadow-xl">
                                <span className="text-xs font-medium text-red-400 uppercase tracking-widest">Connection Failed</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-xl">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                                </div>
                                <span className="text-xs font-medium text-gold/90 uppercase tracking-widest">{label}</span>
                            </div>
                        )}
                    </div>
            </div>

            {/* Decorative Orbs */}
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-gold/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        </div>
    );

    // ── Multi-creator layout: 2/3/4 creators ──
    if (remoteUsers.length > 1) {
        const count = remoteUsers.length;
        // 2 creators: side-by-side (1 row, 2 cols)
        // 3 creators: 2 on top, 1 centered below (2x2 grid, 3 cells)
        // 4 creators: 2x2 grid
        const gridStyle: React.CSSProperties = count <= 2
            ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' }
            : { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };

        return (
            <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl" style={gridStyle}>
                {remoteUsers.slice(0, 4).map((user, idx) => {
                    let displayName = `Creator ${idx + 1}`;
                    let isHost = false;
                    
                    const hostNumericUid = hostId ? toNumericUid(hostId) : null;
                    if (hostNumericUid && Number(user.uid) === hostNumericUid) {
                        displayName = hostName || 'Creator';
                        isHost = true;
                    } else if (collabCreators) {
                        const collab = collabCreators.find(c => toNumericUid(c.id) === Number(user.uid));
                        if (collab) displayName = collab.name;
                    }

                    return (
                        <div
                            key={`remote-${user.uid}`}
                        className="relative overflow-hidden"
                        style={{
                            // If 3 creators and this is the 3rd (idx=2), center it spanning visually
                            ...(count === 3 && idx === 2 ? { gridColumn: '1 / -1', maxWidth: '50%', justifySelf: 'center' } : {}),
                            borderRight: (idx % 2 === 0 && idx < count - 1 && !(count === 3 && idx === 2)) ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            borderTop: idx >= 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        }}
                    >
                        <RemoteUser user={user} cover="cover" className="w-full h-full" />
                        {!user.hasVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                <VideoOff className="w-8 h-8 text-gray-600" />
                            </div>
                        )}
                        {/* Creator label */}
                        <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                            {isHost && <span className="text-[10px]">👑</span>}
                            {!isHost && <span className="text-[10px]">🎬</span>}
                            <span className="text-[10px] font-bold text-white/80">
                                {displayName}
                            </span>
                        </div>
                        {/* LIVE badge */}
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-red-600/90 px-2 py-0.5 rounded-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-[9px] font-bold text-white">LIVE</span>
                        </div>
                    </div>
                );
            })}
            </div>
        );
    }

    // ── Single creator layout (original) ──
    const broadcaster = remoteUsers[0] ?? null;
    const hostHasVideo = broadcaster?.hasVideo ?? false;

    return (
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl">
            {broadcaster ? (
                <>
                    <RemoteUser user={broadcaster} cover="cover" className="w-full h-full" />
                    {!hostHasVideo && <StreamPlaceholder label="Camera Off" />}
                </>
            ) : (
                <StreamPlaceholder label={hostName ? `${hostName} is setting up...` : "Waiting for Host..."} />
            )}
        </div>
    );
}
