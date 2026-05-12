const { RtcTokenBuilder, RtcRole } = require('agora-token');

const appId = 'c64c688cfa1c48d09bcaec99cc4f24d1';
const appCertificate = '20acc2afec27457d98e47bce4617fcda';
const channelName = '0e3a38dc-f84d-463e-afac-b20e70fca8dd';
const numericUid = 12345;
const rtcRole = RtcRole.PUBLISHER;
const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600;

try {
  const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      numericUid,
      rtcRole,
      privilegeExpiredTs,
      privilegeExpiredTs
  );
  console.log("Token:", token);
} catch (e) {
  console.error("Error:", e);
}
