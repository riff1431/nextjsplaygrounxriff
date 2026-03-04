import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

/**
 * Convert a UUID / arbitrary string to a deterministic uint32 numeric UID.
 * Agora RTC requires numeric UIDs. Uses a simple djb2 hash.
 */
function toNumericUid(input: string | number): number {
    if (typeof input === 'number') return Math.abs(input) % 0x7FFFFFFF || 1;
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
        hash = hash >>> 0; // keep as uint32
    }
    return hash || 1; // never 0 (reserved by Agora)
}

export async function POST(request: NextRequest) {
    try {
        const { channelName, role, uid, expireTime } = await request.json();

        if (!channelName) {
            return NextResponse.json({ error: 'channelName is required' }, { status: 400 });
        }

        const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;

        if (!appId) {
            return NextResponse.json({ error: 'Agora App ID not configured' }, { status: 500 });
        }

        // Convert UUID / string → numeric UID (required by Agora RTC)
        const numericUid = toNumericUid(uid ?? 0);

        // If no certificate, use "App ID only" mode — return null token + numericUid
        if (!appCertificate) {
            console.warn("Agora App Certificate not found. Using App ID only mode.");
            return NextResponse.json({ token: null, numericUid });
        }

        // Set role: PUBLISHER (broadcaster) or SUBSCRIBER (audience)
        const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

        const expirationTimeInSeconds = expireTime || 3600 * 24;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        // Build token with numeric UID — reliable, no User Management service needed
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            numericUid,
            rtcRole,
            privilegeExpiredTs,
            privilegeExpiredTs
        );

        return NextResponse.json({ token, numericUid });

    } catch (error: any) {
        console.error("Agora Token Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
