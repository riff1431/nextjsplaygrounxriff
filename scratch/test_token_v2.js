const { RtcTokenBuilder, RtcRole } = require('agora-token');
const { AccessToken2 } = require('agora-token/src/AccessToken2');

const appId = '73a0225cd7ff4d64a13a9ec92ee81951';
const appCertificate = 'b6acb65a0ed248eb90445a79999e35d4';
const channelName = 'test-channel';
const stringUid = 'user123';
const rtcRole = RtcRole.PUBLISHER;
const duration = 3600 * 24; // 24 hours (relative)

try {
    const token = RtcTokenBuilder.buildTokenWithUserAccount(
        appId,
        appCertificate,
        channelName,
        stringUid,
        rtcRole,
        duration,
        duration
    );
    console.log("Generated Token:", token);

    const at = new AccessToken2();
    at.from_string(token);
    console.log("Decoded Token Expiration (should be 86400):", at.expire);
} catch (e) {
    console.error("Error:", e);
}
