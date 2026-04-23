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
                    <div className="flex items-center justify-center gap-3 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-xl">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 bg-gold rounded-full animate-bounce" />
                        </div>
                        <span className="text-xs font-medium text-gold/90 uppercase tracking-widest">{label}</span>
                    </div>
                </div>
            </div>

            {/* Decorative Orbs */}
            <div className="absolute -top-10 -left-10 w-64 h-64 bg-gold/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        </div>
    );

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
