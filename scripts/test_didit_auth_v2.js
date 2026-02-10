
const API_ID = "cb1b9ad7-d99f-435e-ac37-f09b950b256a";
const API_KEY = "yNYBmujxI5Mku3HYS6ShzFCpRr4_6XYjwzuDdxzQg3Q";

// Potential endpoints
const URLS = [
    "https://apx.didit.me/auth/v3/sessions",
    "https://api.didit.me/v1/sessions",
    "https://verification.didit.me/v1/sessions"
];

async function testAuth() {
    console.log("Testing Didit API Auth Variations...");

    const payload = {
        vendor_internal_id: "test_user_123",
        callback_url: "https://example.com/webhook",
        features: ["id_document", "selfie"] // Adding features just in case
    };

    for (const url of URLS) {
        console.log(`\nTesting URL: ${url}`);

        // Variation 1: Basic Auth (API_KEY:)
        try {
            const auth = Buffer.from(`${API_KEY}:`).toString('base64');
            console.log("  [Basic API_KEY:]");
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
                body: JSON.stringify(payload)
            });
            console.log("  Status:", res.status);
            if (res.ok) { console.log("  SUCCESS!", await res.json()); return; }
        } catch (e) { console.log("  Error:", e.message); }

        // Variation 2: Basic Auth (API_ID:API_KEY)
        try {
            const auth = Buffer.from(`${API_ID}:${API_KEY}`).toString('base64');
            console.log("  [Basic API_ID:API_KEY]");
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
                body: JSON.stringify(payload)
            });
            console.log("  Status:", res.status);
            if (res.ok) { console.log("  SUCCESS!", await res.json()); return; }
        } catch (e) { console.log("  Error:", e.message); }

        // Variation 3: Bearer API_KEY
        try {
            console.log("  [Bearer API_KEY]");
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
                body: JSON.stringify(payload)
            });
            console.log("  Status:", res.status);
            if (res.ok) { console.log("  SUCCESS!", await res.json()); return; }
        } catch (e) { console.log("  Error:", e.message); }
    }
}

testAuth();
