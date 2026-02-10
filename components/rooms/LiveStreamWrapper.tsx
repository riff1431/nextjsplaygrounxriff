"use client";

import React, { useState, useEffect } from 'react';
import AgoraProvider, { createAgoraClient } from '@/components/providers/AgoraProvider';
import CreatorStream from './CreatorStream';
import FanStream from './FanStream';

interface LiveStreamWrapperProps {
    role: 'host' | 'fan';
    roomId: string; // This is the Channel Name
    uid: string | number; // The CURRENT USER's UID
    hostId: string | number; // The HOST's UID (who we want to watch)
    appId: string;
    hostAvatarUrl?: string | null; // Creator's avatar URL
    hostName?: string; // Creator's display name
}

export default function LiveStreamWrapper({ role, roomId, uid, hostId, appId, hostAvatarUrl, hostName }: LiveStreamWrapperProps) {
    const [client, setClient] = useState<any>(null);

    useEffect(() => {
        const c = createAgoraClient();
        setClient(c);
        return () => {
            // Cleanup if needed, though client usually persists or is cleaned by provider
        };
    }, []);

    if (!client) return <div className="w-full h-full flex items-center justify-center bg-black/50 text-xs text-gray-500">Initializing Studio...</div>;

    return (
        <AgoraProvider client={client}>
            {role === 'host' ? (
                // For host, uid === hostId usually, but we pass uid as the publisher ID
                <CreatorStream
                    appId={appId}
                    channelName={roomId}
                    uid={uid}
                    avatarUrl={hostAvatarUrl}
                    creatorName={hostName}
                />
            ) : (
                // For fan, uid is their ID, hostId is who they watch
                <FanStream
                    appId={appId}
                    channelName={roomId}
                    uid={uid}
                    hostId={hostId}
                    hostAvatarUrl={hostAvatarUrl}
                    hostName={hostName}
                />
            )}
        </AgoraProvider>
    );
}
