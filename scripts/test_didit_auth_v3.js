
const API_ID = "cb1b9ad7-d99f-435e-ac37-f09b950b256a"; // Suspected Workflow ID
const API_KEY = "yNYBmujxI5Mku3HYS6ShzFCpRr4_6XYjwzuDdxzQg3Q";

const URLS = [
    "https://apx.didit.me/auth/v3/sessions/", // Note trailing slash
    "https://apx.didit.me/auth/v3/session/",
    "https://api.didit.me/v3/sessions/"
];

async function testAuth() {
    console.log("Testing Didit API Auth v3...");

    // Hypothesis: API_ID is actually the workflow_id
    const payload = {
        workflow_id: API_ID,
        vendor_data: "test_user_123",
        callback: "https://example.com/webhook",
        vendor_internal_id: "test_user_123" // keeping this just in case
    };

    for (const url of URLS) {
        console.log(`\nTesting URL: ${url}`);

        try {
            console.log("  [Bearer API_KEY]");
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify(payload)
            });
            console.log("  Status:", res.status);
            if (res.ok) { console.log("  SUCCESS!", await res.json()); return; }
            else console.log("  Error:", await res.text());
        } catch (e) { console.log("  Error:", e.message); }
    }
}

testAuth();
