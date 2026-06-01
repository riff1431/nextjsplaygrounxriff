const { AccessToken2 } = require('../node_modules/agora-token/src/AccessToken2.js');

const tokenStr = "007eJxTYGjfEH5bosJo99bYyPywstPablEJR+yE5f9EHXnrbX/i4C4FBnPjRAMjI9PkFPO0NJMUM5NEQ+NEy9RkS6PUVAtDS1PDfn/ZLP6Fcll2jseZGRkYGVgYGBlAfCYwyQwmWaBkSWpxCTtDaXFqkaGRMQCHsCWF";

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
