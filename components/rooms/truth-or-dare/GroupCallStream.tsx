"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import AgoraProvider, { createGroupCallClient } from '@/components/providers/AgoraProvider';
import {
    useLocalCameraTrack,
    useLocalMicrophoneTrack,
    usePublish,
    useJoin,
    useRemoteUsers,
    useRTCClient,
    RemoteUser,
} from 'agora-rtc-react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export interface GroupCallStreamProps {
    appId: string;
    channelName: string;
    uid: string | number;
    role: 'creator' | 'fan';
    onLeave: () => void;
    localDisplayName?: string;
    participantFanIds?: string[];
    creatorId?: string;
}

interface ProfileMap {
    [userId: string]: { name: string; avatarUrl: string | null };
}

// ─── Avatar / initials placeholder ────────────────────────────────────────────
function AvatarPlaceholder({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
    const initials = (name || '?').replace(/[^a-zA-Z ]/g, '').split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#12121e,#1a1a2e)' }}>
            {avatarUrl ? (
                <img src={avatarUrl} alt={name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)', marginBottom: 8 }} />
            ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(6,182,212,0.25),rgba(59,130,246,0.25))', border: '2px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>{initials}</span>
                </div>
            )}
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <VideoOff style={{ width: 11, height: 11 }} /> Camera off
            </span>
        </div>
    );
}

