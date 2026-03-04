"use client";

import React, { useEffect, useState } from 'react';
import {
    RemoteUser,
    useJoin,
    useRemoteUsers,
    useRTCClient,
} from 'agora-rtc-react';
import { VideoOff } from 'lucide-react';

interface FanStreamProps {
    appId: string;
    channelName: string;
    uid: string | number; // fan's Supabase UUID — converted to numeric
    hostId: string | number; // not used for matching (Agora uses numeric UIDs)
    hostAvatarUrl?: string | null;
    hostName?: string;
}

export default function FanStream({ appId, channelName, uid, hostAvatarUrl, hostName }: FanStreamProps) {
    const [token, setToken] = useState<string | null | undefined>(undefined); // undefined = loading
    const [numericUid, setNumericUid] = useState<number>(0);
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
                if (data.token !== undefined) setToken(data.token);   // null = App ID only mode
                if (data.numericUid) setNumericUid(data.numericUid);
            } catch (e) {
                console.error("FanStream: Failed to fetch token", e);
                if (mounted) setToken(null); // default to App ID only
            }
        }
        if (channelName && uid) fetchToken();
        return () => { mounted = false; };
    }, [channelName, uid]);

    // Set client role to "audience" so we receive streams without publishing
    useEffect(() => {
        if (client) {
            client.setClientRole("audience").catch((e: any) =>
                console.error("FanStream: Failed to set audience role", e)
            );
        }
    }, [client]);

    // Join as audience — only when token has resolved (null = App ID only, string = with token)
    const isReady = token !== undefined && numericUid > 0;
    useJoin(
        { appid: appId, channel: channelName, token: token ?? null, uid: numericUid },
        isReady
    );

    // In a 1-to-many Bar Lounge, the only broadcaster is the host
    const remoteUsers = useRemoteUsers();
    const broadcaster = remoteUsers[0] ?? null;
    const hostHasVideo = broadcaster?.hasVideo ?? false;

    // Loading state
    if (!isReady) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black text-gray-500 text-xs">
                Connecting to stream...
            </div>
        );
    }

    const CameraOffFallback = () => (
        <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden">
            <div className="absolute inset-0">
                {hostAvatarUrl ? (
                    <img src={hostAvatarUrl} alt="" className="w-full h-full object-cover scale-110 blur-2xl opacity-60" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-900/80 via-purple-900/80 to-indigo-900/80" />
                )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
            <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 opacity-75 blur-md animate-pulse" />
                    {hostAvatarUrl ? (
                        <img src={hostAvatarUrl} alt={hostName || 'Creator'} className="relative w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-2xl" />
                    ) : (
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center border-4 border-white/20 shadow-2xl">
                            <span className="text-3xl font-bold text-white">{hostName?.charAt(0).toUpperCase() || 'C'}</span>
                        </div>
                    )}
                </div>
                <div className="text-center">
                    {hostName && <div className="text-white font-bold text-lg drop-shadow-lg">{hostName}</div>}
                    <div className="flex items-center gap-2 text-sm text-pink-200/90 mt-1">
                        <VideoOff className="w-4 h-4" />
                        <span>Camera Off</span>
                    </div>
                </div>
            </div>
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
    );

    return (
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden flex items-center justify-center">
            {broadcaster ? (
                <>
                    <RemoteUser user={broadcaster} cover="cover" className="w-full h-full" />
                    {!hostHasVideo && <CameraOffFallback />}
                </>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    {/* Waiting for host — show avatar if available */}
                    {hostAvatarUrl ? (
                        <>
                            <img src={hostAvatarUrl} alt={hostName || 'Host'} className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/50 animate-pulse" />
                            <span className="text-xs text-gray-400">{hostName ? `${hostName} is setting up...` : 'Waiting for host...'}</span>
                        </>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-purple-700 animate-spin" style={{ animationDuration: '3s' }} />
                            <span className="text-xs text-gray-500">Waiting for host...</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
