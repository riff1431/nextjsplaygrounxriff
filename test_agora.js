// We can't easily test WebRTC from node without a headless browser, 
// but we can check if the token API returns an error!
fetch('http://localhost:3000/api/v1/auth/agora-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
      channelName: 'test-channel',
      role: 'publisher',
      uid: 'user123',
      expireTime: 3600 * 24
  })
}).then(res => res.json()).then(data => {
  console.log("Token response:", data);
}).catch(err => {
  console.error("Token error:", err);
});
