const { AccessToken2 } = require('../node_modules/agora-token/src/AccessToken2.js');

const tokenStr = "007eJxTYDBISZ+7V+a81Nyut1wanSt+BB+t9rP6OPPl3IBbzfPP9V9TYEg2M0k2s7BITks0TDaxSDGwTEpOTE22tExONkkzMkkxbGxVy2K8rp4V2abNxMjAyMDCwMgA4jOBSWYwyQImeRhKUotLdJMzEvPyUnO4GIxMDE2MLQ2NDEwAdqor1Q==";

try {
    const at = new AccessToken2();
    at.from_string(tokenStr);
    console.log("Decoded Token Info:");
    console.log("App ID:", at.appId);
    console.log("Issue Timestamp:", at.issueTs);
    console.log("Expire time:", at.expire);
    console.log("Salt:", at.salt);
    console.log("Services:", Object.keys(at.services));
    if (at.services['1']) {
        const rtcService = at.services['1'];
        console.log("RTC Channel Name:", rtcService.__channel_name?.toString());
        console.log("RTC User ID (Account):", rtcService.__uid?.toString());
        console.log("RTC Privileges:", rtcService.__privileges);
    }
} catch (e) {
    console.error("Failed to decode token:", e);
}
