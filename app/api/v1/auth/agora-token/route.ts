import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

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

        // If no certificate, assume "App ID only" mode and return null token
        if (!appCertificate) {
            console.warn("Agora App Certificate not found. Returning null token for App ID only mode.");
            return NextResponse.json({ token: null });
        }

        // Set role: PUBLISHER (1) or SUBSCRIBER (2)
        const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

        // Token expiration time (default to 24 hours if not provided)
        const expirationTimeInSeconds = expireTime || 3600 * 24;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        // Build token
        // Use buildTokenWithUserAccount to support String UIDs (Supabase UUIDs)
        const token = RtcTokenBuilder.buildTokenWithUserAccount(
            appId,
            appCertificate,
            channelName,
            String(uid || 0), // Ensure it is a string
            rtcRole,
            privilegeExpiredTs,
            privilegeExpiredTs // agora-token v2 requires this twice
        );

        return NextResponse.json({ token });

    } catch (error: any) {
        console.error("Agora Token Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
