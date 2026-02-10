
const API_ID_OR_WORKFLOW = "cb1b9ad7-d99f-435e-ac37-f09b950b256a";
const API_KEY = "yNYBmujxI5Mku3HYS6ShzFCpRr4_6XYjwzuDdxzQg3Q";

const BASE_URLS = [
    "https://api.didit.me",
    "https://apx.didit.me",
    "https://verification.didit.me" // less likely for creation but possible
];

const PATHS = [
    "/v3/session/",
    "/v3/sessions/",
    "/auth/v3/session/",
    "/auth/v3/sessions/"
];

async function testAuth() {
    console.log("Testing Didit API Auth v4 (Brute Force)...");

    const payload = {
        workflow_id: API_ID_OR_WORKFLOW,
        vendor_data: "test_user_123",
        callback: "https://example.com/webhook"
    };

    for (const base of BASE_URLS) {
        for (const path of PATHS) {
            const url = `${base}${path}`;
            console.log(`\n--- URL: ${url} ---`);

            // 1. Bearer
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${API_KEY}`
                    },
                    body: JSON.stringify(payload)
                });
                console.log(`[Bearer] ${res.status}`);
                if (res.ok) { console.log("SUCCESS!", await res.json()); return; }
            } catch (e) { }

            // 2. x-api-key
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": API_KEY
                    },
                    body: JSON.stringify(payload)
                });
                console.log(`[x-api-key] ${res.status}`);
                if (res.ok) { console.log("SUCCESS!", await res.json()); return; }
            } catch (e) { }

            // 3. Basic Auth (Key as user)
            try {
                const auth = Buffer.from(`${API_KEY}:`).toString('base64');
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Basic ${auth}`
                    },
                    body: JSON.stringify(payload)
                });
                console.log(`[Basic Key:] ${res.status}`);
                if (res.ok) { console.log("SUCCESS!", await res.json()); return; }
            } catch (e) { }
        }
    }
}

testAuth();