// ─── Single participant tile ───────────────────────────────────────────────────
function Tile({ name, avatarUrl, isLocal, isSpeaking, roleBadge, children }: {
    name: string; avatarUrl?: string | null; isLocal?: boolean; isSpeaking?: boolean; roleBadge?: 'creator' | 'fan'; children: React.ReactNode;
}) {
    return (
        <div style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#111118',
            minWidth: 0,
            minHeight: 0,
            boxShadow: isSpeaking
                ? '0 0 0 2px #22d3ee, 0 0 20px rgba(6,182,212,0.45)'
                : '0 0 0 1px rgba(255,255,255,0.07)',
            transition: 'box-shadow 0.2s',
        }}>
            {children}

            {/* Speaking ring */}
            {isSpeaking && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: 12, border: '2px solid rgba(34,211,238,0.7)', pointerEvents: 'none', zIndex: 6, animation: 'pulse 1.2s ease-in-out infinite' }} />
            )}

            {/* Name pill + role badge */}
            <div style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ background: 'rgba(0,0,0,0.68)', backdropFilter: 'blur(8px)', padding: '3px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.88)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                </div>
                {roleBadge === 'creator' && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.85), rgba(217,119,6,0.85))', backdropFilter: 'blur(8px)', padding: '2px 7px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 9 }}>👑</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Creator</span>
                    </div>
                )}
                {roleBadge === 'fan' && (
                    <div style={{ background: 'rgba(139,92,246,0.6)', backdropFilter: 'blur(8px)', padding: '2px 7px', borderRadius: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Fan</span>
                    </div>
                )}
            </div>

            {/* You badge */}
            {isLocal && (
                <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, background: 'rgba(6,182,212,0.75)', padding: '2px 7px', borderRadius: 6, fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    You
                </div>
            )}
        </div>
    );
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

// ─── Inner component (lives inside AgoraRTCProvider) ─────────────────────────
function GroupCallStreamInner({
    appId, channelName, uid, role, onLeave,
    localDisplayName = 'You', participantFanIds = [], creatorId,
}: GroupCallStreamProps) {
    const [token, setToken] = useState<string | null | undefined>(undefined);
    const [dynamicAppId, setDynamicAppId] = useState<string>("");
    const [numericUid, setNumericUid] = useState<number>(0);
    const [micEnabled, setMicEnabled] = useState(true);
    const [camEnabled, setCamEnabled] = useState(true);
    const [speakingUids, setSpeakingUids] = useState<Set<string | number>>(new Set());
    const [profiles, setProfiles] = useState<ProfileMap>({});

    // NOTE: No setClientRole needed — mode:"rtc" makes everyone a publisher by default

    // ── Speaking detection ─────────────────────────────────────────────────────
    const client = useRTCClient();
    useEffect(() => {
        if (!client) return;
        client.enableAudioVolumeIndicator();
        const handler = (vols: { uid: number | string; level: number }[]) =>
            setSpeakingUids(new Set(vols.filter(v => v.level > 5).map(v => v.uid)));
        client.on('volume-indicator', handler as any);
        return () => { client.off('volume-indicator', handler as any); };
    }, [client]);

    // ── Profile fetch for names + avatars ──────────────────────────────────────
    useEffect(() => {
        const ids = [...(creatorId ? [creatorId] : []), ...participantFanIds].filter(Boolean);
        if (!ids.length) return;
        createClient()
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .in('id', ids)
            .then(({ data }) => {
                if (!data) return;
                const map: ProfileMap = {};
                data.forEach(p => { map[p.id] = { name: p.full_name || p.username || 'User', avatarUrl: p.avatar_url || null }; });
                setProfiles(map);
            })
            .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [participantFanIds.join(','), creatorId]);

    // ── Local tracks ───────────────────────────────────────────────────────────
    const { localMicrophoneTrack } = useLocalMicrophoneTrack(true);
    const { localCameraTrack } = useLocalCameraTrack(true);

    // Play local camera in the ref div using a callback ref
    const vidRef = useCallback((node: HTMLDivElement | null) => {
        if (node && localCameraTrack) {
            localCameraTrack.play(node);
        }
    }, [localCameraTrack]);

    // Keep ref for cleanup on unmount
    const tracksRef = useRef({ localCameraTrack, localMicrophoneTrack });
    useEffect(() => { tracksRef.current = { localCameraTrack, localMicrophoneTrack }; }, [localCameraTrack, localMicrophoneTrack]);
    useEffect(() => () => {
        tracksRef.current.localCameraTrack?.stop();
        tracksRef.current.localCameraTrack?.close();
        tracksRef.current.localMicrophoneTrack?.stop();
        tracksRef.current.localMicrophoneTrack?.close();
    }, []);

    // ── Mic / Camera toggles ───────────────────────────────────────────────────
    const toggleMic = useCallback(async () => {
        if (!localMicrophoneTrack) return;
        await localMicrophoneTrack.setEnabled(!micEnabled);
        setMicEnabled(p => !p);
    }, [localMicrophoneTrack, micEnabled]);

    const toggleCam = useCallback(async () => {
        if (!localCameraTrack) return;
        await localCameraTrack.setEnabled(!camEnabled);
        setCamEnabled(p => !p);
    }, [localCameraTrack, camEnabled]);

    // ── Token fetch ────────────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;
        if (!channelName || !uid) return;
        fetch('/api/v1/auth/agora-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelName, role: 'publisher', uid: String(uid) }),
        })
            .then(r => r.json())
            .then(data => {
                if (!mounted) return;
                if (data.token !== undefined) setToken(data.token);
                if (data.appId) setDynamicAppId(data.appId);
                if (data.numericUid) setNumericUid(data.numericUid);
            })
            .catch(() => { if (mounted) { setToken(null); setNumericUid(0); } });
        return () => { mounted = false; };
    }, [channelName, uid]);

    const isReady = token !== undefined && numericUid > 0 && dynamicAppId !== "";

    // ── Join + Publish ─────────────────────────────────────────────────────────
    useJoin({ appid: dynamicAppId, channel: channelName, token: token ?? null, uid: numericUid }, isReady);
    const tracksToPublish = [localMicrophoneTrack, localCameraTrack].filter(Boolean);
    usePublish(tracksToPublish as any, isReady && tracksToPublish.length > 0);

    // ── Remote users
    const remoteUsers = useRemoteUsers();

    // Debug log (dev only)
    useEffect(() => {
        console.log(`[GroupCall] channel=${channelName} mode=rtc remoteUsers=${remoteUsers.length} uid=${numericUid} remoteUids=${remoteUsers.map(u => String(u.uid).slice(0, 8)).join(',')}`);
    }, [remoteUsers.length, channelName, numericUid]);

    // ── Grid calculation ───────────────────────────────────────────────────────
    const total = remoteUsers.length + 1;
    const cols = total === 1 ? 1 : total === 2 ? 2 : total <= 4 ? 2 : total <= 9 ? 3 : 4;
    const rows = Math.ceil(total / cols);

    // ── UID-based name resolver for remote tiles ──────────────────────────────
    // Match remote users (using numeric user.uid) against the profiles map (by computing toNumericUid(uuid))
    const getRemoteProfile = (remoteUid: string | number): { name: string; avatarUrl: string | null; roleBadge: 'creator' | 'fan' } => {
        const uidNum = Number(remoteUid);
        // Check if this is the creator
        if (creatorId && toNumericUid(creatorId) === uidNum) {
            const p = profiles[creatorId];
            return p
                ? { name: p.name, avatarUrl: p.avatarUrl, roleBadge: 'creator' }
                : { name: 'Creator', avatarUrl: null, roleBadge: 'creator' };
        }
        // Fan — look up by UUID to numeric UID matching
        const matchedFanId = participantFanIds.find(id => toNumericUid(id) === uidNum);
        if (matchedFanId && profiles[matchedFanId]) {
            return { name: profiles[matchedFanId].name, avatarUrl: profiles[matchedFanId].avatarUrl, roleBadge: 'fan' };
        }
        return { name: 'User', avatarUrl: null, roleBadge: 'fan' };
    };

    // ── Connecting state ───────────────────────────────────────────────────────
    if (!isReady) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', background: '#0a0a10', gap: 16, width: '100%', height: '100%' }}>
                <div style={{ width: 36, height: 36, border: '2px solid rgba(6,182,212,0.25)', borderTopColor: '#06b6d4', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Connecting…</span>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#0a0a10' }}>

            {/* ── Video Grid ────────────────────────────────────────────────── */}
            <div style={{
                flex: 1,
                minHeight: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                gap: 8,
                padding: 8,
            }}>

                {/* Local tile — manual vidRef.play() (same as working PrivateCallStream) */}
                <Tile name={localDisplayName} isLocal isSpeaking={speakingUids.has(numericUid)} roleBadge={role === 'creator' ? 'creator' : 'fan'}>
                    {/* vidRef div is always in DOM so track.play() target is stable */}
                    <div
                        ref={vidRef}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                    />
                    {/* Camera-off overlay sits on top */}
                    {!camEnabled && <AvatarPlaceholder name={localDisplayName} />}
                </Tile>

                {/* Remote tiles — one per Agora remote user, resolved by UID */}
                {remoteUsers.map((user) => {
                    const { name, avatarUrl, roleBadge } = getRemoteProfile(user.uid);
                    const camOff = !user.hasVideo;
                    return (
                        <Tile key={user.uid} name={name} avatarUrl={avatarUrl} isSpeaking={speakingUids.has(user.uid)} roleBadge={roleBadge}>
                            {camOff ? (
                                <AvatarPlaceholder name={name} avatarUrl={avatarUrl} />
                            ) : (
                                <RemoteUser
                                    user={user}
                                    cover="cover"
                                    playAudio
                                    playVideo
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                                />
                            )}
                        </Tile>
                    );
                })}
            </div>

            {/* ── Dev debug overlay ──────────────────────────────────────────── */}
            {process.env.NODE_ENV === 'development' && (
                <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: 8, fontSize: 10, color: 'rgba(34,211,238,0.9)', fontFamily: 'monospace', pointerEvents: 'none', border: '1px solid rgba(34,211,238,0.2)' }}>
                    mode:rtc · ch:{channelName.slice(-12)} · remote:{remoteUsers.length}
                </div>
            )}

            {/* ── Control bar ───────────────────────────────────────────────── */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 24px', background: 'rgba(0,0,0,0.55)', borderTop: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>

                {/* Connected count */}
                <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.8)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>{total} Connected</span>
                </div>

                {/* Mic toggle */}
                <button
                    onClick={toggleMic}
                    title={micEnabled ? 'Mute' : 'Unmute'}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'all 0.15s', background: micEnabled ? 'rgba(255,255,255,0.1)' : '#dc2626', boxShadow: micEnabled ? 'none' : '0 0 14px rgba(220,38,38,0.4)' }}
                >
                    {micEnabled ? <Mic style={{ width: 18, height: 18 }} /> : <MicOff style={{ width: 18, height: 18 }} />}
                </button>

                {/* Camera toggle */}
                <button
                    onClick={toggleCam}
                    title={camEnabled ? 'Stop Camera' : 'Start Camera'}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'all 0.15s', background: camEnabled ? 'rgba(255,255,255,0.1)' : '#dc2626', boxShadow: camEnabled ? 'none' : '0 0 14px rgba(220,38,38,0.4)' }}
                >
                    {camEnabled ? <Video style={{ width: 18, height: 18 }} /> : <VideoOff style={{ width: 18, height: 18 }} />}
                </button>

                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)' }} />

                {/* Leave / End */}
                <button
                    onClick={onLeave}
                    style={{ padding: '10px 22px', borderRadius: 99, border: 'none', cursor: 'pointer', background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s', boxShadow: '0 4px 18px rgba(220,38,38,0.35)' }}
                >
                    <PhoneOff style={{ width: 16, height: 16 }} />
                    {role === 'creator' ? 'End Session' : 'Leave'}
                </button>
            </div>
        </div>
    );
}

// ─── Error Boundary ────────────────────────────────────────────────────────────
class Boundary extends React.Component<{ children: React.ReactNode }, { err: string | null }> {
    constructor(p: any) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(e: Error) { return { err: e.message }; }
    render() {
        if (this.state.err) return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: 32, textAlign: 'center', background: '#0a0a10' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Camera / Mic Blocked</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', maxWidth: 280, lineHeight: 1.7 }}>{this.state.err}</p>
                <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '8px 20px', background: '#0891b2', border: 'none', borderRadius: 12, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
            </div>
        );
        return this.props.children;
    }
}

// ─── Public Export ─────────────────────────────────────────────────────────────
export default function GroupCallStream(props: GroupCallStreamProps) {
    const [client, setClient] = useState<any>(null);

    useEffect(() => {
        // Use RTC mode (not live) — all participants are publishers, no role config needed
        const c = createGroupCallClient();
        setClient(c);
        return () => { c.leave().catch(() => {}); };
    }, []);

    if (!client) return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a10', color: 'rgba(255,255,255,0.28)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Initializing…
        </div>
    );

    return (
        <AgoraProvider client={client}>
            <Boundary>
                <GroupCallStreamInner {...props} />
            </Boundary>
        </AgoraProvider>
    );
}
