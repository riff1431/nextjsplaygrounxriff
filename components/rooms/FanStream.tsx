"use client";

import React, { useEffect, useState } from 'react';
import {
    RemoteUser,
    useJoin,
    useRemoteUsers,
    useRTCClient,
} from 'agora-rtc-react';

interface FanStreamProps {
    appId: string;
    channelName: string;
    uid: string | number; // fan uid
    hostId: string | number; // host uid to watch
}

export default function FanStream({ appId, channelName, uid, hostId }: FanStreamProps) {
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

    if (!isReady) return <div className="w-full h-full flex items-center justify-center bg-black text-gray-600 text-xs">Connecting...</div>;

    return (
        <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden flex items-center justify-center">
            {broadcaster ? (
                <RemoteUser user={broadcaster} cover="cover" className="w-full h-full" />
            ) : (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-700 animate-spin-slow" />
                    <span className="text-xs">Waiting for host...</span>
                </div>
            )}
        </div>
    );
}
