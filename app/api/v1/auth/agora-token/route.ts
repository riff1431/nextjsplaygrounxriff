import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

// Removed legacy toNumericUid hashing to natively support string UUIDs

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

        // Use the string UID directly (User Account)
        const stringUid = uid ? String(uid) : "0";

        // If no certificate, use "App ID only" mode — return null token + stringUid
        if (!appCertificate) {
            console.warn("Agora App Certificate not found. Using App ID only mode.");
            return NextResponse.json({ token: null, stringUid });
        }

        // Set role: PUBLISHER (broadcaster) or SUBSCRIBER (audience)
        const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

        const expirationTimeInSeconds = expireTime || 3600 * 24;

        // Build token using String UID (User Account) - natively supported by Web SDK
        const token = RtcTokenBuilder.buildTokenWithUserAccount(
            appId,
            appCertificate,
            channelName,
            stringUid,
            rtcRole,
            expirationTimeInSeconds,
            expirationTimeInSeconds
        );

        return NextResponse.json({ token, stringUid });

    } catch (error: any) {
        console.error("Agora Token Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
