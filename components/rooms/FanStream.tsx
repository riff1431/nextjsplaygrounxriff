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
    uid: string | number; // fan uid
    hostId: string | number; // host uid to watch
    hostAvatarUrl?: string | null;
    hostName?: string;
}

export default function FanStream({ appId, channelName, uid, hostId, hostAvatarUrl, hostName }: FanStreamProps) {
    const [token, setToken] = useState<string | null>(null);

    // Fetch Token for MYSELF (uid)
    useEffect(() => {
        async function fetchToken() {
            try {
                const res = await fetch('/api/v1/auth/agora-token', {
                    method: 'POST',
                    body: JSON.stringify({
                        channelName,
                        role: 'publisher', // Join as publisher (Host) to be visible to others
                        uid, // My ID
                    })
                });
                const data = await res.json();
                if (data.token) setToken(data.token);
            } catch (e) {
                console.error("Failed to fetch token", e);
            }
        }
        if (channelName && uid) fetchToken();
    }, [channelName, uid]);

    // Join Channel as Subscriber (using MY token/uid)
    const isReady = !!token;
    useJoin(
        { appid: appId, channel: channelName, token: token || null, uid: uid },
        isReady
    );

    // Set Client Role to HOST so we are visible to Creator
    const client = useRTCClient();
    useEffect(() => {
        if (client) {
            client.setClientRole("host").catch((e: any) => console.error("Failed to set client role", e));
        }
    }, [client]);

    // Get Active Remote Users
    const remoteUsers = useRemoteUsers();

    // We want to watch the specific HOST (hostId).
    console.log("FanStream: Waiting for hostId:", hostId, typeof hostId);
    console.log("FanStream: Active Remote Users:", remoteUsers.map(u => ({ uid: u.uid, hasAudio: u.hasAudio, hasVideo: u.hasVideo })));

    const broadcaster = remoteUsers.find(user => {
        const isMatch = String(user.uid) === String(hostId);
        console.log(`Checking user ${user.uid} vs host ${hostId}: ${isMatch}`);
        return isMatch;
    });

    // Check if host's video is disabled
    const hostHasVideo = broadcaster?.hasVideo ?? false;

    if (!isReady) return <div className="w-full h-full flex items-center justify-center bg-black text-gray-600 text-xs">Connecting...</div>;

    // Camera Off Avatar Fallback Component
    const CameraOffFallback = () => (
        <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden">
            {/* Blurred Background with Avatar */}
            <div className="absolute inset-0">
                {hostAvatarUrl ? (
                    <img
                        src={hostAvatarUrl}
                        alt=""
                        className="w-full h-full object-cover scale-110 blur-2xl opacity-60"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-900/80 via-purple-900/80 to-indigo-900/80" />
                )}
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-purple-500/10" />

            {/* Centered Avatar with Ring */}
            <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="relative">
                    {/* Animated Ring */}
                    <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 opacity-75 blur-md animate-pulse" />
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 opacity-50" />

                    {/* Avatar */}
                    {hostAvatarUrl ? (
                        <img
                            src={hostAvatarUrl}
                            alt={hostName || 'Creator'}
                            className="relative w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-2xl"
                        />
                    ) : (
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center border-4 border-white/20 shadow-2xl">
                            <span className="text-3xl font-bold text-white">
                                {hostName ? hostName.charAt(0).toUpperCase() : 'C'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Name & Status */}
                <div className="text-center">
                    {hostName && (
                        <div className="text-white font-bold text-lg drop-shadow-lg">{hostName}</div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-pink-200/90 mt-1">
                        <VideoOff className="w-4 h-4" />
                        <span>Camera Off</span>
                    </div>
                </div>
            </div>

            {/* Decorative particles/glow */}
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700" />
        </div>
    );

    return (
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden flex items-center justify-center">
            {broadcaster ? (
                <>
                    <RemoteUser user={broadcaster} cover="cover" className="w-full h-full" />
                    {/* Show avatar fallback when host camera is off */}
                    {!hostHasVideo && <CameraOffFallback />}
                </>
            ) : (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-700 animate-spin-slow" />
                    <span className="text-xs">Waiting for host...</span>
                </div>
            )}
        </div>
    );
}
