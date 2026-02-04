
const KEYS = [
    "eG-rjmIaALHe-AHVYPSAF1El14nh2MKubK_4Yh5bZro",
    "V6uft53PvQ02qIoupazgFzUJNzerSim-8McEL530HMs"
];
const WORKFLOW_ID = "94398e9e-4550-4d64-9947-f58173fa8c3d";

const URLS = [
    "https://verification.didit.me/v3/session/",
    "https://verification.sandbox.didit.me/v3/session/",
    "https://api.sandbox.didit.me/v3/session/",
    "https://sandbox-verification.didit.me/v3/session/"
];

async function verify() {
    console.log(`Testing Sandbox & Auth Variations...`);

    for (const key of KEYS) {
        const keyShort = key.substring(0, 5);
        console.log(`\n=== Key: ${keyShort}... ===`);

        for (const url of URLS) {
            const payload = {
                workflow_id: WORKFLOW_ID,
                vendor_data: "test_sandbox",
                callback: "https://example.com/webhook"
            };

            // 1. Bearer
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${key}`
                    },
                    body: JSON.stringify(payload)
                });
                if (res.status !== 404 && res.status !== 500) { // filter noise
                    console.log(`[Bearer] [${url}] -> ${res.status}`);
                    if (res.ok) console.log("SUCCESS!", await res.json());
                }
            } catch (e) { }

            // 2. Basic Auth (Key as user)
            try {
                const auth = Buffer.from(`${key}:`).toString('base64');
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Basic ${auth}`
                    },
                    body: JSON.stringify(payload)
                });
                if (res.status !== 404 && res.status !== 500) {
                    console.log(`[Basic] [${url}] -> ${res.status}`);
                    if (res.ok) console.log("SUCCESS!", await res.json());
                }
            } catch (e) { }
        }
    }
}

verify();
